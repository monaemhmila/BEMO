-- Persist the uploaded reference photo on the story.
--
-- The legacy `Model` row used to carry a thumbnail that retried pages were
-- re-rendered against. With LoRA models gone, the reference photo the customer
-- uploads in the wizard is the only thing that keeps a character consistent, so
-- it is stored alongside the story and reused on retry.

-- AlterTable
ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "referenceImageUrl" TEXT;
