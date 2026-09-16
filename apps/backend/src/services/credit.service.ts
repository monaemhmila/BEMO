import { prismaClient } from "../lib/prisma";
import { logger } from "../lib/logger";

interface CreditTransactionResult {
  success: boolean;
  remainingCredits: number;
  transactionId?: string;
  error?: string;
}

interface CreditCost {
  modelTraining: number;
  storyGeneration: { short: number; medium: number; long: number };
  imageGeneration: number;
  audioGeneration: number;
}

/**
 * Credit Management Service
 * Handles all credit operations with proper transaction logging
 */
export class CreditService {
  private static instance: CreditService;

  // Credit costs for different operations
  readonly costs: CreditCost = {
    modelTraining: 20,
    storyGeneration: { short: 5, medium: 10, long: 15 },
    imageGeneration: 3, // Per image using Nano Banana Pro
    audioGeneration: 5, // Per page using ElevenLabs
  };

  static getInstance(): CreditService {
    if (!CreditService.instance) {
      CreditService.instance = new CreditService();
    }
    return CreditService.instance;
  }

  /**
   * Get user's current credit balance
   */
  async getBalance(userId: string): Promise<number> {
    const credit = await prismaClient.userCredit.findUnique({
      where: { userId },
    });
    return credit?.amount ?? 0;
  }

  /**
   * Check if user has enough credits for an operation
   */
  async hasEnoughCredits(userId: string, amount: number): Promise<boolean> {
    const balance = await this.getBalance(userId);
    return balance >= amount;
  }

  /**
   * Deduct credits ONLY after successful operation
   * Uses atomic transaction to prevent race conditions
   */
  async deductCredits(
    userId: string,
    amount: number,
    taskId: string,
    taskType: string
  ): Promise<CreditTransactionResult> {
    try {
      // Use transaction for atomicity
      const result = await prismaClient.$transaction(async (tx) => {
        // Get current balance with lock
        const credit = await tx.userCredit.findUnique({
          where: { userId },
        });

        if (!credit || credit.amount < amount) {
          throw new Error("Insufficient credits");
        }

        // Deduct credits
        const updated = await tx.userCredit.update({
          where: { userId },
          data: { amount: { decrement: amount } },
        });

        return updated.amount;
      });

      logger.info(
        { userId, amount, taskId, taskType, remainingCredits: result },
        "Credits deducted successfully"
      );

      return {
        success: true,
        remainingCredits: result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error(
        { error, userId, amount, taskId, taskType },
        "Failed to deduct credits"
      );

      return {
        success: false,
        remainingCredits: await this.getBalance(userId),
        error: errorMessage,
      };
    }
  }

  /**
   * Refund credits on failed operation
   */
  async refundCredits(
    userId: string,
    amount: number,
    taskId: string,
    reason: string
  ): Promise<CreditTransactionResult> {
    try {
      const updated = await prismaClient.userCredit.update({
        where: { userId },
        data: { amount: { increment: amount } },
      });

      logger.info(
        { userId, amount, taskId, reason, remainingCredits: updated.amount },
        "Credits refunded"
      );

      return {
        success: true,
        remainingCredits: updated.amount,
      };
    } catch (error) {
      logger.error({ error, userId, amount, taskId, reason }, "Failed to refund credits");
      return {
        success: false,
        remainingCredits: await this.getBalance(userId),
        error: error instanceof Error ? error.message : "Refund failed",
      };
    }
  }

  /**
   * Calculate total cost for storybook generation
   */
  calculateStorybookCost(
    storyLength: "short" | "medium" | "long",
    includeImages: boolean = true,
    includeAudio: boolean = false
  ): { total: number; breakdown: Record<string, number> } {
    const pageCount = storyLength === "long" ? 12 : storyLength === "medium" ? 8 : 5;
    
    const breakdown: Record<string, number> = {
      storyGeneration: this.costs.storyGeneration[storyLength],
    };

    if (includeImages) {
      breakdown.images = this.costs.imageGeneration * pageCount;
    }

    if (includeAudio) {
      breakdown.audio = this.costs.audioGeneration * pageCount;
    }

    const total = Object.values(breakdown).reduce((sum, cost) => sum + cost, 0);

    return { total, breakdown };
  }

  /**
   * Get credit cost preview for UI display
   */
  getCostPreview(): {
    modelTraining: number;
    storybook: { short: number; medium: number; long: number };
    perImage: number;
    perAudioPage: number;
  } {
    return {
      modelTraining: this.costs.modelTraining,
      storybook: {
        short: this.calculateStorybookCost("short", true, false).total,
        medium: this.calculateStorybookCost("medium", true, false).total,
        long: this.calculateStorybookCost("long", true, false).total,
      },
      perImage: this.costs.imageGeneration,
      perAudioPage: this.costs.audioGeneration,
    };
  }
}

export const creditService = CreditService.getInstance();

