import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { prismaClient } from "../lib/prisma";
import { logger } from "../lib/logger";
import { env } from "../config/env";
import { trialService, TRIAL_GENERATIONS_PER_ORDER } from "./trial.service";

export interface CreateOrderInput {
  storyId: string;
  customerName: string;
  phone: string;
  address: string;
  city: string;
  postalCode?: string;
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
 * Create a physical book order (Cash on Delivery) for a completed story.
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

  if (story.status !== "Completed") {
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
          totalAmount: env.BOOK_PRICE_DOLLARS,
          currency: "USD",
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

  // Every printed book order unlocks one extra free story generation.
  await trialService.grantGenerations(
    userId,
    TRIAL_GENERATIONS_PER_ORDER,
    `book_order:${created.orderNumber}`
  );

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