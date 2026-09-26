-- CreateEnum
CREATE TYPE "StoryTemplateSourceEnum" AS ENUM ('PREDEFINED', 'CUSTOM');

-- AlterTable
ALTER TABLE "StoryTemplate" ADD COLUMN     "ownerUserId" TEXT,
ADD COLUMN     "source" "StoryTemplateSourceEnum" NOT NULL DEFAULT 'PREDEFINED';

-- CreateIndex
CREATE INDEX "StoryTemplate_source_ownerUserId_idx" ON "StoryTemplate"("source", "ownerUserId");

-- AddForeignKey
ALTER TABLE "StoryTemplate" ADD CONSTRAINT "StoryTemplate_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
