import express, { Router } from "express";
import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GenerateImage, GenerateImagesFromPack, TrainModel } from "common/types";
import { prismaClient } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { env } from "../config/env";
import { FalAIModel } from "../models/fal-ai.model";
import { CreditService } from "../services/credit.service";
import { logger } from "../lib/logger";
import {
  modelTrainingLimiter,
  imageGenerationLimiter,
  storyGenerationLimiter,
} from "../middleware/rateLimiter";
import { z } from "zod";

const router = Router();
const falAiModel = new FalAIModel();
const creditService = CreditService.getInstance();

const manualModelSchema = z.object({
  name: z.string().min(1, "Model name is required"),
  type: z.enum(["Man", "Woman", "Others"]),
  age: z.number().int().min(0).max(120),
  ethinicity: z.enum([
    "White",
    "Black",
    "Asian_American",
    "East_Asian",
    "South_East_Asian",
    "South_Asian",
    "Middle_Eastern",
    "Pacific",
    "Hispanic",
  ]),
  eyeColor: z.enum(["Brown", "Blue", "Hazel", "Gray"]),
  bald: z.boolean().optional().default(false),
  tensorPath: z.string().min(1, "tensorPath (LoRA URL) is required"),
  triggerWord: z.string().optional(),
  thumbnail: z.string().url().optional(),
  zipUrl: z.string().optional(),
  open: z.boolean().optional().default(false),
});

// Get user credit balance with cost preview
router.get("/balance", authMiddleware, async (req, res) => {
  try {
    const userCredit = await prismaClient.userCredit.findUnique({
      where: { userId: req.userId! },
    });

    const costPreview = creditService.getCostPreview();

    res.json({
      credits: userCredit?.amount ?? 0,
      userId: req.userId,
      costs: costPreview,
    });
  } catch (error) {
    logger.error({ error }, "Failed to fetch balance");
    res.status(500).json({
      message: "Failed to fetch balance",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

const s3Client = env.BUCKET_NAME && env.S3_ACCESS_KEY && env.S3_SECRET_KEY
  ? new S3Client({
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY,
        secretAccessKey: env.S3_SECRET_KEY,
      },
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: Boolean(env.S3_ENDPOINT),
    })
  : null;

router.get("/pre-signed-url", authMiddleware, async (_req, res) => {
  try {
    if (!s3Client || !env.BUCKET_NAME) {
      console.error("Storage is not configured. Set BUCKET_NAME, S3_ACCESS_KEY, S3_SECRET_KEY, and optional S3_ENDPOINT.");
      res.status(500).json({
        error: "Storage not configured",
        message: "Set BUCKET_NAME, S3_ACCESS_KEY, S3_SECRET_KEY, and optionally S3_ENDPOINT in the backend environment.",
      });
      return;
    }

    const key = `models/${Date.now()}_${Math.random().toString(36).substring(7)}.zip`;
    const command = new PutObjectCommand({
      Bucket: env.BUCKET_NAME,
      Key: key,
      ContentType: "application/zip",
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 600 });
    res.json({ url, key });
  } catch (error) {
    console.error("Failed to generate pre-signed URL:", error);
    res.status(500).json({
      error: "Failed to generate upload URL",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

const zipUploadMiddleware = express.raw({
  type: "application/zip",
  limit: "200mb",
});

router.post("/upload/model", authMiddleware, zipUploadMiddleware, async (req, res) => {
  try {
    if (!req.body || !(req.body instanceof Buffer) || !req.body.length) {
      res.status(400).json({ message: "Missing zip file in request body" });
      return;
    }

    // Upload directly to Fal.ai's own cloud storage so they can access it
    const { fal } = await import("@fal-ai/client");
    const blob = new Blob([req.body], { type: "application/zip" });
    const falFile = new File([blob], `training_${Date.now()}.zip`, { type: "application/zip" });
    
    logger.info({ sizeBytes: req.body.length }, "Uploading training zip to fal.ai storage");
    const url = await fal.storage.upload(falFile);
    logger.info({ url }, "Training zip uploaded to fal.ai storage successfully");

    // Also save locally as backup
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require("fs") as typeof import("fs");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require("path") as typeof import("path");
    const assetsDir = path.join(process.cwd(), "assets", "models");
    if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
    const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.zip`;
    const filePath = path.join(assetsDir, filename);
    await fs.promises.writeFile(filePath, req.body);

    const key = `models/${filename}`;
    res.json({ key, url });
  } catch (error) {
    console.error("Failed to upload model zip:", error);
    res.status(500).json({
      message: "Failed to upload model zip",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});


router.post(
  "/ai/training",
  authMiddleware,
  modelTrainingLimiter,
  async (req, res) => {
    const parsedBody = TrainModel.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(422).json({ message: "Invalid input", error: parsedBody.error });
      return;
    }

    try {
      const { requestId } = await falAiModel.trainModel(
        parsedBody.data.zipUrl,
        parsedBody.data.name
      );

      const storyModel = await prismaClient.model.create({
        data: {
          name: parsedBody.data.name,
          type: parsedBody.data.type,
          age: parsedBody.data.age,
          ethinicity: parsedBody.data.ethinicity,
          eyeColor: parsedBody.data.eyeColor,
          bald: parsedBody.data.bald,
          userId: req.userId!,
          zipUrl: parsedBody.data.zipUrl,
          falAiRequestId: requestId,
        },
      });

      res.json({ modelId: storyModel.id });
    } catch (error) {
      res.status(500).json({
        message: "Training failed",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

router.post(
  "/ai/generate",
  authMiddleware,
  imageGenerationLimiter,
  async (req, res) => {
    const parsedBody = GenerateImage.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(422).json({ message: "Invalid request" });
      return;
    }

    const model = await prismaClient.model.findUnique({
      where: { id: parsedBody.data.modelId },
    });

    if (!model?.tensorPath) {
      res.status(404).json({ message: "Model not found or not trained" });
      return;
    }

    const credits = await prismaClient.userCredit.findUnique({
      where: { userId: req.userId! },
    });

    if ((credits?.amount ?? 0) < 1) {
      res.status(402).json({ message: "Not enough credits" });
      return;
    }

    const { requestId } = await falAiModel.generateImage(
      parsedBody.data.prompt,
      model.tensorPath
    );

    const output = await prismaClient.outputImages.create({
      data: {
        prompt: parsedBody.data.prompt,
        userId: req.userId!,
        modelId: parsedBody.data.modelId,
        imageUrl: "",
        falAiRequestId: requestId,
      },
    });

    await prismaClient.userCredit.update({
      where: { userId: req.userId! },
      data: { amount: { decrement: 1 } },
    });

    res.json({ imageId: output.id });
  }
);

router.post(
  "/pack/generate",
  authMiddleware,
  storyGenerationLimiter,
  async (req, res) => {
    const parsedBody = GenerateImagesFromPack.safeParse(req.body);

    if (!parsedBody.success) {
      res.status(422).json({ message: "Invalid input" });
      return;
    }

    const prompts = await prismaClient.packPrompts.findMany({
      where: { packId: parsedBody.data.packId },
    });

    const model = await prismaClient.model.findUnique({
      where: { id: parsedBody.data.modelId },
    });

    if (!model?.tensorPath) {
      res.status(404).json({ message: "Model not found or not trained" });
      return;
    }

    const credits = await prismaClient.userCredit.findUnique({
      where: { userId: req.userId! },
    });

    const requiredCredits = prompts.length;
    if ((credits?.amount ?? 0) < requiredCredits) {
      res.status(402).json({ message: "Not enough credits" });
      return;
    }

    const requests = await Promise.all(
      prompts.map((prompt) =>
        falAiModel.generateImage(prompt.prompt, model.tensorPath!)
      )
    );

    const images = await Promise.all(
      prompts.map((prompt, index) =>
        prismaClient.outputImages.create({
          data: {
            prompt: prompt.prompt,
            userId: req.userId!,
            modelId: parsedBody.data.modelId,
            imageUrl: "",
            falAiRequestId: requests[index].requestId,
          },
        })
      )
    );

    await prismaClient.userCredit.update({
      where: { userId: req.userId! },
      data: { amount: { decrement: requiredCredits } },
    });

    res.json({ images: images.map((image) => image.id) });
  }
);

/**
 * GET /models
 * Fetch all models accessible to the current user:
 * - User's own models (private)
 * - Public models (open: true) - available to everyone
 * 
 * Only returns models with trainingStatus "Generated" by default
 */
router.get("/models", authMiddleware, async (req, res) => {
  try {
    const includeTraining = req.query.includeTraining === "true";

    const models = await prismaClient.model.findMany({
      where: {
        AND: [
          // Only show Generated models unless explicitly requested
          includeTraining ? {} : { trainingStatus: "Generated" },
          // User's own models OR public models
          {
            OR: [
              { userId: req.userId },
              { open: true },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        thumbnail: true,
        trainingStatus: true,
        open: true,
        createdAt: true,
        // Only include userId for ownership check, not exposed
        userId: true,
      },
      orderBy: [
        // Public models first, then by creation date
        { open: "desc" },
        { createdAt: "desc" },
      ],
    });

    // Add isOwner flag for frontend
    const modelsWithOwnership = models.map((model) => ({
      ...model,
      isOwner: model.userId === req.userId,
      // Remove userId from response for privacy
      userId: undefined,
    }));

    res.json({ 
      success: true,
      models: modelsWithOwnership,
      count: models.length,
    });
  } catch (error) {
    logger.error({ error }, "Failed to fetch models");
    res.status(500).json({
      success: false,
      message: "Failed to fetch models",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.post("/models/manual-import", authMiddleware, async (req, res) => {
  const parsedBody = manualModelSchema.safeParse(req.body);

  if (!parsedBody.success) {
    res.status(422).json({
      success: false,
      message: "Invalid input",
      error: parsedBody.error.flatten(),
    });
    return;
  }

  try {
    const data = parsedBody.data;

    const existingModel = await prismaClient.model.findFirst({
      where: {
        tensorPath: data.tensorPath,
        userId: req.userId!,
      },
    });

    if (existingModel) {
      res.json({
        success: true,
        message: "Model already exists for this user",
        model: existingModel,
      });
      return;
    }

    let thumbnailUrl = data.thumbnail;
    if (!thumbnailUrl) {
      try {
        thumbnailUrl = await falAiModel.generateImageSync(data.tensorPath);
      } catch (thumbnailError) {
        logger.error(
          { thumbnailError },
          "Failed to auto-generate thumbnail for manual import"
        );
      }
    }

    const model = await prismaClient.model.create({
      data: {
        name: data.name,
        type: data.type,
        age: data.age,
        ethinicity: data.ethinicity,
        eyeColor: data.eyeColor,
        bald: data.bald ?? false,
        userId: req.userId!,
        triggerWord: data.triggerWord,
        tensorPath: data.tensorPath,
        thumbnail: thumbnailUrl,
        trainingStatus: "Generated",
        zipUrl: data.zipUrl ?? "manual-import",
        open: data.open ?? false,
      },
    });

    res.status(201).json({
      success: true,
      message: "Model imported successfully",
      model,
    });
  } catch (error) {
    logger.error({ error }, "Failed to import manual model");
    res.status(500).json({
      success: false,
      message: "Failed to import manual model",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/model/status/:modelId", authMiddleware, async (req, res) => {
  try {
    // Allow viewing status of own models OR public models
    const model = await prismaClient.model.findFirst({
      where: {
        id: req.params.modelId,
        OR: [
          { userId: req.userId },
          { open: true },
        ],
      },
    });

    if (!model) {
      res.status(404).json({ success: false, message: "Model not found" });
      return;
    }

    res.json({
      success: true,
      model: {
        id: model.id,
        name: model.name,
        status: model.trainingStatus,
        thumbnail: model.thumbnail,
        createdAt: model.createdAt,
        isOwner: model.userId === req.userId,
        open: model.open,
      },
    });
  } catch (error) {
    logger.error({ error }, "Failed to fetch model status");
    res.status(500).json({
      success: false,
      message: "Failed to fetch model status",
    });
  }
});

/**
 * PATCH /model/:modelId/visibility
 * Toggle model visibility (public/private)
 * Only the owner can change visibility
 */
router.patch("/model/:modelId/visibility", authMiddleware, async (req, res) => {
  try {
    const { open } = req.body;

    if (typeof open !== "boolean") {
      res.status(400).json({
        success: false,
        message: "Missing or invalid 'open' field (boolean required)",
      });
      return;
    }

    const model = await prismaClient.model.findUnique({
      where: { id: req.params.modelId },
    });

    if (!model) {
      res.status(404).json({ success: false, message: "Model not found" });
      return;
    }

    // Only owner can change visibility
    if (model.userId !== req.userId) {
      res.status(403).json({
        success: false,
        message: "Only the model owner can change visibility",
      });
      return;
    }

    const updated = await prismaClient.model.update({
      where: { id: req.params.modelId },
      data: { open },
    });

    logger.info(
      { modelId: model.id, open, userId: req.userId },
      "Model visibility updated"
    );

    res.json({
      success: true,
      message: `Model is now ${open ? "public" : "private"}`,
      model: {
        id: updated.id,
        name: updated.name,
        open: updated.open,
      },
    });
  } catch (error) {
    logger.error({ error }, "Failed to update model visibility");
    res.status(500).json({
      success: false,
      message: "Failed to update model visibility",
    });
  }
});

/**
 * POST /model/regenerate-thumbnail/:modelId
 * Regenerate the thumbnail/preview image for a trained model
 */
router.post("/model/regenerate-thumbnail/:modelId", authMiddleware, async (req, res) => {
  try {
    const model = await prismaClient.model.findUnique({
      where: { id: req.params.modelId, userId: req.userId },
    });

    if (!model) {
      res.status(404).json({ success: false, message: "Model not found" });
      return;
    }

    if (!model.tensorPath) {
      res.status(400).json({ 
        success: false, 
        message: "Model not trained yet - no tensor path available" 
      });
      return;
    }

    // Generate new thumbnail
    const thumbnailUrl = await falAiModel.generateImageSync(model.tensorPath);

    if (!thumbnailUrl) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to generate thumbnail" 
      });
      return;
    }

    // Update model with new thumbnail
    await prismaClient.model.update({
      where: { id: model.id },
      data: { thumbnail: thumbnailUrl },
    });

    res.json({
      success: true,
      thumbnail: thumbnailUrl,
      message: "Thumbnail regenerated successfully",
    });
  } catch (error) {
    console.error("Failed to regenerate thumbnail:", error);
    res.status(500).json({
      success: false,
      message: "Failed to regenerate thumbnail",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export const aiRouter = router;

