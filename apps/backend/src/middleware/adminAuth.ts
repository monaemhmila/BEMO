import type { Request, Response, NextFunction } from "express";
import { prismaClient } from "../lib/prisma";
import { logger } from "../lib/logger";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "monemehamila@gmail.com";

/**
 * Admin authorization middleware
 * Ensures the requesting user is the super administrator (monemehamila@gmail.com)
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

  const targetAdmin = (process.env.ADMIN_EMAIL || ADMIN_EMAIL).toLowerCase();

  if (!userEmail || userEmail.toLowerCase() !== targetAdmin) {
    logger.warn({ userId: req.userId, email: userEmail, expectedAdmin: targetAdmin }, "Unauthorized admin access attempt");
    res.status(403).json({
      success: false,
      message: `Forbidden: Admin privileges required for ${targetAdmin}`,
    });
    return;
  }

  next();
}
