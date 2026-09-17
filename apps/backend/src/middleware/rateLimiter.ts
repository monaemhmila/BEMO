import rateLimit from "express-rate-limit";
import type { Request } from "express";

const baseConfig = {
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => req.method === "OPTIONS",
};

const buildMessage = (reason: string, retryAfterMinutes: number) => ({
  success: false,
  message: reason,
  retryAfterMinutes,
});

export const apiLimiter = rateLimit({
  ...baseConfig,
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: buildMessage(
    "Too many requests. Please slow down and try again shortly.",
    15
  ),
});

export const storyGenerationLimiter = rateLimit({
  ...baseConfig,
  windowMs: 60 * 60 * 1000,
  max: 8,
  message: buildMessage(
    "Story generation limit reached. Please try again in about an hour.",
    60
  ),
  skip: (req: Request) => Boolean((req as any).user?.isPremium),
});

export const modelTrainingLimiter = rateLimit({
  ...baseConfig,
  windowMs: 24 * 60 * 60 * 1000,
  max: 300,
  message: buildMessage(
    "Model training limit reached. Please try again tomorrow.",
    24 * 60
  ),
});

export const imageGenerationLimiter = rateLimit({
  ...baseConfig,
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: buildMessage(
    "Image generation limit reached. Please try again in a few minutes.",
    5
  ),
});

export const authLimiter = rateLimit({
  ...baseConfig,
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: buildMessage(
    "Too many login attempts. Please try again shortly.",
    15
  ),
});

export const webhookLimiter = rateLimit({
  ...baseConfig,
  windowMs: 60 * 1000,
  max: 120,
  message: buildMessage("Webhook rate limit exceeded.", 1),
});

