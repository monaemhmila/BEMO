import type { NextFunction, Request, Response } from "express";
import { createHash, randomBytes } from "crypto";
import { prismaClient } from "../lib/prisma";
import { logger } from "../lib/logger";

const COOKIE_NAME = "bemo_guest_session";
const SESSION_DAYS = 30;

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie ?? "";
  const item = header.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : null;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function setGuestCookie(res: Response, token: string): void {
  const maxAge = SESSION_DAYS * 24 * 60 * 60 * 1000;
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${SESSION_DAYS * 24 * 60 * 60}; Path=/; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
  );
}

/**
 * Authenticate a request with Clerk when a bearer token is present, otherwise
 * create/restore a cookie-backed guest identity. This middleware is only used
 * on explicitly guest-capable routes; regular account routes remain Clerk-only.
 */
export async function authOrGuestMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.headers.authorization) {
    const { authMiddleware } = await import("./auth");
    return authMiddleware(req, res, next);
  }

  try {
    const rawToken = readCookie(req, COOKIE_NAME);
    const token = rawToken ?? randomBytes(32).toString("base64url");
    const tokenHash = hashToken(token);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);

    let session = await prismaClient.guestSession.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session || session.expiresAt <= now) {
      if (session) {
        await prismaClient.guestSession.delete({ where: { id: session.id } }).catch(() => undefined);
      }

      const guestId = randomBytes(12).toString("hex");
      const user = await prismaClient.user.create({
        data: {
          clerkId: `guest_${guestId}`,
          email: `guest-${guestId}@guest.local`,
          name: "Guest",
          trialGenerations: 1,
        },
      });
      session = await prismaClient.guestSession.create({
        data: { tokenHash, userId: user.id, expiresAt },
        include: { user: true },
      });
      setGuestCookie(res, token);
    } else {
      await prismaClient.guestSession.update({ where: { id: session.id }, data: { lastSeenAt: now } });
    }

    req.userId = session.userId;
    req.user = { email: session.user.email };
    next();
  } catch (error) {
    logger.error({ error }, "Guest session middleware failed");
    res.status(500).json({ success: false, message: "Could not start a guest session" });
  }
}

export async function isGuestUser(userId: string): Promise<boolean> {
  const guest = await prismaClient.guestSession.findUnique({ where: { userId }, select: { id: true } });
  return Boolean(guest);
}
