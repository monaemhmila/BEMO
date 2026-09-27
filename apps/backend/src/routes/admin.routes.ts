import express, { Router } from "express";
import fs from "fs";
import path from "path";
import { prismaClient } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { adminAuthMiddleware } from "../middleware/adminAuth";
import { logger } from "../lib/logger";
import { PDFService } from "../services/pdf.service";
import { faceCanvasService } from "../services/face-canvas.service";
import { z } from "zod";
import { STORYBOOK_PAGE_COUNT } from "../contracts/storybook";
import {
  deleteTemplateImage,
  isTemplateImageFolder,
  MAX_PREVIEWS,
  MAX_TEMPLATE_IMAGE_BYTES,
  saveTemplateImage,
} from "../lib/template-images";

const router = Router();

// Protect ALL admin routes
router.use(authMiddleware);
router.use(adminAuthMiddleware);

// ─────────────────────────────────────────
// STATS
// ─────────────────────────────────────────

/**
 * GET /admin/stats
 * Comprehensive SaaS overview stats
 */
router.get("/stats", async (_req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      totalStories,
      totalTrials,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      storiesThisWeek,
      completedStories,
      generatingStories,
    ] = await Promise.all([
      prismaClient.user.count(),
      prismaClient.story.count(),
      prismaClient.user.aggregate({ _sum: { trialGenerations: true } }),
      prismaClient.user.count({ where: { createdAt: { gte: startOfDay } } }),
      prismaClient.user.count({ where: { createdAt: { gte: startOfWeek } } }),
      prismaClient.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      prismaClient.story.count({ where: { createdAt: { gte: startOfWeek } } }),
      prismaClient.story.count({ where: { status: "Completed" } }),
      prismaClient.story.count({ where: { status: "Generating" } }),
    ]);

    res.json({
      totalUsers,
      totalStories,
      totalTrialsRemaining: totalTrials._sum.trialGenerations ?? 0,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      storiesThisWeek,
      completedStories,
      generatingStories,
    });
  } catch (error) {
    logger.error({ error }, "Failed to fetch admin stats");
    res.status(500).json({ message: "Failed to fetch admin stats" });
  }
});

// ─────────────────────────────────────────
// USERS
// ─────────────────────────────────────────

/**
 * GET /admin/users
 * All users with full details, trial generations, and story counts
 */
router.get("/users", async (req, res) => {
  try {
    const { search, sortBy = "createdAt", order = "desc", limit = "100", offset = "0" } = req.query as Record<string, string>;

    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" as const } },
            { name: { contains: search, mode: "insensitive" as const } },
            { clerkId: { contains: search } },
          ],
        }
      : {};

    const users = await prismaClient.user.findMany({
      where,
      orderBy: { [sortBy]: order as "asc" | "desc" },
      take: parseInt(limit),
      skip: parseInt(offset),
            include: {
        models: {
          select: { id: true, name: true, thumbnail: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
        stories: {
          select: { id: true, title: true, status: true, createdAt: true, category: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    const formatted = users.map((u) => ({
      id: u.id,
      clerkId: u.clerkId,
      email: u.email,
      name: u.name || "Anonymous",
      trials: u.trialGenerations,
      modelCount: u.models.length,
      storyCount: u.stories.length,
      models: u.models,
      stories: u.stories,
      createdAt: u.createdAt,
    }));

    const total = await prismaClient.user.count({ where });

    res.json({ users: formatted, total });
  } catch (error) {
    logger.error({ error }, "Failed to fetch admin users");
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

/**
 * GET /admin/users/:id
 * Single user full profile
 */
router.get("/users/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prismaClient.user.findUnique({
      where: { id },
      include: {
        models: { orderBy: { createdAt: "desc" } },
        stories: {
          orderBy: { createdAt: "desc" },
          include: { pages: { select: { id: true, pageNumber: true, status: true, imageUrl: true } } },
        },
      },
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json({
      ...user,
      trials: user.trialGenerations,
    });
  } catch (error) {
    logger.error({ error, id }, "Failed to fetch user profile");
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

/**
 * DELETE /admin/users/:id
 * Delete a user and all their data
 */
router.delete("/users/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // Delete in order to respect FK constraints
    const userStories = await prismaClient.story.findMany({ where: { userId: id }, select: { id: true } });
    for (const story of userStories) {
      await prismaClient.order.deleteMany({ where: { storyId: story.id } });
      await prismaClient.storyAnalytics.deleteMany({ where: { storyId: story.id } });
      await prismaClient.storyPage.deleteMany({ where: { storyId: story.id } });
    }
    await prismaClient.order.deleteMany({ where: { userId: id } });
    await prismaClient.story.deleteMany({ where: { userId: id } });
    await prismaClient.model.deleteMany({ where: { userId: id } });
    await prismaClient.user.delete({ where: { id } });

    logger.info({ userId: id }, "Admin deleted user and all their data");
    res.json({ success: true, message: "User and all associated data deleted" });
  } catch (error) {
    logger.error({ error, id }, "Failed to delete user");
    res.status(500).json({ message: "Failed to delete user" });
  }
});

// ─────────────────────────────────────────
// TRIALS
// ─────────────────────────────────────────

/**
 * POST /admin/trials
 * Add, subtract, or set free story generations for a user
 */
router.post("/trials", async (req, res) => {
  const { userId, amount, action } = req.body;

  if (!userId || typeof amount !== "number") {
    res.status(400).json({ message: "userId and numeric amount are required" });
    return;
  }

  try {
    const current = await prismaClient.user.findUnique({
      where: { id: userId },
      select: { trialGenerations: true },
    });

    if (!current) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    let newAmount = current.trialGenerations;
    if (action === "subtract") {
      newAmount = Math.max(0, current.trialGenerations - amount);
    } else if (action === "add") {
      newAmount = current.trialGenerations + amount;
    } else {
      // set exact
      newAmount = Math.max(0, amount);
    }

    const updated = await prismaClient.user.update({
      where: { id: userId },
      data: { trialGenerations: newAmount },
      select: { trialGenerations: true },
    });

    logger.info({ userId, trials: updated.trialGenerations, action }, "Admin updated trials");
    res.json({ success: true, trials: updated.trialGenerations });
  } catch (error) {
    logger.error({ error, userId }, "Failed to update trials");
    res.status(500).json({ message: "Failed to update trials" });
  }
});

/**
 * POST /admin/grant-trials-all
 * Grant free story generations to all users
 */
router.post("/grant-trials-all", async (req, res) => {
  const { amount = 3 } = req.body;
  try {
    const users = await prismaClient.user.findMany({ select: { id: true } });

    await Promise.all(
      users.map((u) =>
        prismaClient.user.update({
          where: { id: u.id },
          data: { trialGenerations: { increment: amount } },
        })
      )
    );

    logger.info({ totalUsers: users.length, amount }, "Granted trials to all users");
    res.json({ success: true, message: `Granted ${amount} free stories to all ${users.length} users` });
  } catch (error) {
    logger.error({ error }, "Failed to grant trials to all");
    res.status(500).json({ message: "Failed to grant trials" });
  }
});

/**
 * POST /admin/reset-trials/:id
 * Reset a user's free story generations to 0
 */
router.post("/reset-trials/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const updated = await prismaClient.user.update({
      where: { id },
      data: { trialGenerations: 0 },
      select: { trialGenerations: true },
    });
    logger.info({ userId: id }, "Admin reset user trials to 0");
    res.json({ success: true, trials: updated.trialGenerations });
  } catch (error) {
    logger.error({ error, id }, "Failed to reset trials");
    res.status(500).json({ message: "Failed to reset trials" });
  }
});

// ─────────────────────────────────────────
// STORIES
// ─────────────────────────────────────────

/**
 * GET /admin/stories
 * All stories with user info and page counts
 */
router.get("/stories", async (req, res) => {
  try {
    const { status, limit = "100", offset = "0", search } = req.query as Record<string, string>;

    const where: any = {};
    if (status && status !== "all") where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { childName: { contains: search, mode: "insensitive" } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const stories = await prismaClient.story.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
      skip: parseInt(offset),
      include: {
        user: { select: { email: true, name: true, id: true } },
        pages: { select: { id: true, pageNumber: true, status: true, imageUrl: true } },
        model: { select: { name: true, thumbnail: true } },
      },
    });

    const total = await prismaClient.story.count({ where });
    res.json({ stories, total });
  } catch (error) {
    logger.error({ error }, "Failed to fetch admin stories");
    res.status(500).json({ message: "Failed to fetch stories" });
  }
});

/**
 * DELETE /admin/story/:id
 */
router.delete("/story/:id", async (req, res) => {
  const storyId = req.params.id;
  try {
    await prismaClient.order.deleteMany({ where: { storyId } });
    await prismaClient.storyAnalytics.deleteMany({ where: { storyId } });
    await prismaClient.storyPage.deleteMany({ where: { storyId } });
    await prismaClient.story.delete({ where: { id: storyId } });
    try {
      fs.unlinkSync(path.join(process.cwd(), "assets", "pdfs", `${storyId}.pdf`));
    } catch {
      // PDF may not exist on disk; nothing to clean up
    }
    logger.info({ storyId }, "Admin deleted story");
    res.json({ success: true });
  } catch (error) {
    logger.error({ error, storyId }, "Failed to delete story");
    res.status(500).json({ message: "Failed to delete story" });
  }
});

/**
 * GET /admin/story/:id/pdf
 * Download or generate the full PDF for any client story
 */
router.get("/story/:id/pdf", async (req, res) => {
  const storyId = req.params.id;
  try {
    const story = await prismaClient.story.findUnique({
      where: { id: storyId },
      include: { pages: { orderBy: { pageNumber: "asc" } } },
    });

    if (!story) {
      res.status(404).json({ message: "Story not found" });
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
    logger.error({ error, storyId }, "Failed to generate admin story PDF");
    res.status(500).json({ message: "Failed to generate story PDF" });
  }
});

// ─────────────────────────────────────────
// MODELS
// ─────────────────────────────────────────

/**
 * GET /admin/models
 * All AI models with user info
 */
router.get("/models", async (req, res) => {
  try {
    const { status, limit = "100", offset = "0", search } = req.query as Record<string, string>;

    const where: any = {};
    if (status && status !== "all") where.trainingStatus = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const models = await prismaClient.model.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
      skip: parseInt(offset),
      include: {
        user: { select: { email: true, name: true, id: true } },
        stories: { select: { id: true } },
      },
    });

    const total = await prismaClient.model.count({ where });
    res.json({ models, total });
  } catch (error) {
    logger.error({ error }, "Failed to fetch admin models");
    res.status(500).json({ message: "Failed to fetch models" });
  }
});

/**
 * DELETE /admin/model/:id
 */
router.delete("/model/:id", async (req, res) => {
  const modelId = req.params.id;
  try {
    await prismaClient.model.delete({ where: { id: modelId } });
    logger.info({ modelId }, "Admin deleted model");
    res.json({ success: true });
  } catch (error) {
    logger.error({ error, modelId }, "Failed to delete model");
    res.status(500).json({ message: "Failed to delete model" });
  }
});

// ─────────────────────────────────────────
// QUICK ACTIONS
// ─────────────────────────────────────────

/**
 * POST /admin/quick-story
 * Create a sample story for testing
 */
router.post("/quick-story", async (req, res) => {
  const userId = req.userId!;
  try {
    let model = await prismaClient.model.findFirst({ where: { userId } });
    if (!model) {
      model = await prismaClient.model.create({
        data: {
          name: "Sample Hero",
          type: "Others" as const,
          age: 6,
          ethinicity: "White",
          eyeColor: "Brown",
          bald: false,
          zipUrl: "sample.zip",
          userId,
          trainingStatus: "Generated",
          tensorPath: "sample/path.safetensors",
        },
      });
    }

    const story = await prismaClient.story.create({
      data: {
        title: "The Magic Forest Adventure",
        userId,
        modelId: model.id,
        status: "Completed",
        childName: "Alex",
        childAge: 6,
        storyLength: "short",
        category: "adventure",
      },
    });

    const pagesData = [
      { storyId: story.id, pageNumber: 1, content: "Once upon a time, Alex found a sparkling golden key near the ancient oak tree.", imagePrompt: "Alex finding a golden key near an ancient oak tree", status: "Generated" as const },
      { storyId: story.id, pageNumber: 2, content: "Alex unlocked a hidden door in the tree trunk and stepped into a glowing fairy woods.", imagePrompt: "Alex stepping into glowing magical woods", status: "Generated" as const },
      { storyId: story.id, pageNumber: 3, content: "A friendly little dragon named Sparky flew down to guide Alex to the Crystal Lake.", imagePrompt: "Alex with a friendly little dragon", status: "Generated" as const },
      { storyId: story.id, pageNumber: 4, content: "Together, Alex and Sparky solved the ancient riddle of the whispering trees.", imagePrompt: "Alex and dragon solving a puzzle", status: "Generated" as const },
      { storyId: story.id, pageNumber: 5, content: "Alex waved goodbye to Sparky and returned home with unforgettable magical memories.", imagePrompt: "Alex waving goodbye at sunset", status: "Generated" as const },
    ];

    await prismaClient.storyPage.createMany({ data: pagesData });
    logger.info({ storyId: story.id }, "Quick sample story created");
    res.json({ success: true, storyId: story.id });
  } catch (error) {
    logger.error({ error }, "Failed to create quick story");
    res.status(500).json({ message: "Failed to create sample story" });
  }
});

/**
 * GET /admin/preview-pdf
 * Generate and stream an empty/sample storybook PDF layout preview
 */
router.get("/preview-pdf", async (req, res) => {
  try {
    const pdfService = new PDFService();
    const title = (req.query.title as string) || "Empty Storybook Layout Preview";
    const pdfBuffer = await pdfService.generateEmptyPreviewPdf(title);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="empty-storybook-preview.pdf"');
    res.send(pdfBuffer);
  } catch (error) {
    logger.error({ error }, "Failed to generate empty preview PDF");
    res.status(500).json({ message: "Failed to generate empty preview PDF" });
  }
});

/**
 * GET /admin/activity
 * Recent activity across the platform
 */
router.get("/activity", async (_req, res) => {
  try {
    const [recentUsers, recentStories, recentModels] = await Promise.all([
      prismaClient.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, email: true, name: true, createdAt: true },
      }),
      prismaClient.story.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, title: true, status: true, createdAt: true, user: { select: { email: true } } },
      }),
      prismaClient.model.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, trainingStatus: true, createdAt: true, user: { select: { email: true } } },
      }),
    ]);

    const activity = [
      ...recentUsers.map((u) => ({ type: "user_joined", id: u.id, label: u.email, time: u.createdAt })),
      ...recentStories.map((s) => ({ type: "story_created", id: s.id, label: s.title, userEmail: s.user?.email, status: s.status, time: s.createdAt })),
      ...recentModels.map((m) => ({ type: "model_trained", id: m.id, label: m.name, userEmail: m.user?.email, status: m.trainingStatus, time: m.createdAt })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    res.json({ activity: activity.slice(0, 15) });
  } catch (error) {
    logger.error({ error }, "Failed to fetch activity");
    res.status(500).json({ message: "Failed to fetch activity" });
  }
});

// ─────────────────────────────────────────
// STORY EDITOR
// ─────────────────────────────────────────

const STORY_STATUS_VALUES = ["Pending", "Generating", "Completed", "Failed", "Processing"] as const;
const PAGE_STATUS_VALUES = ["Pending", "Generated", "Failed"] as const;
const CATEGORY_VALUES = [
  "bedtime", "adventure", "friendship", "learning", "animals", "fantasy",
  "moral", "seasonal", "science", "history", "emotions", "family",
] as const;
const LENGTH_VALUES = ["short", "medium", "long", "extended"] as const;

const UpdateStorySchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  childName: z.string().trim().max(80).optional(),
  childAge: z.number().int().min(0).max(21).nullable().optional(),
  category: z.enum(CATEGORY_VALUES).optional(),
  status: z.enum(STORY_STATUS_VALUES).optional(),
  dedication: z.string().max(500).nullable().optional(),
  storyLength: z.enum(LENGTH_VALUES).optional(),
  isPublic: z.boolean().optional(),
});

const UpdatePageSchema = z.object({
  content: z.string().max(5000).optional(),
  imagePrompt: z.string().max(4000).optional(),
  imageUrl: z.string().nullable().optional(),
  audioUrl: z.string().nullable().optional(),
  status: z.enum(PAGE_STATUS_VALUES).optional(),
  pageNumber: z.number().int().min(1).max(64).optional(),
});

/**
 * GET /admin/story/:id
 * Full story with every editable field — used by the admin story editor.
 */
router.get("/story/:id", async (req, res) => {
  try {
    const story = await prismaClient.story.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, email: true, name: true } },
        model: { select: { id: true, name: true, thumbnail: true } },
        pages: { orderBy: { pageNumber: "asc" } },
      },
    });

    if (!story) {
      res.status(404).json({ message: "Story not found" });
      return;
    }

    res.json({ story });
  } catch (error) {
    logger.error({ error }, "Failed to fetch story for admin editor");
    res.status(500).json({ message: "Failed to fetch story" });
  }
});

/**
 * PUT /admin/story/:id
 * Update story-level fields from the admin editor.
 */
router.put("/story/:id", async (req, res) => {
  const parsed = UpdateStorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
    return;
  }

  try {
    const story = await prismaClient.story.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
    logger.info({ storyId: story.id }, "Story updated from admin editor");
    res.json({ success: true, story });
  } catch (error) {
    logger.error({ error }, "Failed to update story from admin editor");
    res.status(500).json({ message: "Failed to update story" });
  }
});

/**
 * PUT /admin/page/:pageId
 * Update a single story page (content, image prompt, image/audio URLs, status, order).
 */
router.put("/page/:pageId", async (req, res) => {
  const parsed = UpdatePageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
    return;
  }

  try {
    const page = await prismaClient.storyPage.update({
      where: { id: req.params.pageId },
      data: parsed.data,
    });
    res.json({ success: true, page });
  } catch (error) {
    logger.error({ error }, "Failed to update page from admin editor");
    res.status(500).json({ message: "Failed to update page" });
  }
});

// ─────────────────────────────────────────
// FACE LAB (detection test + canvas references)
// ─────────────────────────────────────────

const FaceLabSchema = z.object({
  image: z.string().min(1, "Image data URL is required"),
});

/**
 * POST /admin/face-lab
 * Run local face detection on an uploaded photo (base64 data URL) and return
 * the tightly-cropped face reference fed to the image-edit model (no white
 * canvas). Fully local: no image API is called.
 */
router.post("/face-lab", async (req, res) => {
  const parsed = FaceLabSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
    return;
  }

  try {
    const result = await faceCanvasService.generateFaceLab(parsed.data.image);
    res.json(result);
  } catch (error) {
    logger.error({ error }, "Admin face lab failed");
    res.status(500).json({ message: "Face detection / reference generation failed" });
  }
});

// ─────────────────────────────────────────
// STORY TEMPLATES
// ─────────────────────────────────────────

const TEMPLATE_CATEGORY_VALUES = [
  "adventure", "bedtime", "birthday", "dinosaurs", "fantasy", "friendship",
  "learning", "animals", "moral", "seasonal", "science", "history", "emotions",
  "family", "sentimental", "pirate", "space", "underwater", "sports", "cooking",
] as const;
const TEMPLATE_AUDIENCE_VALUES = ["any", "girl", "boy"] as const;

/**
 * A template is only usable by the generator when its `prompts.beats` array has
 * exactly STORYBOOK_PAGE_COUNT entries — `loadUsableTemplate` in
 * storybook.routes.ts rejects anything else, which would surface to the user as
 * a confusing "no usable template" error. Validating here means a bad template
 * can never be saved from the admin.
 */
const TemplatePromptsSchema = z.object({
  theme: z.string().trim().min(1, "Theme is required").max(2000),
  moralLesson: z.string().trim().max(1000).default(""),
  educationalFocus: z.string().trim().max(1000).default(""),
  worldContext: z.string().trim().max(2000).default(""),
  beats: z
    .array(z.string().trim().min(1, "Each beat needs some text").max(2000))
    .length(
      STORYBOOK_PAGE_COUNT,
      `Beats must be exactly ${STORYBOOK_PAGE_COUNT} entries`
    ),
});

const TemplateReviewSchema = z
  .object({
    rating: z.number().min(0).max(5),
    count: z.number().int().min(0),
    quote: z.string().trim().min(1).max(500),
    author: z.string().trim().min(1).max(120),
  })
  .nullable();

/**
 * Gallery slides and cover art. `src` may be a full http(s) URL or a
 * root-relative path, which is what the upload endpoint returns (/assets/...) and
 * what the seed uses for committed art in the web app's public folder
 * (/templates/...). Anything else (javascript:, data:) is rejected so a stored
 * value can never execute in the storefront, and a protocol-relative "//host"
 * is rejected so a stored value can never be pulled from an unexpected origin.
 */
const SAFE_IMAGE_URL = /^(https?:\/\/|\/(?!\/))/i;

const TemplateImageUrlSchema = z
  .string()
  .trim()
  .min(1, "Image URL cannot be blank - clear the field instead")
  .max(2000)
  .refine(
    (value) => SAFE_IMAGE_URL.test(value),
    "Image must be an http(s) URL or an /assets path"
  );

const TemplatePreviewsSchema = z
  .array(
    z.object({
      src: TemplateImageUrlSchema,
      type: z.enum(["image", "video"]).default("image"),
      mimeType: z.string().trim().max(100).optional(),
      caption: z.string().trim().max(200).optional(),
    })
  )
  .max(MAX_PREVIEWS, `A template can have at most ${MAX_PREVIEWS} previews`);

/** Fields shared by create and update. `.partial()` is applied for updates. */
const TemplateFieldsSchema = z.object({
  id: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a lowercase URL slug, e.g. space-expedition")
    .optional(),
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().min(1, "Description is required").max(2000),
  ageRange: z.string().trim().min(1, "Age range is required").max(40),
  category: z.enum(TEMPLATE_CATEGORY_VALUES).default("adventure"),
  difficulty: z.number().int().min(1).max(5).default(1),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  isActive: z.boolean().default(true),
  coverImage: TemplateImageUrlSchema.nullable().optional(),
  sampleImage: TemplateImageUrlSchema.nullable().optional(),
  tagline: z.string().trim().max(300).nullable().optional(),
  excerpt: z.string().trim().max(2000).nullable().optional(),
  emoji: z.string().trim().max(16).nullable().optional(),
  audience: z.enum(TEMPLATE_AUDIENCE_VALUES).default("any"),
  artStyle: z.string().trim().max(500).nullable().optional(),
  review: TemplateReviewSchema.optional(),
  previews: TemplatePreviewsSchema.optional(),
  prompts: TemplatePromptsSchema,
});

const CreateTemplateSchema = TemplateFieldsSchema;
const UpdateTemplateSchema = TemplateFieldsSchema.partial();

/** Turn a template name into the URL slug the storefront uses. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Append -2, -3, ... until the slug is free. */
async function uniqueTemplateId(base: string): Promise<string> {
  let candidate = base;
  let suffix = 2;
  // Bounded so a pathological collision loop can never spin forever.
  while (suffix < 100) {
    const clash = await prismaClient.storyTemplate.findUnique({
      where: { id: candidate },
      select: { id: true },
    });
    if (!clash) return candidate;
    candidate = `${base.slice(0, 77)}-${suffix}`;
    suffix += 1;
  }
  return `${base.slice(0, 71)}-${Date.now()}`;
}

/** Normalise optional copy so the column stores null rather than "". */
function nullable(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * POST /admin/templates/images/upload?folder=covers&filename=my-cover.png
 * Store one catalogue image - a cover or a gallery preview - and return the URL
 * to save on the template.
 *
 * The body is the raw image, not JSON, which keeps a 4MB photo from becoming
 * 5.5MB of base64. The caller then PUTs the returned URL on the template, so
 * uploading and saving stay separate, retryable steps.
 */
router.post(
  "/templates/images/upload",
  express.raw({ type: "image/*", limit: MAX_TEMPLATE_IMAGE_BYTES }),
  async (req, res) => {
    const folder = req.query.folder;
    if (!isTemplateImageFolder(folder)) {
      res.status(400).json({ message: "folder must be one of: previews, covers" });
      return;
    }

    try {
      const buffer = req.body as Buffer;

      if (!Buffer.isBuffer(buffer) || !buffer.length) {
        res.status(400).json({ message: "Send the image as the raw request body" });
        return;
      }
      if (!/^image\//i.test(req.headers["content-type"] ?? "")) {
        res.status(415).json({ message: "Content-Type must be an image" });
        return;
      }

      const filename = (req.query.filename as string) || "image";
      const image = await saveTemplateImage(buffer, filename, folder);

      res.status(201).json({ image });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      logger.warn({ error }, "Rejected catalogue image upload");
      res.status(400).json({ message });
    }
  }
);

/**
 * GET /admin/templates
 * Every template, both predefined and user-created, with the beat count and the
 * number of stories using it so the dashboard can flag rows that the generator
 * would reject.
 */
router.get("/templates", async (req, res) => {
  try {
    const { search, source, isActive } = req.query as Record<string, string>;

    const where: any = {};
    if (source && source !== "all" && ["PREDEFINED", "CUSTOM"].includes(source)) {
      where.source = source;
    }
    if (isActive === "true" || isActive === "false") {
      where.isActive = isActive === "true";
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { id: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tags: { has: search } },
      ];
    }

    const templates = await prismaClient.storyTemplate.findMany({
      where,
      orderBy: [{ source: "asc" }, { name: "asc" }],
      include: { _count: { select: { stories: true } } },
    });

    res.json({
      templates: templates.map((template) => {
        const prompts = template.prompts as unknown as { beats?: unknown };
        const beats = Array.isArray(prompts?.beats) ? prompts.beats.length : 0;
        return {
          ...template,
          storiesCount: template._count.stories,
          beatsCount: beats,
          // Mirrors loadUsableTemplate so an unusable row is visible before a
          // customer hits it in the wizard.
          isUsable: beats === STORYBOOK_PAGE_COUNT,
        };
      }),
    });
  } catch (error) {
    logger.error({ error }, "Failed to fetch admin story templates");
    res.status(500).json({ message: "Failed to fetch templates" });
  }
});

/**
 * POST /admin/templates
 * Create a predefined template. The id doubles as the storefront slug, so it is
 * derived from the name unless one is supplied.
 */
router.post("/templates", async (req, res) => {
  const parsed = CreateTemplateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid template", issues: parsed.error.issues });
    return;
  }

  try {
    const data = parsed.data;
    const requested = data.id ?? slugify(data.name);
    const id = await uniqueTemplateId(requested || "template");

    const created = await prismaClient.storyTemplate.create({
      data: {
        id,
        name: data.name,
        description: data.description,
        ageRange: data.ageRange,
        category: data.category,
        difficulty: data.difficulty,
        tags: data.tags,
        isActive: data.isActive,
        source: "PREDEFINED",
        coverImage: nullable(data.coverImage),
        sampleImage: nullable(data.sampleImage),
        tagline: nullable(data.tagline),
        excerpt: nullable(data.excerpt),
        emoji: nullable(data.emoji),
        audience: data.audience,
        artStyle: nullable(data.artStyle),
        review: (data.review ?? null) as any,
        previews: (data.previews ?? null) as any,
        prompts: data.prompts as any,
      },
    });

    logger.info({ templateId: created.id }, "Admin created story template");
    res.status(201).json({ template: created });
  } catch (error) {
    logger.error({ error }, "Failed to create story template");
    res.status(500).json({ message: "Failed to create template" });
  }
});

/**
 * PUT /admin/templates/:id
 * Update a template. The id is immutable because it is the storefront URL, so
 * renaming a template never breaks a link.
 */
router.put("/templates/:id", async (req, res) => {
  const parsed = UpdateTemplateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid template", issues: parsed.error.issues });
    return;
  }

  const { id: ignoredId, ...data } = parsed.data;

  try {
    const existing = await prismaClient.storyTemplate.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });
    if (!existing) {
      res.status(404).json({ message: "Template not found" });
      return;
    }

    const updated = await prismaClient.storyTemplate.update({
      where: { id: req.params.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.ageRange !== undefined && { ageRange: data.ageRange }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.difficulty !== undefined && { difficulty: data.difficulty }),
        ...(data.tags !== undefined && { tags: data.tags }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.audience !== undefined && { audience: data.audience }),
        ...(data.coverImage !== undefined && { coverImage: nullable(data.coverImage) }),
        ...(data.sampleImage !== undefined && { sampleImage: nullable(data.sampleImage) }),
        ...(data.tagline !== undefined && { tagline: nullable(data.tagline) }),
        ...(data.excerpt !== undefined && { excerpt: nullable(data.excerpt) }),
        ...(data.emoji !== undefined && { emoji: nullable(data.emoji) }),
        ...(data.artStyle !== undefined && { artStyle: nullable(data.artStyle) }),
        ...(data.review !== undefined && { review: data.review as any }),
        ...(data.previews !== undefined && { previews: data.previews as any }),
        ...(data.prompts !== undefined && { prompts: data.prompts as any }),
      },
    });

    logger.info({ templateId: updated.id }, "Admin updated story template");
    res.json({ template: updated });
  } catch (error) {
    logger.error({ error, templateId: req.params.id }, "Failed to update story template");
    res.status(500).json({ message: "Failed to update template" });
  }
});

/**
 * PATCH /admin/templates/:id/toggle
 * Flip isActive. Deactivating is the safe alternative to deleting a template
 * that customers have already used — it removes it from the shop and the wizard
 * while keeping every existing story intact.
 */
router.patch("/templates/:id/toggle", async (req, res) => {
  try {
    const existing = await prismaClient.storyTemplate.findUnique({
      where: { id: req.params.id },
      select: { isActive: true },
    });
    if (!existing) {
      res.status(404).json({ message: "Template not found" });
      return;
    }

    const updated = await prismaClient.storyTemplate.update({
      where: { id: req.params.id },
      data: { isActive: !existing.isActive },
    });

    logger.info(
      { templateId: updated.id, isActive: updated.isActive },
      "Admin toggled story template"
    );
    res.json({ template: updated });
  } catch (error) {
    logger.error({ error, templateId: req.params.id }, "Failed to toggle story template");
    res.status(500).json({ message: "Failed to toggle template" });
  }
});

/**
 * DELETE /admin/templates/:id
 * Story.templateId is a foreign key with no ON DELETE action, so a template that
 * existing stories point at cannot simply be removed. Without ?force=true that
 * is reported as a 409 so the admin can choose; with it, the references are
 * detached first and the stories themselves are kept.
 */
router.delete("/templates/:id", async (req, res) => {
  const force = req.query.force === "true";

  try {
    const existing = await prismaClient.storyTemplate.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        previews: true,
        coverImage: true,
        sampleImage: true,
        _count: { select: { stories: true } },
      },
    });
    if (!existing) {
      res.status(404).json({ message: "Template not found" });
      return;
    }

    const storiesCount = existing._count.stories;
    if (storiesCount > 0 && !force) {
      res.status(409).json({
        message:
          `${storiesCount} story${storiesCount === 1 ? "" : " stories"} still use this template. ` +
          `Deactivate it to hide it from the shop, or delete anyway to detach those stories.`,
        storiesCount,
      });
      return;
    }

    await prismaClient.$transaction(async (tx) => {
      if (storiesCount > 0) {
        await tx.story.updateMany({
          where: { templateId: existing.id },
          data: { templateId: null },
        });
      }
      await tx.storyTemplate.delete({ where: { id: existing.id } });
    });

    // Remove the uploaded files too, so deleting a template does not leave
    // orphaned images in assets/. deleteTemplateImage ignores anything that
    // is not a locally uploaded catalogue image.
    const localImageUrls = [
      ...(Array.isArray(existing.previews)
        ? (existing.previews as { src?: string }[]).map((preview) => preview?.src)
        : []),
      existing.coverImage,
      existing.sampleImage,
    ].filter(
      (value): value is string => typeof value === "string" && value.includes("/assets/")
    );

    for (const src of localImageUrls) deleteTemplateImage(src);

    logger.info(
      { templateId: existing.id, storiesDetached: storiesCount, imagesRemoved: localImageUrls.length },
      "Admin deleted story template"
    );
    res.json({ success: true, storiesDetached: storiesCount, imagesRemoved: localImageUrls.length });
  } catch (error) {
    logger.error({ error, templateId: req.params.id }, "Failed to delete story template");
    res.status(500).json({ message: "Failed to delete template" });
  }
});

// ─────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────

const ORDER_STATUS_VALUES = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as const;
const PAYMENT_STATUS_VALUES = ["PENDING", "PAID", "FAILED", "REFUNDED"] as const;

const UpdateOrderSchema = z.object({
  status: z.enum(ORDER_STATUS_VALUES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUS_VALUES).optional(),
});

/**
 * GET /admin/orders
 * All orders with user + story details, plus a per-status summary.
 * Optional ?status=PENDING|PROCESSING|SHIPPED|DELIVERED|CANCELLED filter.
 */
router.get("/orders", async (req, res) => {
  try {
    const { status } = req.query as Record<string, string>;
    const validStatus = (ORDER_STATUS_VALUES as readonly string[]).includes(status ?? "")
      ? (status as (typeof ORDER_STATUS_VALUES)[number])
      : undefined;

    const [orders, summaryRows] = await Promise.all([
      prismaClient.order.findMany({
        where: validStatus ? { status: validStatus } : undefined,
        orderBy: { createdAt: "desc" },
        take: 300,
        include: {
          user: { select: { id: true, email: true, name: true } },
          story: { select: { id: true, title: true, childName: true } },
        },
      }),
      prismaClient.order.groupBy({ by: ["status"], _count: true }),
    ]);

    const summary: Record<(typeof ORDER_STATUS_VALUES)[number], number> = {
      PENDING: 0,
      PROCESSING: 0,
      SHIPPED: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };
    for (const row of summaryRows) {
      summary[row.status] = row._count;
    }

    res.json({
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        totalAmount: Number(o.totalAmount),
        currency: o.currency,
        customerName: o.customerName,
        phone: o.phone,
        address: o.address,
        city: o.city,
        postalCode: o.postalCode,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        user: o.user,
        story: o.story,
      })),
      summary,
    });
  } catch (error) {
    logger.error({ error }, "Failed to fetch admin orders");
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

/**
 * PUT /admin/order/:id
 * Update fulfillment status and/or payment status from the admin dashboard.
 */
router.put("/order/:id", async (req, res) => {
  const parsed = UpdateOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
    return;
  }

  try {
    const order = await prismaClient.order.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
    logger.info(
      { orderId: order.id, status: order.status, paymentStatus: order.paymentStatus },
      "Order updated from admin dashboard"
    );
    res.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
      },
    });
  } catch (error) {
    logger.error({ error }, "Failed to update order from admin dashboard");
    res.status(500).json({ message: "Failed to update order" });
  }
});

export const adminRouter = router;

