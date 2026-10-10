import type { NextFunction, Request, Response } from "express";
import { prismaClient } from "../lib/prisma";
import { logger } from "../lib/logger";

declare global {
  namespace Express {
    interface Request {
      printerAccount?: { id: string; email: string; name: string };
    }
  }
}

export async function printerAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const email = req.user?.email?.trim().toLowerCase();
  if (!email) {
    res.status(401).json({ message: "A signed-in printer account is required." });
    return;
  }

  try {
    const printer = await prismaClient.printerAccount.findUnique({ where: { email } });
    if (!printer?.isActive) {
      res.status(403).json({ message: "This account is not enabled as a printer." });
      return;
    }
    req.printerAccount = printer;
    next();
  } catch (error) {
    logger.error({ error, email }, "Printer account authorization failed");
    res.status(500).json({ message: "Could not verify printer access." });
  }
}
