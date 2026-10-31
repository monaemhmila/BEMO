ALTER TABLE "Order"
  ADD COLUMN "printedAt" TIMESTAMP(3),
  ADD COLUMN "printedBy" TEXT;

CREATE INDEX "Order_printedAt_idx" ON "Order"("printedAt");
