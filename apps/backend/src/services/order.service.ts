import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { prismaClient } from "../lib/prisma";
import { logger } from "../lib/logger";
import { env } from "../config/env";
import { trialService, TRIAL_GENERATIONS_PER_ORDER } from "./trial.service";
import { isGuestUser } from "../middleware/guestAuth";

export interface CreateOrderInput {
  storyId: string;
  customerName: string;
  phone: string;
  address: string;
  city: string;
  postalCode?: string;
  quantity: number;
}

export const ORDER_DISCOUNTS: Record<number, number> = {
  1: 0,
  2: 10,
  3: 20,
  4: 30,
};

export function calculateOrderPricing(quantity: number, unitPrice: number, gameDiscountPercent = 0) {
  const quantityDiscountPercent = ORDER_DISCOUNTS[quantity] ?? 0;
  const discountPercent = quantityDiscountPercent + gameDiscountPercent;
  const subtotalAmount = Math.round(unitPrice * quantity * 100) / 100;
  const totalAmount = Math.round(subtotalAmount * (1 - discountPercent / 100) * 100) / 100;
  return { subtotalAmount, totalAmount, discountPercent };
}

export interface OrderWithStory {
  id: string;
  orderNumber: string;
  userId: string;
  storyId: string;
  customerName: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string | null;
  totalAmount: number;
  subtotalAmount: number;
  quantity: number;
  discountPercent: number;
  gameDiscountPercent: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  story: {
    id: string;
    title: string;
    childName: string | null;
    pdfUrl: string | null;
  };
}

const STORY_SELECT = {
  story: { select: { id: true, title: true, childName: true, pdfUrl: true } },
} as const;

type OrderWithStoryRecord = Prisma.OrderGetPayload<{
  include: typeof STORY_SELECT;
}>;

function serializeOrder(order: OrderWithStoryRecord): OrderWithStory {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    userId: order.userId,
    storyId: order.storyId,
    customerName: order.customerName,
    phone: order.phone,
    address: order.address,
    city: order.city,
    postalCode: order.postalCode,
    totalAmount: Number(order.totalAmount),
    subtotalAmount: Number(order.subtotalAmount),
    quantity: order.quantity,
    discountPercent: order.discountPercent,
    gameDiscountPercent: order.gameDiscountPercent,
    currency: order.currency,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    story: {
      id: order.story.id,
      title: order.story.title,
      childName: order.story.childName,
      pdfUrl: order.story.pdfUrl,
    },
  };
}

function generateOrderNumber(): string {
  const date = new Date();
  const yymmdd = [
    String(date.getFullYear()).slice(-2),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
  const suffix = randomBytes(4).toString("hex").toUpperCase();
  return `SB-${yymmdd}-${suffix}`;
}

/**
 * Create a physical book order (Cash on Delivery) once the story text and
 * preview pages exist. Full artwork and the PDF wait for admin confirmation.
 * Prevents duplicate submissions by only allowing one PENDING order per story.
 */
export async function createOrder(
  userId: string,
  input: CreateOrderInput
): Promise<{ order: OrderWithStory; alreadyExists: boolean }> {
  const story = await prismaClient.story.findFirst({
    where: { id: input.storyId, userId },
  });

  if (!story) {
    throw new Error("STORY_NOT_FOUND");
  }

  const previewPages = await prismaClient.storyPage.count({
    where: { storyId: story.id, pageNumber: { lte: 2 }, status: "Generated", imageUrl: { not: null } },
  });
  if (story.status !== "Completed" && previewPages === 0) {
    throw new Error("STORY_NOT_COMPLETED");
  }

  const existing = await prismaClient.order.findFirst({
    where: { userId, storyId: input.storyId, status: "PENDING" },
    include: STORY_SELECT,
  });

  if (existing) {
    return { order: serializeOrder(existing), alreadyExists: true };
  }

  let created: OrderWithStoryRecord | null = null;
  const user = await prismaClient.user.findUnique({
    where: { id: userId },
    select: { gameRewardClaimedAt: true, gameRewardUsedAt: true },
  });
  const gameDiscountPercent = user?.gameRewardClaimedAt && !user.gameRewardUsedAt ? 10 : 0;
  const pricing = calculateOrderPricing(input.quantity, env.BOOK_PRICE_TND, gameDiscountPercent);

  // Retry order-number generation on the rare collision
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      created = await prismaClient.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId,
          storyId: input.storyId,
          customerName: input.customerName,
          phone: input.phone,
          address: input.address,
          city: input.city,
          postalCode: input.postalCode || null,
          subtotalAmount: pricing.subtotalAmount,
          totalAmount: pricing.totalAmount,
          quantity: input.quantity,
          discountPercent: pricing.discountPercent,
          gameDiscountPercent,
          currency: env.BOOK_CURRENCY,
          paymentMethod: "CASH_ON_DELIVERY",
          paymentStatus: "PENDING",
          status: "PENDING",
        },
        include: STORY_SELECT,
      });
      break;
    } catch (error) {
      const isDuplicate =
        typeof error === "object" &&
        error !== null &&
        (error as { code?: string }).code === "P2002";
      if (!isDuplicate || attempt === 3) {
        logger.error(
          { lastError: error, userId, storyId: input.storyId },
          "Failed to create order"
        );
        throw new Error("ORDER_CREATE_FAILED");
      }
    }
  }

  if (!created) {
    throw new Error("ORDER_CREATE_FAILED");
  }

  logger.info({ orderId: created.id, orderNumber: created.orderNumber }, "Order created");

  if (gameDiscountPercent > 0) {
    await prismaClient.user.updateMany({
      where: { id: userId, gameRewardClaimedAt: { not: null }, gameRewardUsedAt: null },
      data: { gameRewardUsedAt: new Date() },
    });
  }

  // Signed-in customers receive the normal post-order generation credit.
  // Guests are intentionally limited to their single anonymous generation.
  if (!(await isGuestUser(userId))) {
    await trialService.grantGenerations(
      userId,
      TRIAL_GENERATIONS_PER_ORDER,
      `book_order:${created.orderNumber}`
    );
  }

  return { order: serializeOrder(created), alreadyExists: false };
}

/** List the current user's orders ordered newest first. */
export async function listOrders(userId: string): Promise<OrderWithStory[]> {
  const orders = await prismaClient.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: STORY_SELECT,
  });
  return orders.map((o) => serializeOrder(o));
}

/** Fetch one of the current user's orders. */
export async function getOrder(
  userId: string,
  orderId: string
): Promise<OrderWithStory | null> {
  const order = await prismaClient.order.findFirst({
    where: { id: orderId, userId },
    include: STORY_SELECT,
  });
  return order ? serializeOrder(order) : null;
}

/** Fetch a PENDING order for a user+story (used to surface an existing confirmation). */
export async function getPendingOrderForStory(
  userId: string,
  storyId: string
): Promise<OrderWithStory | null> {
  const order = await prismaClient.order.findFirst({
    where: { userId, storyId, status: "PENDING" },
    include: STORY_SELECT,
  });
  return order ? serializeOrder(order) : null;
}
