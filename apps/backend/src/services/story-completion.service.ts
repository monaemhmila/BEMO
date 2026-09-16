import { prismaClient } from "../lib/prisma";
import { CacheService } from "./cache.service";
import { AudioService } from "./audio.service";
import { logger } from "../lib/logger";

interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
};

export class StoryCompletionService {
  private static instance: StoryCompletionService;
  private cache = CacheService.getInstance();
  private audioService = AudioService.getInstance();
  private audioGenerationInProgress = new Set<string>(); // Track stories currently generating audio

  static getInstance() {
    if (!StoryCompletionService.instance) {
      StoryCompletionService.instance = new StoryCompletionService();
    }
    return StoryCompletionService.instance;
  }

  /**
   * Check if a story is complete and update status accordingly
   */
  async checkStoryCompletion(storyId: string): Promise<boolean> {
    try {
      const story = await prismaClient.story.findUnique({
        where: { id: storyId },
        include: { pages: true },
      });

      if (!story) {
        logger.warn({ storyId }, "Story not found while checking completion");
        return false;
      }

      const allPagesReady = story.pages.every(
        (page) => page.status === "Generated" && Boolean(page.imageUrl)
      );

      const anyPageFailed = story.pages.some((page) => page.status === "Failed");

      if (!allPagesReady) {
        // If some pages failed but not all, we might still mark as partially complete
        if (anyPageFailed) {
          const failedCount = story.pages.filter((p) => p.status === "Failed").length;
          const generatedCount = story.pages.filter((p) => p.status === "Generated").length;

          logger.info(
            { storyId, failedCount, generatedCount, total: story.pages.length },
            "Story has failed pages"
          );

          // If all pages failed, mark story as failed
          if (failedCount === story.pages.length) {
            await prismaClient.story.update({
              where: { id: storyId },
              data: { status: "Failed" },
            });
            return false;
          }
        }
        return false;
      }

      await prismaClient.story.update({
        where: { id: storyId },
        data: {
          status: "Completed",
          completedAt: new Date(),
        },
      });

      logger.info({ storyId }, "Story marked as completed");

      // Auto-generate audio if requested (only if not already in progress)
      if (story.includeAudio && !this.audioGenerationInProgress.has(storyId)) {
        this.audioGenerationInProgress.add(storyId);
        const voiceId = story.voiceId || "sarah";
        logger.info(
          { storyId, voiceId, pages: story.pages.length },
          "Auto-generating audio narration for completed story"
        );

        this.audioService
          .generateStoryAudio(storyId, voiceId)
          .then(() => {
            logger.info({ storyId }, "Audio generation completed successfully");
          })
          .catch((error) => {
            logger.error({ error, storyId }, "Failed to auto-generate audio for story");
          })
          .finally(() => {
            this.audioGenerationInProgress.delete(storyId);
          });
      } else if (story.includeAudio && this.audioGenerationInProgress.has(storyId)) {
        logger.info({ storyId }, "Audio generation already in progress, skipping");
      }

      // Generate analytics asynchronously
      this.generateStoryAnalytics(storyId).catch((error) => {
        logger.error({ error, storyId }, "Failed to generate story analytics");
      });

      // Invalidate related caches
      await this.cache.invalidate(`story:${story.userId}:*`);
      await this.cache.invalidate(`dashboard:${story.userId}`);

      return true;
    } catch (error) {
      logger.error({ error, storyId }, "Error checking story completion");
      return false;
    }
  }

  /**
   * Get detailed story status
   */
  async getStoryStatus(storyId: string) {
    const cacheKey = `story:status:${storyId}`;
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    const story = await prismaClient.story.findUnique({
      where: { id: storyId },
      include: {
        pages: {
          orderBy: { pageNumber: "asc" },
        },
      },
    });

    if (!story) {
      return null;
    }

    const generatedPages = story.pages.filter(
      (page) => page.status === "Generated"
    ).length;

    const failedPages = story.pages.filter(
      (page) => page.status === "Failed"
    ).length;

    const pendingPages = story.pages.filter(
      (page) => page.status === "Pending"
    ).length;

    const progress = story.pages.length
      ? Math.round((generatedPages / story.pages.length) * 100)
      : 0;

    const status = {
      storyId: story.id,
      title: story.title,
      status: story.status,
      progress,
      totalPages: story.pages.length,
      generatedPages,
      failedPages,
      pendingPages,
      completedAt: story.completedAt,
      pages: story.pages.map((p) => ({
        id: p.id,
        pageNumber: p.pageNumber,
        status: p.status,
        hasImage: !!p.imageUrl,
      })),
    };

    // Only cache if story is complete
    if (story.status === "Completed") {
      await this.cache.set(cacheKey, status, 300);
    }

    return status;
  }

  /**
   * Get user's completion statistics
   */
  async getUserCompletionStats(userId: string) {
    const cacheKey = `dashboard:${userId}:stats`;
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    const [totalStories, completedStories, failedStories] = await Promise.all([
      prismaClient.story.count({ where: { userId } }),
      prismaClient.story.count({ where: { userId, status: "Completed" } }),
      prismaClient.story.count({ where: { userId, status: "Failed" } }),
    ]);

    const stats = {
      totalStories,
      completedStories,
      failedStories,
      pendingStories: totalStories - completedStories - failedStories,
      completionRate:
        totalStories === 0
          ? 0
          : Math.round((completedStories / totalStories) * 100),
    };

    await this.cache.set(cacheKey, stats, 60);
    return stats;
  }

  /**
   * Retry failed pages for a story
   */
  async retryFailedPages(
    storyId: string,
    userId: string,
    config: RetryConfig = DEFAULT_RETRY_CONFIG
  ): Promise<{ retriedCount: number; pageIds: string[] }> {
    const story = await prismaClient.story.findFirst({
      where: { id: storyId, userId },
      include: {
        pages: { where: { status: "Failed" } },
        model: true,
      },
    });

    if (!story) {
      throw new Error("Story not found");
    }

    if (!story.model.tensorPath) {
      throw new Error("Model not trained");
    }

    const pageIds: string[] = [];

    for (const page of story.pages) {
      // Reset page status to pending
      await prismaClient.storyPage.update({
        where: { id: page.id },
        data: { status: "Pending", falAiRequestId: null },
      });

      pageIds.push(page.id);
    }

    // Update story status back to generating
    if (story.status === "Failed") {
      await prismaClient.story.update({
        where: { id: storyId },
        data: { status: "Generating" },
      });
    }

    logger.info(
      { storyId, retriedCount: pageIds.length },
      "Queued failed pages for retry"
    );

    return { retriedCount: pageIds.length, pageIds };
  }

  /**
   * Generate analytics for a completed story
   */
  private async generateStoryAnalytics(storyId: string) {
    try {
      const pages = await prismaClient.storyPage.findMany({
        where: { storyId },
      });

      // Calculate reading metrics
      const totalWords = pages.reduce(
        (count, page) => count + page.content.split(/\s+/).length,
        0
      );

      // Estimate read time (average child reads ~100-150 words per minute)
      const estimatedReadTimeSec = Math.ceil((totalWords / 100) * 60);

      await prismaClient.storyAnalytics.upsert({
        where: { storyId },
        update: {
          avgReadTime: estimatedReadTimeSec,
          updatedAt: new Date(),
        },
        create: {
          storyId,
          avgReadTime: estimatedReadTimeSec,
        },
      });

      // Update story with reading time
      await prismaClient.story.update({
        where: { id: storyId },
        data: { readingTime: Math.ceil(estimatedReadTimeSec / 60) },
      });

      logger.info(
        { storyId, totalWords, estimatedReadTimeSec },
        "Story analytics generated"
      );
    } catch (error) {
      logger.error({ error, storyId }, "Failed to generate story analytics");
    }
  }

  /**
   * Clean up stale generating stories (older than 30 minutes)
   */
  async cleanupStaleStories() {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const staleStories = await prismaClient.story.findMany({
      where: {
        status: "Generating",
        updatedAt: { lt: thirtyMinutesAgo },
      },
    });

    for (const story of staleStories) {
      await prismaClient.story.update({
        where: { id: story.id },
        data: { status: "Failed" },
      });

      logger.warn({ storyId: story.id }, "Marked stale story as failed");
    }

    return staleStories.length;
  }
}

export const storyCompletionService = StoryCompletionService.getInstance();
