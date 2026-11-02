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

/**
 * Guest requests are cookie-backed, so a visitor could otherwise clear the
 * cookie and create another guest identity. This IP limit is an additional
 * abuse-control layer; signed-in users continue using their account limits.
 */
export const guestGenerationIpLimiter = rateLimit({
  ...baseConfig,
  windowMs: 24 * 60 * 60 * 1000,
  max: 5,
  skip: (req: Request) => Boolean(req.headers.authorization),
  message: buildMessage(
    "Free guest generations from this network are temporarily limited. Please try again tomorrow or sign in.",
    24 * 60
  ),
});

export const guestOrderIpLimiter = rateLimit({
  ...baseConfig,
  windowMs: 24 * 60 * 60 * 1000,
  max: 20,
  skip: (req: Request) => Boolean(req.headers.authorization),
  message: buildMessage(
    "Too many guest order attempts from this network. Please try again later.",
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

export const assistantLimiter = rateLimit({
  ...baseConfig,
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: buildMessage(
    "The assistant has reached its short-term limit. Please try again in a few minutes.",
    15
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
