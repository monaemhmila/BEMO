-- Restrict story categories to the only three the product supports:
-- adventure, educative, sentimental.
--
-- Every existing StoryTemplate is normalised to 'adventure' for now, and CHECK
-- constraints make any other value impossible going forward. The Story rows
-- were already inside the allowed set, so that UPDATE is a no-op today; it is
-- kept so the constraint can never be added over out-of-range data.

UPDATE "StoryTemplate" SET "category" = 'adventure';
UPDATE "Story" SET "category" = 'adventure' WHERE "category" NOT IN ('adventure', 'educative', 'sentimental');
UPDATE "UserPreferences" SET "preferredCategory" = 'adventure' WHERE "preferredCategory" NOT IN ('adventure', 'educative', 'sentimental');

ALTER TABLE "Story" DROP CONSTRAINT IF EXISTS "Story_category_check";
ALTER TABLE "Story" ADD CONSTRAINT "Story_category_check"
  CHECK ("category" IN ('adventure', 'educative', 'sentimental'));

ALTER TABLE "StoryTemplate" DROP CONSTRAINT IF EXISTS "StoryTemplate_category_check";
ALTER TABLE "StoryTemplate" ADD CONSTRAINT "StoryTemplate_category_check"
  CHECK ("category" IN ('adventure', 'educative', 'sentimental'));

ALTER TABLE "UserPreferences" DROP CONSTRAINT IF EXISTS "UserPreferences_preferredCategory_check";
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_preferredCategory_check"
  CHECK ("preferredCategory" IN ('adventure', 'educative', 'sentimental'));

-- StoryCategoryEnum was left orphaned when Story.category and
-- StoryTemplate.category were widened to TEXT. No model references it any more.
DROP TYPE IF EXISTS "StoryCategoryEnum";
