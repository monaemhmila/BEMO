-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StoryCategoryEnum" ADD VALUE 'science';
ALTER TYPE "StoryCategoryEnum" ADD VALUE 'history';
ALTER TYPE "StoryCategoryEnum" ADD VALUE 'emotions';
ALTER TYPE "StoryCategoryEnum" ADD VALUE 'family';

-- AlterEnum
ALTER TYPE "StoryLengthEnum" ADD VALUE 'extended';

-- AlterEnum
ALTER TYPE "StoryStatusEnum" ADD VALUE 'Processing';

-- AlterTable
ALTER TABLE "Story" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "includeAudio" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "pdfUrl" TEXT,
ADD COLUMN     "readingTime" INTEGER,
ADD COLUMN     "shareToken" TEXT,
ADD COLUMN     "tags" TEXT[],
ADD COLUMN     "voiceId" TEXT,
DROP COLUMN "category",
ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'adventure';

-- AlterTable
ALTER TABLE "StoryPage" ADD COLUMN     "audioUrl" TEXT;

-- AlterTable
ALTER TABLE "StoryTemplate" ADD COLUMN     "coverImage" TEXT,
ADD COLUMN     "difficulty" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "tags" TEXT[],
DROP COLUMN "category",
ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'adventure',
DROP COLUMN "prompts",
ADD COLUMN     "prompts" JSONB NOT NULL;

-- DropTable
DROP TABLE "StorySettings";

-- CreateTable
CREATE TABLE "UserPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "defaultAge" INTEGER NOT NULL DEFAULT 5,
    "autoDedication" BOOLEAN NOT NULL DEFAULT true,
    "preferredLength" "StoryLengthEnum" NOT NULL DEFAULT 'medium',
    "preferredCategory" TEXT NOT NULL DEFAULT 'adventure',
    "language" TEXT NOT NULL DEFAULT 'en',
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryAnalytics" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "avgReadTime" INTEGER,
    "lastReadAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferences_userId_key" ON "UserPreferences"("userId");

-- CreateIndex
CREATE INDEX "UserPreferences_userId_idx" ON "UserPreferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StoryAnalytics_storyId_key" ON "StoryAnalytics"("storyId");

-- CreateIndex
CREATE INDEX "StoryAnalytics_storyId_idx" ON "StoryAnalytics"("storyId");

-- CreateIndex
CREATE INDEX "StoryAnalytics_lastReadAt_idx" ON "StoryAnalytics"("lastReadAt");

-- CreateIndex
CREATE INDEX "Model_userId_trainingStatus_idx" ON "Model"("userId", "trainingStatus");

-- CreateIndex
CREATE INDEX "Model_open_trainingStatus_idx" ON "Model"("open", "trainingStatus");

-- CreateIndex
CREATE INDEX "OutputImages_userId_status_idx" ON "OutputImages"("userId", "status");

-- CreateIndex
CREATE INDEX "OutputImages_modelId_status_idx" ON "OutputImages"("modelId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Story_shareToken_key" ON "Story"("shareToken");

-- CreateIndex
CREATE INDEX "Story_userId_status_idx" ON "Story"("userId", "status");

-- CreateIndex
CREATE INDEX "Story_createdAt_idx" ON "Story"("createdAt");

-- CreateIndex
CREATE INDEX "Story_isPublic_status_idx" ON "Story"("isPublic", "status");

-- CreateIndex
CREATE INDEX "Story_shareToken_idx" ON "Story"("shareToken");

-- CreateIndex
CREATE INDEX "StoryPage_storyId_pageNumber_idx" ON "StoryPage"("storyId", "pageNumber");

-- CreateIndex
CREATE INDEX "StoryPage_storyId_status_idx" ON "StoryPage"("storyId", "status");

-- CreateIndex
CREATE INDEX "StoryTemplate_category_ageRange_idx" ON "StoryTemplate"("category", "ageRange");

-- CreateIndex
CREATE INDEX "StoryTemplate_isActive_idx" ON "StoryTemplate"("isActive");

-- CreateIndex
CREATE INDEX "StoryTemplate_difficulty_idx" ON "StoryTemplate"("difficulty");

-- CreateIndex
CREATE INDEX "User_clerkId_idx" ON "User"("clerkId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Model" ADD CONSTRAINT "Model_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutputImages" ADD CONSTRAINT "OutputImages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryAnalytics" ADD CONSTRAINT "StoryAnalytics_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
