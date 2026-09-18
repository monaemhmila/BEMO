import { prismaClient } from "../lib/prisma";
import { logger } from "../lib/logger";

/**
 * Free story generations granted to every new account.
 */
export const DEFAULT_TRIAL_GENERATIONS = 3;

/**
 * Extra free story generations granted every time a printed book is ordered.
 */
export const TRIAL_GENERATIONS_PER_ORDER = 1;

interface TrialResult {
  success: boolean;
  remaining: number;
  error?: string;
}

/**
 * Trial Generation Service
 *
 * Story generation is gated by a per-account counter: every user starts with
 * 3 free generations and earns 1 more each time they order a printed book.
 */
export class TrialService {
  private static instance: TrialService;

  static getInstance(): TrialService {
    if (!TrialService.instance) {
      TrialService.instance = new TrialService();
    }
    return TrialService.instance;
  }

  /** How many free story generations the user has left. */
  async getRemaining(userId: string): Promise<number> {
    const user = await prismaClient.user.findUnique({
      where: { id: userId },
      select: { trialGenerations: true },
    });
    return user?.trialGenerations ?? 0;
  }

  /** True when the user still has at least one free generation. */
  async hasGeneration(userId: string): Promise<boolean> {
    return (await this.getRemaining(userId)) > 0;
  }

  /**
   * Atomically consume one free generation.
   * Returns `success: false` when the user has none left.
   */
  async consumeGeneration(
    userId: string,
    taskId?: string,
    taskType: string = "storybook_generation"
  ): Promise<TrialResult> {
    try {
      const current = await prismaClient.user.findUnique({
        where: { id: userId },
        select: { trialGenerations: true },
      });

      if (!current) {
        return { success: false, remaining: 0, error: "USER_NOT_FOUND" };
      }

      if (current.trialGenerations <= 0) {
        return { success: false, remaining: 0, error: "NO_TRIAL_GENERATIONS_LEFT" };
      }

      const updated = await prismaClient.user.update({
        where: { id: userId },
        data: { trialGenerations: { decrement: 1 } },
        select: { trialGenerations: true },
      });

      logger.info(
        { userId, taskId, taskType, remaining: updated.trialGenerations },
        "Trial generation consumed"
      );

      return { success: true, remaining: updated.trialGenerations };
    } catch (error) {
      logger.error(
        { error, userId, taskId, taskType },
        "Failed to consume trial generation"
      );
      return {
        success: false,
        remaining: await this.getRemaining(userId),
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Grant free generations back to a user (refund or book-order reward).
   */
  async grantGenerations(
    userId: string,
    amount: number = TRIAL_GENERATIONS_PER_ORDER,
    reason: string = "manual"
  ): Promise<TrialResult> {
    try {
      const updated = await prismaClient.user.update({
        where: { id: userId },
        data: { trialGenerations: { increment: amount } },
        select: { trialGenerations: true },
      });

      logger.info(
        { userId, amount, reason, remaining: updated.trialGenerations },
        "Trial generations granted"
      );

      return { success: true, remaining: updated.trialGenerations };
    } catch (error) {
      logger.error({ error, userId, amount, reason }, "Failed to grant trial generations");
      return {
        success: false,
        remaining: await this.getRemaining(userId),
        error: error instanceof Error ? error.message : "Grant failed",
      };
    }
  }
}

export const trialService = TrialService.getInstance();
