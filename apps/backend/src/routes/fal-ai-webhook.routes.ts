import { Router } from "express";
import { fal } from "@fal-ai/client";
import { prismaClient } from "../lib/prisma";
import { FalAIModel } from "../models/fal-ai.model";
import { CreditService } from "../services/credit.service";
import { webhookLimiter } from "../middleware/rateLimiter";
import { logger } from "../lib/logger";

const router = Router();
const falAiModel = new FalAIModel();
const creditService = CreditService.getInstance();

router.use(webhookLimiter);

/**
 * POST /fal-ai/webhook/train
 * Handle model training completion webhook
 * Credits are deducted ONLY on successful training
 */
router.post("/train", async (req, res) => {
  logger.info({ body: req.body }, "Training webhook received");

  const requestId = req.body.request_id as string | undefined;
  if (!requestId) {
    logger.warn("Missing request_id in training webhook");
    res.status(400).json({ message: "Missing request_id" });
    return;
  }

  const model = await prismaClient.model.findFirst({
    where: { falAiRequestId: requestId },
  });

  if (!model) {
    logger.warn({ requestId }, "Model not found for training webhook");
    res.status(404).json({ message: "Model not found" });
    return;
  }

  logger.info({ requestId, modelId: model.id, status: req.body.status }, "Processing training webhook");

  // Handle ERROR status
  if (req.body.status === "ERROR") {
    logger.error({ requestId, error: req.body.error }, "Training failed with error");
    await prismaClient.model.updateMany({
      where: { falAiRequestId: requestId },
      data: { trainingStatus: "Failed" },
    });
    // No credits deducted on failure
    res.json({ message: "Error recorded" });
    return;
  }

  // Handle COMPLETED, OK, and SUCCESS statuses
  const successStatuses = ["COMPLETED", "OK", "SUCCESS"];
  if (!successStatuses.includes(req.body.status)) {
    logger.info({ requestId, status: req.body.status }, "Training still in progress");
    res.json({ message: "Status pending" });
    return;
  }

  try {
    // Try to get LoRA URL from payload first
    let loraUrl =
      req.body.payload?.diffusers_lora_file?.url ??
      req.body.output?.diffusers_lora_file?.url ??
      null;

    logger.info({ requestId, loraUrlFromPayload: !!loraUrl }, "Checking LoRA URL from payload");

    // If not in payload, fetch from fal.ai queue result
    if (!loraUrl) {
      logger.info({ requestId }, "Fetching LoRA URL from fal.ai queue result");
      const result = await fal.queue.result("", {
        requestId,
      });
      loraUrl = (result.data as any)?.diffusers_lora_file?.url;
      logger.info({ requestId, loraUrl }, "Retrieved LoRA URL from queue result");
    }

    if (!loraUrl) {
      logger.error({ requestId }, "No LoRA URL found in payload or queue result");
      throw new Error("LoRA URL not found");
    }

    // Check credits BEFORE generating preview
    const credits = await prismaClient.userCredit.findUnique({
      where: { userId: model.userId },
    });

    const trainCredits = creditService.costs.modelTraining;

    if ((credits?.amount ?? 0) < trainCredits) {
      logger.warn({ requestId, userId: model.userId, credits: credits?.amount }, "Not enough credits for training");
      await prismaClient.model.updateMany({
        where: { falAiRequestId: requestId },
        data: { trainingStatus: "Failed" },
      });
      res.status(402).json({ message: "Not enough credits" });
      return;
    }

    // Generate preview/thumbnail image for the hero
    logger.info({ requestId, loraUrl }, "Generating preview image for hero");
    let previewImage = "";
    try {
      previewImage = await falAiModel.generateImageSync(loraUrl);
      logger.info({ requestId, previewImageGenerated: !!previewImage }, "Preview image generated");
    } catch (imgError) {
      logger.error({ requestId, error: imgError }, "Failed to generate preview image, continuing without it");
      // Continue without preview image - we can regenerate later
    }

    // Update model with training results
    await prismaClient.model.updateMany({
      where: { falAiRequestId: requestId },
      data: {
        trainingStatus: "Generated",
        tensorPath: loraUrl,
        thumbnail: previewImage || undefined,
      },
    });

    // Deduct credits ONLY on success
    const deductResult = await creditService.deductCredits(
      model.userId,
      trainCredits,
      model.id,
      "model_training"
    );

    if (!deductResult.success) {
      logger.error({ requestId, error: deductResult.error }, "Failed to deduct credits after successful training");
      // Model is still marked as Generated - admin can handle credit issues
    }

    logger.info(
      {
        requestId,
        modelId: model.id,
        userId: model.userId,
        creditsDeducted: trainCredits,
        remainingCredits: deductResult.remainingCredits
      },
      "Training completed successfully"
    );

    res.json({ message: "Model updated" });
  } catch (error) {
    logger.error({ requestId, error }, "Failed to process training webhook");
    await prismaClient.model.updateMany({
      where: { falAiRequestId: requestId },
      data: { trainingStatus: "Failed" },
    });
    // No credits deducted on failure
    res.status(500).json({ message: "Failed to process webhook" });
  }
});

/**
 * POST /fal-ai/webhook/image
 * Handle image generation webhook for OutputImages
 * Note: This is for standalone image generation, not storybook pages
 */
router.post("/image", async (req, res) => {
  const requestId = req.body.request_id as string | undefined;
  if (!requestId) {
    res.status(400).json({ message: "Missing request_id" });
    return;
  }

  logger.info({ requestId, status: req.body.status }, "Image webhook received");

  if (req.body.status === "ERROR") {
    await prismaClient.outputImages.updateMany({
      where: { falAiRequestId: requestId },
      data: { status: "Failed" },
    });
    res.json({ message: "Error recorded" });
    return;
  }

  const imageUrl = req.body.payload?.images?.[0]?.url;

  await prismaClient.outputImages.updateMany({
    where: { falAiRequestId: requestId },
    data: {
      status: imageUrl ? "Generated" : "Failed",
      imageUrl: imageUrl ?? "",
    },
  });

  res.json({ message: "Webhook received" });
});

export const falAiWebhookRouter = router;
