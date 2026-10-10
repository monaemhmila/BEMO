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
  templateId: z.string().min(1, "Template is required"),
  artStyle: z.string().optional(),
  childName: z.string().optional(),
  childAge: z.number().min(0).max(20).optional(),
  gender: z.enum(["boy", "girl"]).optional(),
  dedication: z.string().optional(),
  childImage: z.string().optional(),
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
 * Generate a new story with face-consistent illustrations using live Fal AI image edit
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

    const { templateId, artStyle, childName, childAge, gender, dedication, childImage, includeAudio, voiceId, language } = validation.data;
    const userId = req.userId!;

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

    // The template row is the source of truth for the story arc
    const templateRow = await prismaClient.storyTemplate.findFirst({
      where: {
        id: templateId,
        isActive: true,
        OR: [{ source: "PREDEFINED" }, { source: "CUSTOM", ownerUserId: userId }],
      },
    });

    if (!templateRow) {
      res.status(404).json({ message: "Story template not found" });
      return;
    }

    const heroName = childName || "Hero";

    const template = {
      id: templateRow.id,
      name: templateRow.name,
      description: templateRow.description,
      ageRange: templateRow.ageRange,
      category: templateRow.category,
      difficulty: templateRow.difficulty,
      prompts: templateRow.prompts as unknown as {
        theme: string;
        moralLesson: string;
        educationalFocus: string;
        worldContext: string;
        beats: string[];
      },
    };

    // Generate story script
    const script = childName && childAge
      ? await storyService.generatePersonalizedStoryScript(heroName, {
        childName,
        childAge,
        template,
        dedication,
        language,
        gender,
      })
      : await storyService.generateStoryScript(heroName, template.prompts.theme, language);

    // Create story and pages in database
    const { story, pages } = await storyService.createStory(
      userId,
      script,
      artStyle || "",
      { childName, childAge, template, dedication, includeAudio, voiceId, gender, childImage }
    );

    // Trigger image generation for each page using Fal image edit API with childImage reference
    const generationPromises = pages.map((page) =>
      storyService.triggerPageGeneration(
        page.id,
        page.imagePrompt,
        childImage,
        { childName, artStyle }
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
 * GET /story/events/:id
 * Server-sent status stream. The client keeps one authenticated connection
 * instead of creating a request every few seconds while images are generated.
 */
router.get("/events/:id", authMiddleware, async (req, res) => {
  res.status(200).set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  let closed = false;
  const send = async () => {
    if (closed) return;
    const story = await storyService.getStoryWithStatus(req.params.id, req.userId!);
    if (!story) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: "Story not found" })}\n\n`);
      res.end();
      closed = true;
      return;
    }
    res.write(`event: story\ndata: ${JSON.stringify({ story })}\n\n`);
    if (story.status === "Completed" || story.status === "Failed") {
      res.write("event: complete\ndata: {}\n\n");
      res.end();
      closed = true;
    }
  };

  const heartbeat = setInterval(() => { res.write(": heartbeat\n\n"); }, 15_000);
  const updates = setInterval(() => { void send().catch((error) => logger.error({ error }, "Story SSE update failed")); }, 2_000);
  req.on("close", () => {
    closed = true;
    clearInterval(heartbeat);
    clearInterval(updates);
  });
  await send();
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
