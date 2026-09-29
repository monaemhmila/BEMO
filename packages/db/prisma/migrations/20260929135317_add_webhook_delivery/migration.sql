-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "falRequestId" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "ownerId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebhookDelivery_falRequestId_key" ON "WebhookDelivery"("falRequestId");

-- CreateIndex
CREATE INDEX "WebhookDelivery_operationType_receivedAt_idx" ON "WebhookDelivery"("operationType", "receivedAt");
