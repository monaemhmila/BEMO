-- Drop the legacy LoRA "Model" table and everything that pointed at it.
--
-- Image generation no longer trains or stores hero models: every page is
-- rendered live through the fal image-edit API using the reference photo the
-- customer uploads during the wizard. The Prisma schema had already stopped
-- mapping this table, so these statements only clean up the physical schema.
--
-- Every statement is guarded with IF EXISTS so the migration is safe to run
-- against databases that never applied the older Model migrations.

-- DropIndex
DROP INDEX IF EXISTS "Model_userId_trainingStatus_idx";
DROP INDEX IF EXISTS "Model_open_trainingStatus_idx";
DROP INDEX IF EXISTS "Model_falAiRequestId_idx";
DROP INDEX IF EXISTS "OutputImages_modelId_status_idx";

-- DropForeignKey
ALTER TABLE "Story" DROP CONSTRAINT IF EXISTS "Story_modelId_fkey";
ALTER TABLE "OutputImages" DROP CONSTRAINT IF EXISTS "OutputImages_modelId_fkey";

-- DropTable
DROP TABLE IF EXISTS "Model";

-- AlterTable
ALTER TABLE "Story" DROP COLUMN IF EXISTS "modelId";
ALTER TABLE "OutputImages" DROP COLUMN IF EXISTS "modelId";

-- DropEnum
DROP TYPE IF EXISTS "ModelTrainingStatusEnum";
DROP TYPE IF EXISTS "ModelTypeEnum";
DROP TYPE IF EXISTS "EthenecityEnum";
DROP TYPE IF EXISTS "EyeColorEnum";
