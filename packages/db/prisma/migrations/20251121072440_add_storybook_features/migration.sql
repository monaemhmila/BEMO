-- CreateEnum
CREATE TYPE "StoryLengthEnum" AS ENUM ('short', 'medium', 'long');

-- CreateEnum
CREATE TYPE "StoryCategoryEnum" AS ENUM ('bedtime', 'adventure', 'friendship', 'learning', 'animals', 'fantasy', 'moral', 'seasonal');

-- AlterTable
ALTER TABLE "Story" ADD COLUMN     "category" "StoryCategoryEnum" NOT NULL DEFAULT 'adventure',
ADD COLUMN     "childAge" INTEGER,
ADD COLUMN     "childName" TEXT,
ADD COLUMN     "dedication" TEXT,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "readCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "storyLength" "StoryLengthEnum" NOT NULL DEFAULT 'medium',
ADD COLUMN     "templateId" TEXT;

-- CreateTable
CREATE TABLE "StoryTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ageRange" TEXT NOT NULL,
    "category" "StoryCategoryEnum" NOT NULL,
    "prompts" TEXT[],
    "sampleImage" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorySettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "defaultAge" INTEGER NOT NULL DEFAULT 5,
    "autoDedication" BOOLEAN NOT NULL DEFAULT true,
    "preferredLength" "StoryLengthEnum" NOT NULL DEFAULT 'medium',
    "preferredCategory" "StoryCategoryEnum" NOT NULL DEFAULT 'adventure',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorySettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StorySettings_userId_key" ON "StorySettings"("userId");

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "StoryTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
