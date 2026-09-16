import Razorpay from "razorpay";
import crypto from "crypto";
import { prismaClient } from "../lib/prisma";
import { logger } from "../lib/logger";

const PLAN_PRICES = {
  basic: 4000,
  premium: 8000,
  family: 12000,
} as const;

const PLAN_CREDITS = {
  basic: 500,
  premium: 1000,
  family: 1500,
} as const;

export type PlanType = keyof typeof PLAN_PRICES;

const razorpay =
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      })
    : null;

export class PaymentService {
  static async createRazorpayOrder(userId: string, plan: PlanType) {
    if (!razorpay) {
      throw new Error("Razorpay is not configured");
    }

    const order = await razorpay.orders.create({
      amount: PLAN_PRICES[plan] * 100,
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: { userId, plan },
    });

    await prismaClient.transaction.create({
      data: {
        userId,
        amount: PLAN_PRICES[plan],
        currency: "INR",
        paymentId: "",
        orderId: order.id,
        plan,
        status: "PENDING",
      },
    });

    return {
      key: process.env.RAZORPAY_KEY_ID,
      amount: PLAN_PRICES[plan] * 100,
      currency: "INR",
      name: "Portrait AI",
      description: `${plan.toUpperCase()} Plan`,
      order_id: order.id,
      notes: { userId, plan },
    };
  }

  static verifyRazorpaySignature({
    paymentId,
    orderId,
    signature,
  }: {
    paymentId: string;
    orderId: string;
    signature: string;
  }) {
    if (!process.env.RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay secret not configured");
    }

    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    return expectedSignature === signature;
  }

  static async completeSubscription(
    userId: string,
    plan: PlanType,
    paymentId: string,
    orderId: string
  ) {
    await prismaClient.$transaction(async (tx) => {
      await tx.transaction.updateMany({
        where: { orderId, userId },
        data: { paymentId, status: "SUCCESS" },
      });

      const tierMap: Record<PlanType, "STARTER" | "PREMIUM" | "FAMILY"> = {
        basic: "STARTER",
        premium: "PREMIUM",
        family: "FAMILY",
      };

      await tx.subscription.upsert({
        where: { userId },
        update: {
          tier: tierMap[plan],
          status: "ACTIVE",
          currentPeriodStart: new Date(),
          currentPeriodEnd: this.addMonths(1),
          razorpaySubscriptionId: orderId,
        },
        create: {
          userId,
          tier: tierMap[plan],
          status: "ACTIVE",
          razorpaySubscriptionId: orderId,
          currentPeriodStart: new Date(),
          currentPeriodEnd: this.addMonths(1),
        },
      });

      await tx.userCredit.upsert({
        where: { userId },
        update: { amount: { increment: PLAN_CREDITS[plan] } },
        create: {
          userId,
          amount: PLAN_CREDITS[plan],
        },
      });
    });

    logger.info({ userId, plan }, "Subscription created");
  }

  private static addMonths(months: number) {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date;
  }
}

