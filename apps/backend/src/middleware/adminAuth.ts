import type { Request, Response, NextFunction } from "express";
import { prismaClient } from "../lib/prisma";
import { logger } from "../lib/logger";
import { env } from "../config/env";

/**
 * Admin authorization middleware
 * Ensures the requesting user matches the configured administrator account.
 */
export async function adminAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  let userEmail = req.user?.email?.toLowerCase();

  // Fallback: If email was not set by Clerk API, look it up from database using req.userId
  if (!userEmail && req.userId) {
    try {
      const dbUser = await prismaClient.user.findUnique({
        where: { id: req.userId },
        select: { email: true },
      });
      if (dbUser?.email) {
        userEmail = dbUser.email.toLowerCase();
        req.user = { email: dbUser.email };
      }
    } catch (err) {
      logger.error({ err, userId: req.userId }, "Failed to fetch user email in adminAuthMiddleware");
    }
  }

  const targetAdmin = env.ADMIN_EMAIL?.toLowerCase();

  if (!targetAdmin) {
    logger.error("ADMIN_EMAIL is not configured; refusing admin access");
    res.status(503).json({
      success: false,
      message: "Admin access is not configured",
    });
    return;
  }

  if (!userEmail || userEmail.toLowerCase() !== targetAdmin) {
    logger.warn({ userId: req.userId, email: userEmail, expectedAdmin: targetAdmin }, "Unauthorized admin access attempt");
    res.status(403).json({
      success: false,
      message: "Forbidden: Admin privileges required",
    });
    return;
  }

  next();
}
