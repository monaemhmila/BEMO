-- Keep only the "Birthday Adventure and the Greedy Goblin" story template.
--
-- The catalogue now ships a single template, so every other PREDEFINED template
-- is removed. Templates created by users through POST /storybook/templates/custom
-- (source = 'CUSTOM') are user content, not catalogue entries, so they stay.
--
-- Stories already generated are left untouched. Any story pointing at a template
-- we are about to delete has its templateId set to NULL first, because
-- Story.templateId is a foreign key with no ON DELETE action and the delete
-- would otherwise be rejected.

-- 1. Detach stories that reference a template we are removing.
UPDATE "Story"
SET "templateId" = NULL
WHERE "templateId" IN (
    SELECT "id"
    FROM "StoryTemplate"
    WHERE "id" <> 'birthday-adventure-and-the-greedy-goblin'
      AND "source" = 'PREDEFINED'
);

-- 2. Remove the retired catalogue templates.
DELETE FROM "StoryTemplate"
WHERE "id" <> 'birthday-adventure-and-the-greedy-goblin'
  AND "source" = 'PREDEFINED';
