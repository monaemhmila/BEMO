import { Router } from "express";
import { prismaClient } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { FalAIModel } from "../models/fal-ai.model";
import { trialService, DEFAULT_TRIAL_GENERATIONS, TRIAL_GENERATIONS_PER_ORDER } from "../services/trial.service";
import { logger } from "../lib/logger";
import { imageGenerationLimiter } from "../middleware/rateLimiter";

const router = Router();
const falAiModel = new FalAIModel();

/**
 * GET /balance
 * Remaining free story generations for the signed-in user.
 */
router.get("/balance", authMiddleware, async (req, res) => {
  try {
    const trials = await trialService.getRemaining(req.userId!);

    res.json({
      trials,
      generationsLeft: trials,
      defaultTrials: DEFAULT_TRIAL_GENERATIONS,
      perOrder: TRIAL_GENERATIONS_PER_ORDER,
      userId: req.userId,
    });
  } catch (error) {
    logger.error({ error }, "Failed to fetch generation balance");
    res.status(500).json({
      message: "Failed to fetch generation balance",
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

      // Look up the model to get its tensor path
      const model = modelId
        ? await prismaClient.model.findUnique({ where: { id: modelId } })
        : null;

      const tensorPath = (model as any)?.tensorPath ?? "";

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
