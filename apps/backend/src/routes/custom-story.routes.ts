/**
 * Custom Story Routes
 *
 * Template-free storybook generation: the parent describes their own story
 * idea (no templates, no category pickers) and the pipeline generates the
 * script, the illustrations with the child's face, and the PDF.
 *
 * Endpoint: POST /custom-story/generate
 */

import fs, { existsSync } from "fs";
import path from "path";
import { Router } from "express";
import { z } from "zod";
import { prismaClient } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { storyGenerationLimiter } from "../middleware/rateLimiter";
import { trialService } from "../services/trial.service";
import { ImageGenerationService } from "../services/image-generation.service";
import { PDFService } from "../services/pdf.service";
import {
  faceCanvasService,
  FaceReferences,
  getReferenceForPage,
} from "../services/face-canvas.service";
import { customStoryService } from "../services/custom-story.service";
import { logger } from "../lib/logger";

const router = Router();
const imageService = ImageGenerationService.getInstance();

// Validation schema for the free-form (no-template) story generation
const CustomStorySchema = z.object({
  childName: z.string().trim().min(1, "Child name is required").max(60),
  childAge: z.coerce.number().min(1).max(100).default(5),
  childImage: z.string().optional().nullable().or(z.literal("")),
  storyIdea: z.string().trim().min(3, "Tell us the story you want to create (at least a few words)").max(2000),
  extraDetails: z.string().trim().max(1000).optional().nullable().or(z.literal("")),
  setting: z.string().trim().max(400).optional().nullable().or(z.literal("")),
  moralLesson: z.string().trim().max(400).optional().nullable().or(z.literal("")),
  storyLength: z.enum(["short", "medium", "long"]).optional().default("short"),
  language: z.enum(["english", "french", "arabic"]).optional().default("english"),
});

/**
 * POST /custom-story/generate
 * Generate a template-free personalized storybook PDF (no model training).
 * Returns the same preview payload as /storybook/generate-pdf so the client
 * can reuse the standard preview flow.
 */
router.post("/generate", authMiddleware, storyGenerationLimiter, async (req, res) => {
  const validation = CustomStorySchema.safeParse(req.body);
  if (!validation.success) {
    const errorDetails = Object.entries(validation.error.flatten().fieldErrors)
      .map(([field, errs]) => `${field}: ${errs?.join(", ")}`)
      .join("; ");
    res.status(400).json({
      message: errorDetails ? `Invalid input - ${errorDetails}` : "Invalid input parameters",
      errors: validation.error.flatten(),
    });
    return;
  }

  const {
    childName,
    childAge,
    childImage,
    storyIdea,
    extraDetails,
    setting,
    moralLesson,
    storyLength,
    language,
  } = validation.data;

  const childImageData = childImage || undefined;

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

    logger.info(
      { childName, storyLength, language, ideaLength: storyIdea.length, trialsLeft },
      "Starting template-free custom story generation"
    );

    // Generate positioned face references ONCE from the uploaded photo
    let storyRefs: FaceReferences | null = null;
    if (childImageData) {
      try {
        const faceRefs = await faceCanvasService.generateFaceReferences(childImageData);
        const [center, right, left] = await Promise.all([
          imageService.uploadReferenceImage(faceRefs.center),
          imageService.uploadReferenceImage(faceRefs.right),
          imageService.uploadReferenceImage(faceRefs.left),
        ]);
        storyRefs = { center, right, left };
        logger.info("Custom story: positioned face references generated and uploaded");
      } catch (err) {
        logger.warn({ err }, "Custom story: face reference generation failed; falling back to raw child photo");
      }
    }

    // Step 1: Generate the template-free script via LLM
    const script = await customStoryService.generateCustomStoryScript({
      childName,
      childAge,
      storyIdea,
      extraDetails: extraDetails || undefined,
      setting: setting || undefined,
      moralLesson: moralLesson || undefined,
      storyLength,
      language,
    });

    const totalPages = script.pages.length;
    const firstTwoPages = script.pages.slice(0, 2);
    const remainingPages = script.pages.slice(2);

    // Step 2: Generate first 2 images synchronously for instant preview
    const previewPages = await Promise.all(
      firstTwoPages.map(async (page) => {
        const scenePrompt = `${childName} ${page.imageDescription}`;
        const referenceUrl = storyRefs
          ? getReferenceForPage(storyRefs, page.pageNumber)
          : childImageData;

        const imageUrl = await imageService.generateImageSync({
          prompt: scenePrompt,
          aspectRatio: "16:9",
          imageUrl: referenceUrl,
          childName,
        }).catch((err) => {
          logger.error({ err, pageNumber: page.pageNumber }, "Custom story: failed image generation for preview page");
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

    // Step 3: Save story in the database
    const story = await prismaClient.story.create({
      data: {
        title: script.title,
        userId: req.userId!,
        modelId: userModel.id,
        status: remainingPages.length === 0 ? "Completed" : "Generating",
        childName,
        childAge,
        storyLength,
        category: "custom",
        dedication: moralLesson?.trim() ? moralLesson.trim() : undefined,
      },
    });

    // Consume one free generation now that the story was successfully created
    const consumeResult = await trialService.consumeGeneration(req.userId!, story.id, "custom_story_generation");

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

    // Step 4: Background task to generate remaining pages and compile the final PDF
    if (remainingPages.length > 0) {
      (async () => {
        try {
          await Promise.all(
            remainingPages.map(async (page) => {
              const scenePrompt = `${childName} ${page.imageDescription}`;
              const referenceUrl = storyRefs
                ? getReferenceForPage(storyRefs, page.pageNumber)
                : childImageData;

              const imageUrl = await imageService.generateImageSync({
                prompt: scenePrompt,
                aspectRatio: "16:9",
                imageUrl: referenceUrl,
                childName,
              }).catch((err) => {
                logger.error({ err, pageNumber: page.pageNumber }, "Custom story: failed background image generation for page");
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

          const pdfService = new PDFService();
          const pdfBuffer = await pdfService.generateStorybookPdf(
            { title: script.title, dedication: story.dedication, childName },
            allStoryPages.map((p) => ({
              pageNumber: p.pageNumber,
              content: p.content,
              imagePrompt: p.imagePrompt,
              imageUrl: p.imageUrl,
            }))
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

          logger.info({ storyId: story.id }, "Custom story: full generation & PDF compilation complete in background");
        } catch (bgError) {
          logger.error({ bgError, storyId: story.id }, "Custom story: background page generation/PDF creation error");
        }
      })();
    } else {
      // If the story only has 2 pages total, build the PDF immediately
      const pdfService = new PDFService();
      const pdfBuffer = await pdfService.generateStorybookPdf(
        { title: script.title, dedication: story.dedication, childName },
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

    // Immediately return the first 2 preview pages
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
    logger.error({ error }, "Custom story generation failed");
    res.status(500).json({ message: "Error generating custom storybook" });
    return;
  }
});

export const customStoryRouter = router;