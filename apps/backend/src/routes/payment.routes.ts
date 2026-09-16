import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { PaymentService, PlanType } from "../services/payment.service";
import { prismaClient } from "../lib/prisma";

const router = Router();

const SUPPORTED_PLANS: PlanType[] = ["basic", "premium", "family"];

router.post("/create", authMiddleware, async (req, res) => {
  try {
    const planInput = String(req.body.plan || "").toLowerCase();
    if (!SUPPORTED_PLANS.includes(planInput as PlanType)) {
      res.status(400).json({ message: "Unsupported plan" });
      return;
    }
    const plan = planInput as PlanType;

    if (!plan) {
      res.status(400).json({ message: "Missing plan" });
      return;
    }

    const order = await PaymentService.createRazorpayOrder(req.userId!, plan);
    res.json(order);
  } catch (error) {
    res.status(500).json({
      message: "Error creating payment order",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.post("/razorpay/verify", authMiddleware, async (req, res) => {
  const {
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
    plan: planRaw,
  } = req.body as {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
    plan: string;
  };

  const planInput = String(planRaw || "").toLowerCase();
  if (!SUPPORTED_PLANS.includes(planInput as PlanType)) {
    res.status(400).json({ message: "Unsupported plan" });
    return;
  }
  const plan = planInput as PlanType;

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    res.status(400).json({ message: "Missing required fields" });
    return;
  }

  const isValid = PaymentService.verifyRazorpaySignature({
    paymentId: razorpay_payment_id,
    orderId: razorpay_order_id,
    signature: razorpay_signature,
  });

  if (!isValid) {
    res.status(400).json({ message: "Invalid payment signature" });
    return;
  }

  await PaymentService.completeSubscription(
    req.userId!,
    plan,
    razorpay_payment_id,
    razorpay_order_id
  );

  const credits = await prismaClient.userCredit.findUnique({
    where: { userId: req.userId! },
    select: { amount: true },
  });

  res.json({
    success: true,
    credits: credits?.amount ?? 0,
  });
});

router.get("/subscription", authMiddleware, async (req, res) => {
  const subscription = await prismaClient.subscription.findFirst({
    where: { userId: req.userId! },
    select: {
      tier: true,
      status: true,
      currentPeriodEnd: true,
    },
  });

  res.json({ subscription });
});

router.get("/credits", authMiddleware, async (req, res) => {
  const credits = await prismaClient.userCredit.findUnique({
    where: { userId: req.userId! },
    select: { amount: true, updatedAt: true },
  });

  res.json({
    credits: credits?.amount ?? 0,
    lastUpdated: credits?.updatedAt ?? null,
  });
});

router.get("/transactions", authMiddleware, async (req, res) => {
  const transactions = await prismaClient.transaction.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: "desc" },
  });

  res.json({ transactions });
});

export const paymentRouter = router;

