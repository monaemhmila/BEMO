CREATE TABLE "PrinterAccount" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PrinterAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PrinterAccount_email_key" ON "PrinterAccount"("email");
CREATE INDEX "PrinterAccount_isActive_idx" ON "PrinterAccount"("isActive");

CREATE TABLE "PrintAuditLog" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "reason" TEXT,
  "actorEmail" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PrintAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PrintAuditLog_orderId_createdAt_idx" ON "PrintAuditLog"("orderId", "createdAt");
CREATE INDEX "PrintAuditLog_createdAt_idx" ON "PrintAuditLog"("createdAt");

ALTER TABLE "PrintAuditLog"
  ADD CONSTRAINT "PrintAuditLog_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
