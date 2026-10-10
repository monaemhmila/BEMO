ALTER TABLE "Order"
  ADD COLUMN "subtotalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "discountPercent" INTEGER NOT NULL DEFAULT 0;

UPDATE "Order"
SET "subtotalAmount" = "totalAmount";
