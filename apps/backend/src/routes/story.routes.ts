import { Router } from "express";
import { prismaClient } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { StoryService } from "../services/story.service";
import { AudioService } from "../services/audio.service";
import { trialService } from "../services/trial.service";
import { storyGenerationLimiter } from "../middleware/rateLimiter";
import { logger } from "../lib/logger";
import { z } from "zod";

const router = Router();
const storyService = StoryService.getInstance();
const audioService = AudioService.getInstance();

// Validation schemas
const GenerateStorySchema = z.object({
  modelId: z.string().min(1),
  theme: z.string().min(1),
  artStyle: z.string().optional(),
  childName: z.string().optional(),
  childAge: z.number().min(3).max(12).optional(),
  storyLength: z.enum(["short", "medium", "long"]).optional(),
  category: z.string().optional(),
  dedication: z.string().optional(),
  includeAudio: z.boolean().optional(),
  voiceId: z.string().optional(),
  language: z.string().optional(),
});

const GeneratePageImageSchema = z.object({
  storyId: z.string().min(1),
  pageNumber: z.number().min(1),
  prompt: z.string().min(1),
});

/**
 * POST /story/generate
 * Generate a new story with face-consistent illustrations
 */
router.post("/generate", authMiddleware, storyGenerationLimiter, async (req, res) => {
  try {
    const validation = GenerateStorySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        message: "Invalid input",
        errors: validation.error.flatten()
      });
      return;
    }

    const { modelId, theme, artStyle, childName, childAge, storyLength, category, dedication, includeAudio, voiceId, language } = validation.data;
    const userId = req.userId!;

    // Verify model exists and is trained
    const model = await prismaClient.model.findUnique({
      where: { id: modelId },
    });

    if (!model?.tensorPath) {
      res.status(404).json({ message: "Model not found or not trained" });
      return;
    }

    // Check the account still has a free story generation left
    const trialsLeft = await trialService.getRemaining(userId);
    if (trialsLeft <= 0) {
      res.status(402).json({
        message:
          "You have used all of your free story generations. Order a printed book to unlock another one!",
        code: "NO_TRIAL_GENERATIONS_LEFT",
        trials: 0,
      });
      return;
    }

    // Generate story script
    const script = childName && childAge
      ? await storyService.generatePersonalizedStoryScript(model.name, {
        childName,
        childAge,
        theme,
        storyLength: storyLength || "short",
        category: category || "adventure",
        dedication,
        language,
      })
      : await storyService.generateStoryScript(model.name, theme, language);

    // Create story and pages in database
    const { story, pages } = await storyService.createStory(
      userId,
      modelId,
      script,
      artStyle || "",
      { childName, childAge, storyLength, category, dedication, includeAudio, voiceId }
    );

    // Trigger image generation for each page
    const generationPromises = pages.map((page) =>
      storyService.triggerPageGeneration(
        page.id,
        page.imagePrompt,
        model.thumbnail,
        { childName }
      ).catch((error) => {
        logger.error({ error, pageId: page.id }, "Failed to start page generation");
        return null;
      })
    );

    await Promise.all(generationPromises);

    // Consume one free story generation
    await trialService.consumeGeneration(userId, story.id, "story_generation");

    res.json({
      message: "Story generation started",
      storyId: story.id,
      title: story.title,
      totalPages: pages.length,
      estimatedTime: `${pages.length * 30} seconds`,
      trialsRemaining: await trialService.getRemaining(userId),
    });
  } catch (error) {
    logger.error({ error }, "Story generation failed");
    res.status(500).json({
      message: "Failed to generate story",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /story/mine
 * Get all stories for the current user
 */
router.get("/mine", authMiddleware, async (req, res) => {
  try {
    const stories = await prismaClient.story.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: "desc" },
      include: {
        // The library only needs a cover image + page statuses, so skip the
        // (large) page text and image prompts to keep this payload small.
        pages: {
          orderBy: { pageNumber: "asc" },
          select: {
            id: true,
            pageNumber: true,
            status: true,
            imageUrl: true,
            audioUrl: true,
          },
        },
        model: { select: { id: true, name: true, thumbnail: true } },
      },
    });

    // Add progress info to each story
    const storiesWithProgress = stories.map((story) => {
      const generatedPages = story.pages.filter((p) => p.status === "Generated").length;
      const progress = story.pages.length
        ? Math.round((generatedPages / story.pages.length) * 100)
        : 0;

      return {
        ...story,
        progress,
        generatedPages,
        totalPages: story.pages.length,
      };
    });

    res.json({ stories: storiesWithProgress });
  } catch (error) {
    logger.error({ error }, "Failed to fetch stories");
    res.status(500).json({ message: "Failed to fetch stories" });
  }
});

/**
 * GET /story/:id
 * Get a single story with all pages
 */
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const story = await storyService.getStoryWithStatus(req.params.id, req.userId!);

    if (!story) {
      res.status(404).json({ message: "Story not found" });
      return;
    }

    res.json({ story });
  } catch (error) {
    logger.error({ error }, "Failed to fetch story");
    res.status(500).json({ message: "Failed to fetch story" });
  }
});

/**
 * POST /story/:id/retry-page
 * Retry failed page generation
 */
router.post("/:id/retry-page", authMiddleware, async (req, res) => {
  try {
    const { pageId } = req.body;

    if (!pageId) {
      res.status(400).json({ message: "Missing pageId" });
      return;
    }

    // Verify ownership
    const page = await prismaClient.storyPage.findFirst({
      where: {
        id: pageId,
        story: { userId: req.userId! }
      },
    });

    if (!page) {
      res.status(404).json({ message: "Page not found" });
      return;
    }

    await storyService.retryPageGeneration(pageId);

    res.json({ message: "Page regeneration started", pageId });
  } catch (error) {
    logger.error({ error }, "Failed to retry page generation");
    res.status(500).json({ message: "Failed to retry page generation" });
  }
});

/**
 * POST /story/:id/generate-audio
 * Generate audio narration for all pages
 */
router.post("/:id/generate-audio", authMiddleware, async (req, res) => {
  try {
    const { voiceStyle } = req.body;

    // Verify ownership
    const story = await prismaClient.story.findFirst({
      where: { id: req.params.id, userId: req.userId! },
      include: { pages: true },
    });

    if (!story) {
      res.status(404).json({ message: "Story not found" });
      return;
    }

    // Check if story is complete
    const incompletePage = story.pages.find((p) => p.status !== "Generated");
    if (incompletePage) {
      res.status(400).json({
        message: "Story images must be complete before generating audio"
      });
      return;
    }

    const result = await audioService.generateStoryAudio(story.id, voiceStyle);

    res.json({
      message: "Audio generation complete",
      ...result,
    });
  } catch (error) {
    logger.error({ error }, "Failed to generate story audio");
    res.status(500).json({ message: "Failed to generate audio" });
  }
});

/**
 * GET /story/page/:pageId
 * Get single page details
 */
router.get("/page/:pageId", authMiddleware, async (req, res) => {
  try {
    const page = await prismaClient.storyPage.findFirst({
      where: {
        id: req.params.pageId,
        story: { userId: req.userId! },
      },
      include: {
        story: { select: { id: true, title: true } },
      },
    });

    if (!page) {
      res.status(404).json({ message: "Page not found" });
      return;
    }

    res.json({ page });
  } catch (error) {
    logger.error({ error }, "Failed to fetch page");
    res.status(500).json({ message: "Failed to fetch page" });
  }
});

/**
 * DELETE /story/:id
 * Delete a story and all its pages
 */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const story = await prismaClient.story.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });

    if (!story) {
      res.status(404).json({ message: "Story not found" });
      return;
    }

    // Delete pages first (due to foreign key constraint)
    await prismaClient.storyPage.deleteMany({
      where: { storyId: story.id },
    });

    // Delete story analytics if exists
    await prismaClient.storyAnalytics.deleteMany({
      where: { storyId: story.id },
    });

    // Delete story
    await prismaClient.story.delete({
      where: { id: story.id },
    });

    res.json({ message: "Story deleted" });
  } catch (error) {
    logger.error({ error }, "Failed to delete story");
    res.status(500).json({ message: "Failed to delete story" });
  }
});

export const storyRouter = router;
