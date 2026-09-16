import { Router } from "express";
import { Webhook } from "svix";
import { prismaClient } from "../lib/prisma";
import { webhookLimiter } from "../middleware/rateLimiter";
import { StoryCompletionService } from "../services/story-completion.service";
import { logger } from "../lib/logger";
import { saveRemoteImageLocally } from "../lib/storage";

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
    res.status(500).json({ success: false, message: "SIGNING_SECRET not configured" });
    return;
  }

  const wh = new Webhook(SIGNING_SECRET);
  const payload = req.body;

  const svixId = req.headers["svix-id"] as string | undefined;
  const svixTimestamp = req.headers["svix-timestamp"] as string | undefined;
  const svixSignature = req.headers["svix-signature"] as string | undefined;

  if (!svixId || !svixTimestamp || !svixSignature) {
    res.status(400).json({ success: false, message: "Missing svix headers" });
    return;
  }

  let evt: any;
  try {
    evt = wh.verify(JSON.stringify(payload), {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch (error) {
    logger.error({ error }, "Invalid webhook signature");
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Invalid signature",
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

      const dbUser = await prismaClient.user.upsert({
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

      // Create initial credits for new users
      if (!dbUser?.id) {
        logger.error({ userId: id }, "Failed to resolve internal user id after upsert");
        res.status(500).json({ success: false, message: "Failed to sync user record" });
        return;
      }

      await prismaClient.userCredit.upsert({
        where: { userId: dbUser.id },
        update: {},
        create: {
          userId: dbUser.id,
          amount: 20, // Default starting credits
        },
      });

      logger.info({ userId: id, eventType }, "User processed");
    }

    if (eventType === "user.deleted") {
      const existingUser = await prismaClient.user.findUnique({
        where: { clerkId: id },
        select: { id: true },
      });

      if (existingUser?.id) {
        await prismaClient.userCredit.deleteMany({ where: { userId: existingUser.id } });
      }

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
 * Handle fal.ai webhook for story page image generation
 */
router.post("/story/page", webhookLimiter, async (req, res) => {
  const requestId = req.body.request_id as string | undefined;
  const status = req.body.status;

  if (!requestId) {
    res.status(400).json({ message: "Missing request_id" });
    return;
  }

  logger.info({ requestId, status }, "Story page webhook received");

  try {
    // Handle error status
    if (status === "ERROR") {
      const errorMessage = req.body.error || "Unknown generation error";
      
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

      logger.error({ requestId, errorMessage }, "Page generation failed");
      res.json({ message: "Error recorded" });
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
        res.json({ message: "Missing image URL" });
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

      res.json({ message: "Webhook processed" });
      return;
    }

    // Handle pending/processing status
    logger.info({ requestId, status }, "Page still processing");
    res.json({ message: "Status acknowledged" });
  } catch (error) {
    logger.error({ error, requestId }, "Failed to process story page webhook");
    res.status(500).json({ message: "Internal error" });
  }
});

/**
 * POST /api/webhook/story/audio
 * Handle audio generation webhook (future use)
 */
router.post("/story/audio", webhookLimiter, async (req, res) => {
  const requestId = req.body.request_id as string | undefined;
  const status = req.body.status;

  if (!requestId) {
    res.status(400).json({ message: "Missing request_id" });
    return;
  }

  logger.info({ requestId, status }, "Audio webhook received");

  // Audio handling will be implemented when we add audio URL tracking to pages
  res.json({ message: "Audio webhook acknowledged" });
});

export const webhookRouter = router;
