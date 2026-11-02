import { Router } from "express";
import { z } from "zod";
import { prismaClient } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { printerAuthMiddleware } from "../middleware/printerAuth";
import { PDFService } from "../services/pdf.service";
import { isLocalAssetAvailable } from "../lib/storage";
import { logger } from "../lib/logger";

const router = Router();
const CONFIRMED_STATUSES = ["PROCESSING", "SHIPPED", "DELIVERED"] as const;

router.use(authMiddleware, printerAuthMiddleware);

function isPdfReady(story: { status: string; pages: { status: string; imageUrl: string | null }[] }) {
  return story.status === "Completed" && story.pages.length > 0 && story.pages.every((page) => page.status === "Generated" && Boolean(page.imageUrl));
}

router.get("/queue", async (req, res) => {
  try {
    const view = req.query.view === "printed" ? "printed" : "ready";
    const orders = await prismaClient.order.findMany({
      where: {
        status: { in: [...CONFIRMED_STATUSES] },
        ...(view === "printed" ? { printedAt: { not: null } } : { printedAt: null }),
      },
      orderBy: { createdAt: "asc" },
      take: 300,
      include: {
        story: {
          select: {
            id: true,
            title: true,
            status: true,
            pages: { select: { status: true, imageUrl: true } },
          },
        },
      },
    });

    // Never return customer, address, phone, email, payment, or price data.
    res.json({
      view,
      orders: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        printedAt: order.printedAt,
        pdfReady: isPdfReady(order.story),
        story: { id: order.story.id, title: order.story.title },
      })),
    });
  } catch (error) {
    logger.error({ error }, "Failed to load printer queue");
    res.status(500).json({ message: "Failed to load printer queue" });
  }
});

router.get("/history", async (_req, res) => {
  try {
    const logs = await prismaClient.printAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { order: { select: { orderNumber: true, story: { select: { title: true } } } } },
    });
    res.json({
      logs: logs.map((log) => ({
        id: log.id,
        orderNumber: log.order.orderNumber,
        title: log.order.story.title,
        action: log.action,
        reason: log.reason,
        actorName: log.actorEmail,
        createdAt: log.createdAt,
      })),
    });
  } catch (error) {
    logger.error({ error }, "Failed to load print history");
    res.status(500).json({ message: "Failed to load print history" });
  }
});

const PrintActionSchema = z.object({
  action: z.enum(["PRINTED", "REPRINT_REQUESTED"]),
  reason: z.string().trim().max(500).optional(),
});

router.post("/orders/:id/print", async (req, res) => {
  const parsed = PrintActionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid print action." });
    return;
  }
  if (parsed.data.action === "REPRINT_REQUESTED" && !parsed.data.reason) {
    res.status(400).json({ message: "A reason is required for a reprint." });
    return;
  }

  try {
    const order = await prismaClient.order.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        status: true,
        printedAt: true,
        story: { select: { status: true, pages: { select: { status: true, imageUrl: true } } } },
      },
    });
    if (!order) {
      res.status(404).json({ message: "Order not found." });
      return;
    }
    if (!(CONFIRMED_STATUSES as readonly string[]).includes(order.status)) {
      res.status(409).json({ message: "This order is not confirmed for printing." });
      return;
    }
    if (parsed.data.action === "PRINTED" && !isPdfReady(order.story)) {
      res.status(409).json({ message: "The PDF is not print-ready yet." });
      return;
    }
    if (parsed.data.action === "REPRINT_REQUESTED" && !order.printedAt) {
      res.status(409).json({ message: "This order has not been marked printed yet." });
      return;
    }

    const printed = parsed.data.action === "PRINTED";
    await prismaClient.$transaction([
      prismaClient.order.update({
        where: { id: order.id },
        data: { printedAt: printed ? new Date() : null, printedBy: printed ? req.printerAccount!.email : null },
      }),
      prismaClient.printAuditLog.create({
        data: {
          orderId: order.id,
          action: parsed.data.action,
          reason: parsed.data.reason ?? null,
          actorEmail: req.printerAccount!.email,
        },
      }),
    ]);

    res.json({ success: true });
  } catch (error) {
    logger.error({ error, orderId: req.params.id }, "Failed to update printer order");
    res.status(500).json({ message: "Failed to update print status." });
  }
});

router.get("/orders/:id/pdf", async (req, res) => {
  try {
    const order = await prismaClient.order.findUnique({
      where: { id: req.params.id },
      include: { story: { include: { pages: { orderBy: { pageNumber: "asc" } } } } },
    });
    if (!order || !(CONFIRMED_STATUSES as readonly string[]).includes(order.status)) {
      res.status(404).json({ message: "Confirmed print order not found." });
      return;
    }
    const story = order.story;
    if (!isPdfReady(story)) {
      res.status(409).json({ message: "The story PDF is not ready yet." });
      return;
    }
    if (story.pdfUrl && isLocalAssetAvailable(story.pdfUrl)) {
      res.redirect(story.pdfUrl);
      return;
    }

    const pdfBuffer = await new PDFService().generateStorybookPdf(
      { title: story.title, dedication: story.dedication, childName: story.childName, language: story.language },
      story.pages.map((page) => ({ pageNumber: page.pageNumber, content: page.content, imageUrl: page.imageUrl }))
    );
    const safeFilename = story.title.replace(/[\\/:*?"<>|\r\n]+/g, "-").trim() || "storybook";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    logger.error({ error, orderId: req.params.id }, "Failed to download printer PDF");
    res.status(500).json({ message: "Failed to download PDF." });
  }
});

export { router as printerRouter };
