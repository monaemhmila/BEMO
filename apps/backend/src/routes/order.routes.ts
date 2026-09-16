import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { env } from "../config/env";
import { createOrder, listOrders, getOrder, getPendingOrderForStory } from "../services/order.service";

const router = Router();

const phoneRegex = /^[+]?[\d\s()-]{7,20}$/;

const CreateOrderSchema = z.object({
  storyId: z.string().min(1, "Book is required"),
  customerName: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(20).regex(phoneRegex, "Enter a valid phone number"),
  address: z.string().trim().min(5, "Enter a valid delivery address").max(500),
  city: z.string().trim().min(2, "Enter your city").max(100),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
});

/**
 * GET /orders/config
 * Order configuration for the frontend (price, currency, payment method)
 */
router.get("/config", authMiddleware, (_req, res) => {
  res.json({
    price: env.BOOK_PRICE_DOLLARS,
    currency: "USD",
    paymentMethod: "CASH_ON_DELIVERY",
  });
});

/**
 * POST /orders
 * Create a Cash on Delivery order for a completed book
 */
router.post("/", authMiddleware, async (req, res) => {
  const parsed = CreateOrderSchema.safeParse(req.body);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid order details";
    res.status(400).json({ success: false, message });
    return;
  }

  try {
    const result = await createOrder(req.userId!, {
      storyId: parsed.data.storyId,
      customerName: parsed.data.customerName,
      phone: parsed.data.phone,
      address: parsed.data.address,
      city: parsed.data.city,
      postalCode: parsed.data.postalCode || undefined,
    });

    if (result.alreadyExists) {
      res.status(409).json({
        success: false,
        message: "This book is already ordered and awaiting delivery.",
        order: result.order,
      });
      return;
    }

    res.status(201).json({ success: true, order: result.order });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status =
      message === "STORY_NOT_FOUND"
        ? 404
        : message === "STORY_NOT_COMPLETED"
        ? 400
        : 500;
    res.status(status).json({
      success: false,
      message:
        status === 500
          ? "Could not create the order. Please try again."
          : message === "STORY_NOT_COMPLETED"
          ? "This book is not finished yet. Please wait for generation to complete."
          : "Book not found.",
    });
  }
});

/**
 * GET /orders/pending/:storyId
 * Check whether the user already has a pending order for a given book
 */
router.get("/pending/:storyId", authMiddleware, async (req, res) => {
  try {
    const order = await getPendingOrderForStory(req.userId!, req.params.storyId);
    res.json({ success: true, order });
  } catch {
    res.status(500).json({ success: false, message: "Could not check order status." });
  }
});

/**
 * GET /orders
 * List the current user's orders
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const orders = await listOrders(req.userId!);
    res.json({ success: true, orders });
  } catch {
    res.status(500).json({ success: false, message: "Could not load orders." });
  }
});

/**
 * GET /orders/:id
 * Fetch one of the current user's orders
 */
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const order = await getOrder(req.userId!, req.params.id);
    if (!order) {
      res.status(404).json({ success: false, message: "Order not found." });
      return;
    }
    res.json({ success: true, order });
  } catch {
    res.status(500).json({ success: false, message: "Could not load order." });
  }
});

export { router as orderRouter };