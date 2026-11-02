ALTER TABLE "User"
  ADD COLUMN "gameRewardClaimedAt" TIMESTAMP(3),
  ADD COLUMN "gameRewardUsedAt" TIMESTAMP(3);

ALTER TABLE "Order"
  ADD COLUMN "gameDiscountPercent" INTEGER NOT NULL DEFAULT 0;
