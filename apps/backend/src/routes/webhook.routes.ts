import { Router } from "express";
import { Webhook } from "svix";
import { prismaClient } from "../lib/prisma";
import { webhookLimiter } from "../middleware/rateLimiter";
import { StoryCompletionService } from "../services/story-completion.service";
import { logger } from "../lib/logger";
import { saveRemoteImageLocally } from "../lib/storage";
import { falWebhookAuth } from "../middleware/falWebhookAuth";

const router = Router();
const storyCompletion = StoryCompletionService.getInstance();

/**
 * POST /api/webhook/clerk
 * Handle Clerk user webhooks
 */
router.post("/clerk", webhookLimiter, async (req, res) => {
  const SIGNING_SECRET = process.env.SIGNING_SECRET;

  if (!SIGNING_SECRET) {
    logger.error("SIGNING_SECRET not configured");
    res.status(500).json({ success: false, message: "Server configuration error" });
    return;
  }

  const wh = new Webhook(SIGNING_SECRET);

  // The router is mounted with express.raw(), so req.body is a Buffer.
  // Convert to string for svix verification, then parse JSON for event data.
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf-8") : JSON.stringify(req.body);

  const svixId = req.headers["svix-id"] as string | undefined;
  const svixTimestamp = req.headers["svix-timestamp"] as string | undefined;
  const svixSignature = req.headers["svix-signature"] as string | undefined;

  if (!svixId || !svixTimestamp || !svixSignature) {
    res.status(400).json({ success: false, message: "Missing required headers" });
    return;
  }

  let evt: any;
  try {
    evt = wh.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch (error) {
    logger.error({ error }, "Invalid webhook signature");
    res.status(400).json({
      success: false,
      message: "Signature verification failed",
    });
    return;
  }

  const { id } = evt.data;
  const eventType = evt.type;

  try {
    if (eventType === "user.created" || eventType === "user.updated") {
      const email = evt.data.email_addresses?.[0]?.email_address;
      if (!email) {
        logger.warn({ userId: id }, "User webhook without email");
        res.json({ success: true });
        return;
      }

      await prismaClient.user.upsert({
        where: { clerkId: id },
        update: {
          name: `${evt.data.first_name ?? ""} ${evt.data.last_name ?? ""}`.trim(),
          email,
          profilePicture: evt.data.profile_image_url,
        },
        create: {
          clerkId: id,
          name: `${evt.data.first_name ?? ""} ${evt.data.last_name ?? ""}`.trim(),
          email,
          profilePicture: evt.data.profile_image_url,
        },
      });

      // New accounts automatically get `User.trialGenerations` (3 free stories)
      // via the Prisma schema default - nothing else to provision here.
      logger.info({ userId: id, eventType }, "User processed");
    }

    if (eventType === "user.deleted") {
      await prismaClient.user
        .delete({ where: { clerkId: id } })
        .catch(() => {
          // User might not exist
        });
      logger.info({ userId: id }, "User deleted");
    }
  } catch (error) {
    logger.error({ error, userId: id, eventType }, "Failed to process user webhook");
    res.status(500).json({ success: false, message: "Internal Server Error" });
    return;
  }

  res.json({ success: true });
});

/**
 * POST /api/webhook/story/page
 * Handle fal.ai webhook for story page image generation.
 * Protected by Ed25519 signature verification via falWebhookAuth middleware.
 */
router.post("/story/page", webhookLimiter, falWebhookAuth("story_page"), async (req, res) => {
  const requestId = req.body.request_id as string | undefined;
  const status = req.body.status;

  if (!requestId) {
    res.status(400).json({ message: "Invalid request" });
    return;
  }

  logger.info({ requestId, status }, "Story page webhook received");

  try {
    // Handle error status
    if (status === "ERROR") {
      await prismaClient.storyPage.updateMany({
        where: { falAiRequestId: requestId },
        data: { status: "Failed" },
      });

      // Find associated story and check if we need to update status
      const page = await prismaClient.storyPage.findFirst({
        where: { falAiRequestId: requestId },
        select: { storyId: true },
      });

      if (page) {
        // Check if all pages failed
        const story = await prismaClient.story.findUnique({
          where: { id: page.storyId },
          include: { pages: true },
        });

        if (story) {
          const allFailed = story.pages.every((p) => p.status === "Failed");
          if (allFailed) {
            await prismaClient.story.update({
              where: { id: story.id },
              data: { status: "Failed" },
            });
          }
        }
      }

      logger.error({ requestId }, "Page generation failed");
      res.json({ message: "Acknowledged" });
      return;
    }

    // Handle successful completion
    if (status === "COMPLETED" || status === "OK") {
      const rawImageUrl = req.body.payload?.images?.[0]?.url;

      if (!rawImageUrl) {
        logger.warn({ requestId }, "Completed webhook without image URL");
        await prismaClient.storyPage.updateMany({
          where: { falAiRequestId: requestId },
          data: { status: "Failed" },
        });
        res.json({ message: "Acknowledged" });
        return;
      }

      const imageUrl = await saveRemoteImageLocally(
        rawImageUrl,
        "generated",
        `page_${requestId.substring(0, 8)}`
      );

      // Update page with image
      await prismaClient.storyPage.updateMany({
        where: { falAiRequestId: requestId },
        data: {
          imageUrl,
          status: "Generated",
        },
      });

      // Check if story is complete
      const storyPage = await prismaClient.storyPage.findFirst({
        where: { falAiRequestId: requestId },
        select: { storyId: true, pageNumber: true },
      });

      if (storyPage) {
        const isComplete = await storyCompletion.checkStoryCompletion(storyPage.storyId);
        logger.info(
          { requestId, storyId: storyPage.storyId, pageNumber: storyPage.pageNumber, isComplete },
          "Page generation completed"
        );
      }

      res.json({ message: "Acknowledged" });
      return;
    }

    // Handle pending/processing status
    logger.info({ requestId, status }, "Page still processing");
    res.json({ message: "Acknowledged" });
  } catch (error) {
    logger.error({ error, requestId }, "Failed to process story page webhook");
    res.status(500).json({ message: "Internal error" });
  }
});

/**
 * POST /api/webhook/story/audio
 * Handle audio generation webhook (future use).
 * Protected by Ed25519 signature verification via falWebhookAuth middleware.
 */
router.post("/story/audio", webhookLimiter, falWebhookAuth("audio"), async (req, res) => {
  const requestId = req.body.request_id as string | undefined;
  const status = req.body.status;

  if (!requestId) {
    res.status(400).json({ message: "Invalid request" });
    return;
  }

  logger.info({ requestId, status }, "Audio webhook received");

  // Audio handling will be implemented when we add audio URL tracking to pages
  res.json({ message: "Acknowledged" });
});

export const webhookRouter = router;
