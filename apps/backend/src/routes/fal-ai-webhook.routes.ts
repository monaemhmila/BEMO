import { Router } from "express";
import { prismaClient } from "../lib/prisma";
import { logger } from "../lib/logger";
import { webhookLimiter } from "../middleware/rateLimiter";
import { falWebhookAuth } from "../middleware/falWebhookAuth";
import { saveRemoteImageLocally } from "../lib/storage";

const router = Router();

router.use(webhookLimiter);

/**
 * POST /fal-ai/webhook/image
 * Handle image generation webhook for OutputImages.
 * Note: This is for standalone image generation, not storybook pages.
 * Protected by Ed25519 signature verification via falWebhookAuth middleware.
 */
router.post("/image", falWebhookAuth("image"), async (req, res) => {
  const requestId = req.body.request_id as string | undefined;
  if (!requestId) {
    res.status(400).json({ message: "Invalid request" });
    return;
  }

  logger.info({ requestId, status: req.body.status }, "Image webhook received");

  if (req.body.status === "ERROR") {
    await prismaClient.outputImages.updateMany({
      where: { falAiRequestId: requestId },
      data: { status: "Failed" },
    });
    res.json({ message: "Acknowledged" });
    return;
  }

  const rawImageUrl = req.body.payload?.images?.[0]?.url;
  let finalImageUrl = "";

  if (rawImageUrl) {
    finalImageUrl = await saveRemoteImageLocally(
      rawImageUrl,
      "generated",
      `out_${requestId.substring(0, 8)}`
    );
  }

  await prismaClient.outputImages.updateMany({
    where: { falAiRequestId: requestId },
    data: {
      status: finalImageUrl ? "Generated" : "Failed",
      imageUrl: finalImageUrl,
    },
  });

  res.json({ message: "Acknowledged" });
});

export const falAiWebhookRouter = router;
