-- CreateEnum
CREATE TYPE "PageEventType" AS ENUM ('visit', 'click');

-- CreateTable
CREATE TABLE "PageEvent" (
    "id" TEXT NOT NULL,
    "eventType" "PageEventType" NOT NULL,
    "path" TEXT NOT NULL,
    "label" TEXT,
    "referrer" TEXT,
    "sessionId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageEvent_eventType_createdAt_idx" ON "PageEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "PageEvent_path_createdAt_idx" ON "PageEvent"("path", "createdAt");

-- CreateIndex
CREATE INDEX "PageEvent_sessionId_idx" ON "PageEvent"("sessionId");

-- CreateIndex
CREATE INDEX "PageEvent_createdAt_idx" ON "PageEvent"("createdAt");