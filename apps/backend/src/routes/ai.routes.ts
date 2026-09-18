import { Router } from "express";
import { prismaClient } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { FalAIModel } from "../models/fal-ai.model";
import { CreditService } from "../services/credit.service";
import { logger } from "../lib/logger";
import { imageGenerationLimiter } from "../middleware/rateLimiter";

const router = Router();
const falAiModel = new FalAIModel();

// Get user credit balance with cost preview
router.get("/balance", authMiddleware, async (req, res) => {
  try {
    const userCredit = await prismaClient.userCredit.findUnique({
      where: { userId: req.userId! },
    });

    const creditService = CreditService.getInstance();
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

/**
 * GET /models
 * Get user's available models
 */
router.get("/models", authMiddleware, async (req, res) => {
  try {
    const models = await prismaClient.model.findMany({
      where: {
        OR: [
          { userId: req.userId },
          { open: true },
        ],
      },
      select: {
        id: true,
        name: true,
        thumbnail: true,
        open: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      models: models.map((m) => ({
        value: m.id,
        label: m.name,
        thumbnail: m.thumbnail ?? null,
      })),
      defaultModelId: null,
    });
  } catch (error) {
    logger.error({ error }, "Failed to fetch models");
    res.status(500).json({ message: "Failed to fetch models" });
  }
});

/**
 * POST /ai/generate
 * Generate images from text prompts using a trained model's tensor path
 */
router.post(
  "/generate",
  authMiddleware,
  imageGenerationLimiter,
  async (req, res) => {
    try {
      const { prompt, modelId } = req.body;
      const userId = req.userId!;

      // Look up the model to get its tensor path
      const model = modelId
        ? await prismaClient.model.findUnique({ where: { id: modelId } })
        : null;

      const tensorPath = (model as any)?.tensorPath ?? "";

      const creditService = CreditService.getInstance();
      const creditResult = await creditService.deductCredits(
        userId,
        creditService.costs.imageGeneration,
        `img-${Date.now()}`,
        "image_generation",
      );

      if (!creditResult.success) {
        res.status(402).json({
          message: "Insufficient credits",
          error: creditResult.error,
        });
        return;
      }

      const image = await falAiModel.generateImage(prompt, tensorPath);

      res.json({
        success: true,
        requestId: image.requestId,
        responseUrl: image.responseUrl,
      });
    } catch (error) {
      logger.error({ error }, "Failed to generate image");
      res.status(500).json({
        message: "Failed to generate image",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

export const aiRouter = router;
