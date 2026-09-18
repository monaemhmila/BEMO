import { Router } from "express";
import { prismaClient } from "../lib/prisma";
import { logger } from "../lib/logger";
import { webhookLimiter } from "../middleware/rateLimiter";

const router = Router();

router.use(webhookLimiter);

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
