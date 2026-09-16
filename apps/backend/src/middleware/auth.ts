import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { clerkClient } from "@clerk/clerk-sdk-node";
import { prismaClient } from "../lib/prisma";
import { env } from "../config/env";
import { logger } from "../lib/logger";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: {
        email: string;
        isPremium?: boolean;
      };
    }
  }
}

/**
 * Format the public key for JWT verification
 * Handles various input formats (with/without headers, with escaped newlines)
 */
function formatPublicKey(key: string): string {
  // Remove existing headers and all whitespace
  const rawKey = key
    .replace(/-----BEGIN PUBLIC KEY-----/g, "")
    .replace(/-----END PUBLIC KEY-----/g, "")
    .replace(/\\n/g, "")
    .replace(/\s/g, "");

  return `-----BEGIN PUBLIC KEY-----\n${rawKey}\n-----END PUBLIC KEY-----`;
}

/**
 * Verify JWT token and extract claims
 */
function verifyToken(token: string, publicKey: string): { sub: string } | null {
  try {
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ["RS256"],
    }) as { sub?: string };

    if (!decoded?.sub) {
      logger.warn("Token missing 'sub' claim");
      return null;
    }

    return { sub: decoded.sub };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: message }, "JWT verification failed");
    return null;
  }
}

/**
 * Ensure user exists in database and has credits
 * Handles database connection issues gracefully
 */
async function ensureUserExists(
  clerkId: string,
  email: string
): Promise<{ userId: string; email?: string; error?: string }> {
  const MAX_RETRIES = 2;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Test database connection first
      await prismaClient.$queryRaw`SELECT 1`;

      // Upsert user record
      const dbUser = await prismaClient.user.upsert({
        where: { clerkId },
        update: {
          // Update email if we have a real one
          ...(email && !email.includes("@placeholder") ? { email } : {}),
        },
        create: {
          clerkId,
          email: email || `${clerkId}@placeholder.local`,
          name: "",
        },
      });

      // Ensure user has credits
      await prismaClient.userCredit.upsert({
        where: { userId: dbUser.id },
        update: {},
        create: {
          userId: dbUser.id,
          amount: 20,
        },
      });

      logger.info({ userId: dbUser.id, clerkId, attempt }, "User ensured successfully");
      return { userId: dbUser.id, email: dbUser.email };

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      logger.warn(
        {
          attempt,
          maxRetries: MAX_RETRIES,
          clerkId,
          error: lastError.message,
        },
        `Failed to ensure user exists (attempt ${attempt}/${MAX_RETRIES})`
      );

      // If last attempt, try fallback
      if (attempt === MAX_RETRIES) {
        try {
          const existingUser = await prismaClient.user.findUnique({
            where: { clerkId },
          });
          if (existingUser) {
            logger.info({ userId: existingUser.id }, "Found existing user via fallback");
            return { userId: existingUser.id, email: existingUser.email };
          }
        } catch (fallbackError) {
          logger.error({ fallbackError }, "Fallback lookup failed");
        }
      } else {
        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
      }
    }
  }

  const errorMsg = lastError?.message || "Unknown database error";
  logger.error({ clerkId, error: errorMsg }, "Failed to ensure user after all retries");
  return { userId: "", error: errorMsg };
}

/**
 * Authentication middleware
 * Verifies JWT tokens from Clerk and ensures user exists in database
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Missing authorization token",
        hint: "Include 'Authorization: Bearer <token>' header",
      });
      return;
    }

    // Verify public key is configured
    if (!env.CLERK_JWT_PUBLIC_KEY) {
      logger.error("CLERK_JWT_PUBLIC_KEY not configured");
      res.status(500).json({
        success: false,
        message: "Server authentication not configured",
      });
      return;
    }

    // Verify JWT
    const formattedKey = formatPublicKey(env.CLERK_JWT_PUBLIC_KEY);
    const decoded = verifyToken(token, formattedKey);

    if (!decoded) {
      res.status(403).json({
        success: false,
        message: "Invalid or expired token",
        hint: "Please sign in again or check JWT template configuration",
      });
      return;
    }

    const clerkId = decoded.sub;
    let userEmail = "";

    // Fetch user details from Clerk (optional, for email)
    try {
      const clerkUser = await clerkClient.users.getUser(clerkId);
      const primaryEmail = clerkUser.emailAddresses.find(
        (e) => e.id === clerkUser.primaryEmailAddressId
      );

      if (primaryEmail) {
        userEmail = primaryEmail.emailAddress;
        req.user = { email: primaryEmail.emailAddress };
      }
    } catch (clerkError) {
      // Non-fatal - continue without email
      logger.debug({ clerkId }, "Could not fetch user from Clerk API");
    }

    // Ensure user exists in database
    const { userId, email: dbEmail, error } = await ensureUserExists(clerkId, userEmail);

    if (error || !userId) {
      res.status(500).json({
        success: false,
        message: "Failed to initialize user account",
      });
      return;
    }

    // Set user ID and user object for downstream handlers
    req.userId = userId;
    if (!req.user?.email && dbEmail) {
      req.user = { email: dbEmail };
    }

    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: message }, "Authentication middleware error");
    res.status(500).json({
      success: false,
      message: "Authentication error",
      ...(process.env.NODE_ENV === "development" ? { details: message } : {}),
    });
  }
}
