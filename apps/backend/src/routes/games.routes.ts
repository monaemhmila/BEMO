import { Router } from "express";
import { authOrGuestMiddleware } from "../middleware/guestAuth";

import { prismaClient } from "../lib/prisma";

const router = Router();

/**
 * Claim the one-time 10% game reward. The server records the claim against
 * the Clerk user or anonymous guest session; the browser cannot choose the
 * discount amount or claim it repeatedly.
 */
router.post("/reward", authOrGuestMiddleware, async (req, res) => {
  const result = await prismaClient.user.updateMany({
    where: { id: req.userId!, gameRewardClaimedAt: null },
    data: { gameRewardClaimedAt: new Date() },
  });

  res.json({
    success: true,
    discountPercent: 10,
    alreadyClaimed: result.count === 0,
    message: "Your 10% game reward is ready for your next book order.",
  });
});

export { router as gamesRouter };
