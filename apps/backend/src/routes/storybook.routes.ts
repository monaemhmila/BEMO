import fs, { existsSync } from "fs";
import path from "path";
import { Router } from "express";
import { prismaClient } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { StoryService } from "../services/story.service";
import { AudioService } from "../services/audio.service";
import { trialService } from "../services/trial.service";
import { ImageGenerationService } from "../services/image-generation.service";
import { PDFService } from "../services/pdf.service";
import { storyGenerationLimiter } from "../middleware/rateLimiter";
import {
  faceCanvasService,
} from "../services/face-canvas.service";
import { getPageAspectRatio, isSquareBookPage, getPageComposition, STORYBOOK_PAGE_COUNT } from "../contracts/storybook";
import { logger } from "../lib/logger";
import { z } from "zod";

const router = Router();
const storyService = StoryService.getInstance();
const audioService = AudioService.getInstance();
const imageService = ImageGenerationService.getInstance();

// Validation schemas
const GenerateStorybookSchema = z.object({
  modelId: z.string().min(1),
  childName: z.string().min(1),
  childAge: z.number().min(3).max(12),
  templateId: z.string().min(1, "Template is required"),
  dedication: z.string().optional(),
  artStyle: z.string().optional(),
  includeAudio: z.boolean().optional().default(false),
  voiceId: z.string().optional().default("sarah"),
});

// Simple PDF generation schema (no model training)
const SimplePDFSchema = z.object({
  childName: z.string().trim().min(1, "Child name is required"),
  childAge: z.coerce.number().min(1).max(100).default(5),
  hairColor: z.string().trim().max(40).optional().nullable().or(z.literal("")),
  eyeColor: z.string().trim().max(40).optional().nullable().or(z.literal("")),
  skinTone: z.string().trim().max(40).optional().nullable().or(z.literal("")),
  hairDescription: z.string().trim().max(120).optional().nullable().or(z.literal("")),
  templateId: z.string().trim().min(1, "Template is required"),
  dedication: z.string().optional().nullable().or(z.literal("")),
  childImage: z.string().optional().nullable().or(z.literal("")),
  language: z.enum(["english", "french", "arabic"]).optional().default("english"),
  artStyle: z.string().optional().nullable().or(z.literal("")),
});

const CustomTemplateSchema = z.object({
  idea: z.string().trim().min(3, "Tell us a little about your story").max(500),
  setting: z.string().trim().max(200).optional(),
  extras: z.string().trim().max(200).optional(),
  message: z.string().trim().max(200).optional(),
  ageRange: z.enum(["3-5", "6-8", "9-12"]),
});

/** Explicit profanity / hateful-content screen for parent-supplied text. */
const UNSAFE_TERMS = [
  "fuck",
  "shit",
  "bitch",
  "cunt",
  "asshole",
  "bastard",
  "slut",
  "whore",
  "rape",
  "molest",
  "gore",
  "suicide",
  "hate you",
  "kill yourself",
];

function moderateText(text: string): { safe: boolean; reason?: string } {
  const normalized = ` ${text.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ")} `;

  const term = UNSAFE_TERMS.find((unsafe) => normalized.includes(` ${unsafe} `));
  if (term) {
    return {
      safe: false,
      reason:
        "That story idea contains language or themes we can't use in a children's book. Please rephrase it.",
    };
  }

  return { safe: true };
}

/**
 * GET /storybook/trials
 * Remaining free story generations for the signed-in user
 */
router.get("/trials", authMiddleware, async (req, res) => {
  const trials = await trialService.getRemaining(req.userId!);

  res.json({
    trials,
    generationsLeft: trials,
    voices: audioService.getVoices(),
  });
});

/**
 * GET /storybook/templates
 * Get available story templates. The database is the source of truth: every
 * row carries the 14-beat prompt document the generator writes from.
 */
router.get("/templates", async (_req, res) => {
  const rows = await prismaClient.storyTemplate.findMany({
    where: { isActive: true, source: "PREDEFINED" },
    orderBy: [{ difficulty: "asc" }, { name: "asc" }],
  });

  res.json({
    templates: rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      ageRange: row.ageRange,
      category: row.category,
      difficulty: row.difficulty,
      tags: row.tags,
      coverImage: row.coverImage,
    })),
  });
});

/**
 * POST /storybook/templates/custom
 * Turn a parent's idea into a reusable custom story template owned by that
 * user, then hand back the stored row so the frontend can generate from it
 * with the exact same flow used by the predefined templates.
 */
router.post("/templates/custom", authMiddleware, storyGenerationLimiter, async (req, res) => {
  const validation = CustomTemplateSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      message: "Invalid input",
      errors: validation.error.flatten(),
    });
    return;
  }

  const { idea, setting, extras, message, ageRange } = validation.data;
  const moderation = moderateText([idea, setting, extras, message].filter(Boolean).join(" "));
  if (!moderation.safe) {
    res.status(400).json({ message: moderation.reason, code: "UNSAFE_TEMPLATE_INPUT" });
    return;
  }

  try {
    const generated = await storyService.generateCustomTemplate({
      idea,
      setting,
      extras,
      message,
      ageRange,
    });

    const template = await prismaClient.storyTemplate.create({
      data: {
        name: generated.name,
        description: generated.description,
        ageRange,
        category: generated.category,
        difficulty: generated.difficulty,
        tags: generated.tags,
        prompts: generated.prompts as unknown as object,
        isActive: true,
        source: "CUSTOM",
        ownerUserId: req.userId!,
      },
    });

    res.status(201).json({
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        ageRange: template.ageRange,
        category: template.category,
        difficulty: template.difficulty,
        tags: template.tags,
        coverImage: template.coverImage,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to generate custom story template");
    res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "We couldn't turn that idea into a storybook yet. Please try again.",
    });
  }
});

/**
 * Resolve a template id for generation. A user may use any active predefined
 * template plus their own custom templates.
 */
async function loadUsableTemplate(
  templateId: string,
  userId: string
): Promise<{
  id: string;
  name: string;
  description: string;
  ageRange: string;
  category: string;
  difficulty: number;
  prompts: {
    theme: string;
    moralLesson: string;
    educationalFocus: string;
    worldContext: string;
    beats: string[];
  };
} | null> {
  const row = await prismaClient.storyTemplate.findFirst({
    where: {
      id: templateId,
      isActive: true,
      OR: [{ source: "PREDEFINED" }, { source: "CUSTOM", ownerUserId: userId }],
    },
  });

  if (!row) return null;

  const prompts = row.prompts as unknown as {
    theme?: string;
    moralLesson?: string;
    educationalFocus?: string;
    worldContext?: string;
    beats?: string[];
  };

  if (!Array.isArray(prompts.beats) || prompts.beats.length !== STORYBOOK_PAGE_COUNT) {
    logger.error(
      { templateId: row.id, beats: Array.isArray(prompts.beats) ? prompts.beats.length : 0 },
      "Story template does not contain the required number of beats"
    );
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    ageRange: row.ageRange,
    category: row.category,
    difficulty: row.difficulty,
    prompts: {
      theme: prompts.theme ?? "",
      moralLesson: prompts.moralLesson ?? "",
      educationalFocus: prompts.educationalFocus ?? "",
      worldContext: prompts.worldContext ?? "",
      beats: prompts.beats,
    },
  };
}

/**
 * POST /storybook/generate
 * Generate a complete personalized storybook
 * A free generation is ONLY consumed on successful completion
 */
router.post("/generate", authMiddleware, storyGenerationLimiter, async (req, res) => {
  const userId = req.userId!;
  let storyId: string | null = null;

  try {
    const validation = GenerateStorybookSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        message: "Invalid input",
        errors: validation.error.flatten(),
      });
      return;
    }

    const {
      modelId,
      childName,
      childAge,
      templateId,
      dedication,
      artStyle,
      includeAudio,
      voiceId,
    } = validation.data;

    // Step 1: Validate the account still has a free story generation left
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

    // Step 2: Verify model exists and is trained
    const model = await prismaClient.model.findUnique({
      where: { id: modelId },
    });

    if (!model?.tensorPath) {
      res.status(404).json({ message: "Model not found or not trained yet" });
      return;
    }

    // Step 3: Resolve the template (predefined, or one this user owns)
    const template = await loadUsableTemplate(templateId, userId);
    if (!template) {
      res.status(404).json({ message: "Story template not found" });
      return;
    }

    logger.info(
      { userId, modelId, templateId, includeAudio },
      "Starting storybook generation"
    );

    // Step 4: Generate story script
    const script = await storyService.generatePersonalizedStoryScript(
      model.name,
      {
        childName,
        childAge,
        template,
        dedication,
      },
      {
        name: childName,
        age: childAge,
        appearance: `Use the trained portrait of ${childName} as the identity reference. Model profile: ${childAge}-year-old child, ${model.eyeColor.toLowerCase()} eyes, ${model.bald ? "no visible hair" : "hair as shown in the reference portrait"}, ${model.ethinicity.replace(/_/g, " ")} heritage. Do not change these reference-led details.`,
      }
    );

    // Step 5: Create story in database (status: Generating)
    const { story, pages } = await storyService.createStory(
      userId,
      modelId,
      script,
      artStyle || "",
      {
        childName,
        childAge,
        template,
        dedication,
        includeAudio,
        voiceId,
      }
    );
    storyId = story.id;

    // Step 6: Trigger every page with the model's reference portrait through Grok Imagine.
    const generationResults = await Promise.allSettled(
      pages.map((page) =>
        storyService.triggerPageGeneration(page.id, page.imagePrompt, model.thumbnail, { childName, artStyle })
      )
    );

    const successCount = generationResults.filter(
      (r) => r.status === "fulfilled"
    ).length;

    // Step 6: Consume one free generation ONLY after successful queue submission
    if (successCount > 0) {
      const consumeResult = await trialService.consumeGeneration(
        userId,
        story.id,
        "storybook_generation"
      );

      if (!consumeResult.success) {
        // Rollback: Mark story as failed
        await prismaClient.story.update({
          where: { id: story.id },
          data: { status: "Failed" },
        });

        res.status(402).json({
          message:
            "You have used all of your free story generations. Order a printed book to unlock another one!",
          code: "NO_TRIAL_GENERATIONS_LEFT",
          error: consumeResult.error,
        });
        return;
      }

      logger.info(
        {
          storyId: story.id,
          pages: pages.length,
          successful: successCount,
          trialsRemaining: consumeResult.remaining,
        },
        "Storybook generation started successfully"
      );
    } else {
      // All generation failed - mark story as failed, don't charge
      await prismaClient.story.update({
        where: { id: story.id },
        data: { status: "Failed" },
      });

      res.status(500).json({
        message: "Failed to start image generation",
        storyId: story.id,
      });
      return;
    }

    res.json({
      message: "Story generation started",
      storyId: story.id,
      title: story.title,
      pages: pages.length,
      pagesStarted: successCount,
      estimatedTime: `${pages.length * 30} seconds`,
      trialsRemaining: await trialService.getRemaining(userId),
      includeAudio,
    });
  } catch (error) {
    logger.error({ error, storyId }, "Storybook generation failed");

    // Mark story as failed if it was created
    if (storyId) {
      await prismaClient.story.update({
        where: { id: storyId },
        data: { status: "Failed" },
      }).catch(() => { });
    }

    // No generation was consumed, so no refund needed
    res.status(500).json({
      message: "Failed to generate story",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /storybook/:id/pdf
 * Create a print-ready export for a completed saved story instead of rebuilding it in the browser.
 */
router.get("/:id/pdf", authMiddleware, async (req, res) => {
  try {
    const story = await prismaClient.story.findFirst({
      where: { id: req.params.id, userId: req.userId! },
      include: { pages: { orderBy: { pageNumber: "asc" } } },
    });

    if (!story) {
      res.status(404).json({ message: "Story not found" });
      return;
    }
    if (story.pages.length === 0 || story.pages.some((page) => page.status !== "Generated")) {
      res.status(409).json({ message: "Wait until all story illustrations are ready before exporting." });
      return;
    }

    const pdfBuffer = await new PDFService().generateStorybookPdf(
      { title: story.title, dedication: story.dedication, childName: story.childName },
      story.pages.map((page) => ({
        pageNumber: page.pageNumber,
        content: page.content,
        imageUrl: page.imageUrl,
      }))
    );
    const safeFilename = story.title.replace(/[\\/:*?"<>|\r\n]+/g, "-").trim() || "storybook";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    logger.error({ error, storyId: req.params.id }, "Failed to export storybook PDF");
    res.status(500).json({ message: "Could not export the storybook PDF" });
  }
});

/**
 * GET /storybook/stories
 * Get all storybooks for current user
 */
router.get("/stories", authMiddleware, async (req, res) => {
  try {
    const stories = await prismaClient.story.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: "desc" },
      include: {
        pages: { orderBy: { pageNumber: "asc" } },
        model: { select: { id: true, name: true, thumbnail: true } },
      },
    });

    // Calculate progress for each story
    const storiesWithProgress = stories.map((story) => {
      const generatedPages = story.pages.filter(
        (p) => p.status === "Generated"
      ).length;
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
 * GET /storybook/dashboard/stats
 * Get dashboard statistics
 */
router.get("/dashboard/stats", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId!;

    // Get story counts
    const [totalStories, completedStories, stories] = await Promise.all([
      prismaClient.story.count({ where: { userId } }),
      prismaClient.story.count({ where: { userId, status: "Completed" } }),
      prismaClient.story.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          pages: { orderBy: { pageNumber: "asc" } },
          model: { select: { name: true } },
        },
      }),
    ]);

    // Calculate total pages and estimate audio
    const allPages = await prismaClient.storyPage.count({
      where: { story: { userId } },
    });

    const generatedPages = await prismaClient.storyPage.count({
      where: { story: { userId }, status: "Generated" },
    });

    // Format recent stories
    const recentStories = stories.map((story) => ({
      id: story.id,
      title: story.title,
      status: story.status,
      createdAt: story.createdAt.toISOString(),
      childName: story.childName,
      pageCount: story.pages.length,
      heroName: story.model?.name || "Hero",
      coverImage:
        story.pages.find((p) => p.status === "Generated" && p.imageUrl)?.imageUrl ?? null,
    }));

    res.json({
      totalStories,
      completedStories,
      pagesRendered: generatedPages,
      audioNarrations: 0, // Will be implemented when audio is tracked
      stories: recentStories,
    });
  } catch (error) {
    logger.error({ error }, "Failed to fetch dashboard stats");
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

/**
 * POST /storybook/:id/generate-audio
 * Generate audio narration for a complete story
 * A free generation is consumed ONLY on success
 */
router.post("/:id/generate-audio", authMiddleware, async (req, res) => {
  const storyId = req.params.id;
  const userId = req.userId!;

  try {
    const { voiceId = "sarah" } = req.body;

    // Verify ownership and completion
    const story = await prismaClient.story.findFirst({
      where: { id: storyId, userId },
      include: { pages: true },
    });

    if (!story) {
      res.status(404).json({ message: "Story not found" });
      return;
    }

    if (story.status !== "Completed") {
      res.status(400).json({
        message: "Story must be complete before generating audio",
        currentStatus: story.status,
      });
      return;
    }

    // Validate the account still has a free story generation left
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

    // Generate audio
    const result = await audioService.generateStoryAudio(storyId, voiceId);

    // Consume one free generation ONLY if audio was generated successfully
    let trialsRemaining = trialsLeft;
    if (result.successCount > 0) {
      const consumeResult = await trialService.consumeGeneration(
        userId,
        storyId,
        "audio_generation"
      );
      trialsRemaining = consumeResult.remaining;

      logger.info(
        { storyId, successCount: result.successCount, trialsRemaining },
        "Audio generation completed with a free generation consumed"
      );
    }

    res.json({
      message: "Audio generation complete",
      ...result,
      trialsRemaining,
    });
  } catch (error) {
    logger.error({ error, storyId }, "Failed to generate story audio");
    res.status(500).json({ message: "Failed to generate audio" });
  }
});

/**
 * GET /storybook/:id/status
 * Get detailed status of a story generation
 */
router.get("/:id/status", authMiddleware, async (req, res) => {
  try {
    const story = await storyService.getStoryWithStatus(
      req.params.id,
      req.userId!
    );

    if (!story) {
      res.status(404).json({ message: "Story not found" });
      return;
    }

    res.json({
      id: story.id,
      title: story.title,
      status: story.status,
      progress: story.progress,
      totalPages: story.totalPages,
      generatedPages: story.generatedPages,
      failedPages: story.failedPages,
      pages: story.pages.map((p) => ({
        id: p.id,
        pageNumber: p.pageNumber,
        status: p.status,
        hasImage: !!p.imageUrl,
      })),
    });
  } catch (error) {
    logger.error({ error }, "Failed to fetch story status");
    res.status(500).json({ message: "Failed to fetch story status" });
  }
});

/**
 * POST /storybook/:id/retry-failed
 * Retry failed page generations
 */
router.post("/:id/retry-failed", authMiddleware, async (req, res) => {
  const storyId = req.params.id;
  const userId = req.userId!;

  try {
    const story = await prismaClient.story.findFirst({
      where: { id: storyId, userId },
      include: {
        pages: { where: { status: "Failed" } },
        model: true,
      },
    });

    if (!story) {
      res.status(404).json({ message: "Story not found" });
      return;
    }

    if (story.pages.length === 0) {
      res.json({ message: "No failed pages to retry", retriedCount: 0 });
      return;
    }

    if (!story.model?.tensorPath) {
      res.status(400).json({ message: "Model not trained" });
      return;
    }

    // Retry failed pages (retries never consume extra trial generations)
    const results = await Promise.allSettled(
      story.pages.map((page) =>
        storyService.triggerPageGeneration(
          page.id,
          page.imagePrompt,
          story.model!.thumbnail,
          { childName: story.childName || undefined }
        )
      )
    );

    const successCount = results.filter((r) => r.status === "fulfilled").length;

    res.json({
      message: `Retried ${successCount} of ${story.pages.length} failed pages`,
      retriedCount: successCount,
      totalFailed: story.pages.length,
    });
  } catch (error) {
    logger.error({ error, storyId }, "Failed to retry pages");
    res.status(500).json({ message: "Failed to retry pages" });
  }
});

/**
 * GET /storybook/voices
 * Get available voice options for audio narration
 */
router.get("/voices", (_req, res) => {
  res.json({ voices: audioService.getVoices() });
});

/**
 * POST /storybook/generate-pdf
 * Generate a storybook PDF on the fly (no model training required).
 * Generates story script via LLM, then generates images via Fal AI, returns PDF.
 */
router.post("/generate-pdf", authMiddleware, storyGenerationLimiter, async (req, res) => {
  const validation = SimplePDFSchema.safeParse(req.body);
  if (!validation.success) {
    const formattedErrors = validation.error.flatten();
    logger.error({ errors: formattedErrors, body: req.body }, "SimplePDFSchema validation failed");
    const errorDetails = Object.entries(formattedErrors.fieldErrors)
      .map(([field, errs]) => `${field}: ${errs?.join(", ")}`)
      .join("; ");
    res.status(400).json({
      message: errorDetails ? `Invalid input - ${errorDetails}` : "Invalid input parameters",
      errors: formattedErrors,
    });
    return;
  }

  const childName = validation.data.childName;
  const childAge = validation.data.childAge;
  const hairColor = validation.data.hairColor || undefined;
  const eyeColor = validation.data.eyeColor || undefined;
  const skinTone = validation.data.skinTone || undefined;
  const hairDescription = validation.data.hairDescription || undefined;
  const templateId = validation.data.templateId;
  const dedication = validation.data.dedication || undefined;
  const childImage = validation.data.childImage || undefined;
  const language = validation.data.language || undefined;
  const artStyle = validation.data.artStyle || undefined;

  try {
    // Gate generation behind the free-generation allowance
    const trialsLeft = await trialService.getRemaining(req.userId!);
    if (trialsLeft <= 0) {
      res.status(402).json({
        message:
          "You have used all of your free story generations. Order a printed book to unlock another one!",
        code: "NO_TRIAL_GENERATIONS_LEFT",
        trials: 0,
      });
      return;
    }

    // Predefined templates are available to everyone; custom templates only to
    // the user who created them.
    const template = await loadUsableTemplate(templateId, req.userId!);
    if (!template) {
      res.status(404).json({ message: "Story template not found" });
      return;
    }

    logger.info(
      { childName, templateId, trialsLeft },
      "Starting no-training PDF storybook generation"
    );

    // Crop the uploaded photo to the child's face ONCE per story: detect +
    // crop locally (no network), upload the single crop to fal storage a
    // single time so page calls reuse the URL instead of re-uploading the raw
    // photo on every page.
    let storyRef: string | null = null;
    if (childImage) {
      const inputImage: string = childImage;
      try {
        const faceRefs = await faceCanvasService.generateFaceReferences(inputImage);
        storyRef = await imageService.uploadReferenceImage(faceRefs.face);
        logger.info("Face crop generated and uploaded for story");
      } catch (err) {
        logger.warn({ err }, "Face reference generation failed; falling back to the raw child photo");
      }
    }

    // Parent-confirmed identity facts are optional; the uploaded portrait is always the authority.
    const identityFacts = [
      hairColor ? `${hairColor} hair` : "",
      eyeColor ? `${eyeColor} eyes` : "",
      skinTone ? `${skinTone} skin tone` : "",
      hairDescription || "",
    ]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(", ");

    const appearance = identityFacts
      ? `The uploaded portrait is the authoritative identity reference. The parent-confirmed identity facts are: ${identityFacts}. Preserve the child's face shape, complexion, eyes, hair, and age-appropriate proportions exactly. These facts are non-negotiable and must not be changed or guessed differently.`
      : undefined;

    // Step 1: Generate story script via LLM
    const script = await storyService.generatePersonalizedStoryScript(
      childName,
      {
        childName,
        childAge,
        template,
        dedication,
        language,
      },
      {
        name: childName,
        age: childAge,
        appearance,
      }
    );

    // Step 2: Generate first 2 images (pages 1 & 2) synchronously for instant preview trigger
    const firstTwoPages = script.pages.slice(0, 2);
    const remainingPages = script.pages.slice(2);

    const previewPages = await Promise.all(
      firstTwoPages.map(async (page) => {
        const scenePrompt = `${childName} ${page.imageDescription}`;

        const referenceUrl = storyRef
          ? storyRef
          : childImage;

        const imageUrl = await imageService.generateImageSync({
          prompt: scenePrompt,
          aspectRatio: getPageAspectRatio(page.pageNumber, script.pages.length),
          imageUrl: referenceUrl,
          childName,
          artStyle,
          edgePlacementSide: isSquareBookPage(page.pageNumber, script.pages.length)
            ? undefined
            : getPageComposition(page.pageNumber, script.pages.length).characterSide,
        }).catch((err) => {
          logger.error({ err, pageNumber: page.pageNumber }, "Failed image generation for preview page");
          return null;
        });

        return {
          pageNumber: page.pageNumber,
          content: page.text,
          imagePrompt: page.imageDescription || page.text,
          imageUrl: imageUrl || null,
        };
      })
    );

    // Fetch or create hero model record for this user
    let userModel = await prismaClient.model.findFirst({ where: { userId: req.userId! } });
    if (!userModel) {
      userModel = await prismaClient.model.create({
        data: {
          name: childName || "Hero",
          type: "Others",
          age: childAge || 5,
          ethinicity: "White",
          eyeColor: "Brown",
          bald: false,
          zipUrl: "nobackground.zip",
          userId: req.userId!,
          trainingStatus: "Generated",
        },
      });
    }

    // Step 3: Save story in database (initially with pages 1 & 2 ready)
    const story = await prismaClient.story.create({
      data: {
        title: script.title,
        userId: req.userId!,
        modelId: userModel.id,
        status: remainingPages.length === 0 ? "Completed" : "Generating",
        childName,
        childAge,
        // Every book is 14 pages, so the legacy storyLength column is left at
        // its default and the template row is the source of truth.
        category: template.category,
        dedication,
        templateId: template.id,
      },
    });

    // Consume one free generation now that the story was successfully created
    const consumeResult = await trialService.consumeGeneration(
      req.userId!,
      story.id,
      "storybook_generation"
    );

    if (!consumeResult.success) {
      await prismaClient.story.update({
        where: { id: story.id },
        data: { status: "Failed" },
      });

      res.status(402).json({
        message:
          "You have used all of your free story generations. Order a printed book to unlock another one!",
        code: "NO_TRIAL_GENERATIONS_LEFT",
        error: consumeResult.error,
      });
      return;
    }

    await prismaClient.storyPage.createMany({
      data: [
        ...previewPages.map((p) => ({
          storyId: story.id,
          pageNumber: p.pageNumber,
          content: p.content,
          imagePrompt: p.imagePrompt,
          imageUrl: p.imageUrl,
          status: (p.imageUrl ? "Generated" : "Failed") as "Generated" | "Failed",
        })),
        ...remainingPages.map((p) => ({
          storyId: story.id,
          pageNumber: p.pageNumber,
          content: p.text,
          imagePrompt: p.imageDescription || p.text,
          imageUrl: null,
          status: "Pending" as "Pending",
        })),
      ],
    });

    // Step 4: Background task to generate remaining pages and compile final PDF for Admin Dashboard
    if (remainingPages.length > 0) {
      (async () => {
        try {
          await Promise.all(
            remainingPages.map(async (page) => {
              const scenePrompt = `${childName} ${page.imageDescription}`;
              const referenceUrl = storyRef
                ? storyRef
                : childImage;

              const imageUrl = await imageService.generateImageSync({
                prompt: scenePrompt,
                aspectRatio: getPageAspectRatio(page.pageNumber, script.pages.length),
                imageUrl: referenceUrl,
                childName,
                artStyle,
                edgePlacementSide: isSquareBookPage(
                  page.pageNumber,
                  script.pages.length
                )
                  ? undefined
                  : getPageComposition(page.pageNumber, script.pages.length).characterSide,
              }).catch((err) => {
                logger.error({ err, pageNumber: page.pageNumber }, "Failed background image generation for page");
                return null;
              });

              await prismaClient.storyPage.updateMany({
                where: { storyId: story.id, pageNumber: page.pageNumber },
                data: {
                  imageUrl: imageUrl || null,
                  status: imageUrl ? "Generated" : "Failed",
                },
              });
            })
          );

          const allStoryPages = await prismaClient.storyPage.findMany({
            where: { storyId: story.id },
            orderBy: { pageNumber: "asc" },
          });

          const allPagesFormatted = allStoryPages.map((p) => ({
            pageNumber: p.pageNumber,
            content: p.content,
            imagePrompt: p.imagePrompt,
            imageUrl: p.imageUrl,
          }));

          const pdfService = new PDFService();
          const pdfBuffer = await pdfService.generateStorybookPdf(
            { title: script.title, dedication, childName },
            allPagesFormatted
          );

          const pdfDir = path.join(process.cwd(), "assets", "pdfs");
          if (!existsSync(pdfDir)) {
            fs.mkdirSync(pdfDir, { recursive: true });
          }
          const pdfFilePath = path.join(pdfDir, `${story.id}.pdf`);
          fs.writeFileSync(pdfFilePath, pdfBuffer);

          const pdfUrl = `/assets/pdfs/${story.id}.pdf`;

          await prismaClient.story.update({
            where: { id: story.id },
            data: {
              status: "Completed",
              completedAt: new Date(),
              pdfUrl,
            },
          });

          logger.info({ storyId: story.id }, "Full story generation & PDF compilation complete in background");
        } catch (bgError) {
          logger.error({ bgError, storyId: story.id }, "Background page generation/PDF creation error");
        }
      })();
    } else {
      // If story only has 2 pages total, build PDF immediately
      const pdfService = new PDFService();
      const pdfBuffer = await pdfService.generateStorybookPdf(
        { title: script.title, dedication, childName },
        previewPages
      );
      const pdfDir = path.join(process.cwd(), "assets", "pdfs");
      if (!existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
      }
      const pdfFilePath = path.join(pdfDir, `${story.id}.pdf`);
      fs.writeFileSync(pdfFilePath, pdfBuffer);
      const pdfUrl = `/assets/pdfs/${story.id}.pdf`;
      await prismaClient.story.update({
        where: { id: story.id },
        data: { status: "Completed", completedAt: new Date(), pdfUrl },
      });
    }

    // Immediately trigger & return first 2 preview images to the user
    res.json({
      success: true,
      storyId: story.id,
      title: script.title,
      childName,
      pages: previewPages,
      trialsRemaining: await trialService.getRemaining(req.userId!),
    });
    return;
  } catch (error) {
    logger.error({ error }, "Failed to generate PDF storybook");
    res.status(500).json({ message: "Error generating storybook PDF" });
    return;
  }
});

export const storybookRouter = router;
