import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { trialService, DEFAULT_TRIAL_GENERATIONS, TRIAL_GENERATIONS_PER_ORDER } from "../services/trial.service";
import { logger } from "../lib/logger";

const router = Router();

/**
 * GET /balance
 * Remaining free story generations for the signed-in user.
 */
router.get("/balance", authMiddleware, async (req, res) => {
  try {
    const trials = await trialService.getRemaining(req.userId!);

    res.json({
      trials,
      generationsLeft: trials,
      defaultTrials: DEFAULT_TRIAL_GENERATIONS,
      perOrder: TRIAL_GENERATIONS_PER_ORDER,
      userId: req.userId,
    });
  } catch (error) {
    logger.error({ error }, "Failed to fetch generation balance");
    res.status(500).json({
      message: "Failed to fetch generation balance",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export const aiRouter = router;

