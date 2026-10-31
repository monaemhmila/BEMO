-- Retire the old goblin catalogue template and replace it with the requested
-- third-birthday three-wishes story. Existing generated books are preserved;
-- their template relation is detached before the catalogue row is removed.

UPDATE "Story"
SET "templateId" = NULL
WHERE "templateId" = 'birthday-adventure-and-the-greedy-goblin';

DELETE FROM "StoryTemplate"
WHERE "id" = 'birthday-adventure-and-the-greedy-goblin';

-- Make the replacement safe if the new seed was run manually before the
-- migration was deployed.
UPDATE "Story"
SET "templateId" = NULL
WHERE "templateId" = 'third-birthday-three-wishes';

DELETE FROM "StoryTemplate"
WHERE "id" = 'third-birthday-three-wishes';

INSERT INTO "StoryTemplate" (
  "id", "name", "description", "ageRange", "category", "prompts",
  "sampleImage", "coverImage", "isActive", "difficulty", "tags", "source",
  "ownerUserId", "tagline", "excerpt", "emoji", "audience", "artStyle",
  "review", "previews", "createdAt", "updatedAt"
)
VALUES (
  'third-birthday-three-wishes',
  'Three Wishes on My Birthday',
  'On their third birthday, the child discovers three magical stars and makes three wishes: colorful balloons, a giant cake, and a joyful celebration with everyone they love.',
  '2-4',
  'sentimental',
  $json${
    "theme": "a magical third birthday adventure where the child discovers three glowing stars and makes three wishes with a friendly talking bunny",
    "moralLesson": "The greatest gift is love, not presents. True happiness comes from sharing special moments, being kind, and celebrating with family and friends.",
    "educationalFocus": "Recognizing the number three, practicing kindness, sharing joy, and understanding that loving relationships matter more than possessions.",
    "worldContext": "A magical garden filled with colorful flowers, rainbows, floating balloons, sparkling stars, and friendly animals, ending in a surprise birthday party.",
    "beats": [
      "On the child's third birthday, the family prepares a joyful celebration in a magical flower garden.",
      "The child meets a friendly talking bunny who reveals three glowing stars hidden among the flowers.",
      "The first star grants the first wish: colorful balloons float into the garden and fill the sky with joy.",
      "The child and bunny count the balloons together and laugh as the animals chase their dancing ribbons.",
      "The second star grants the second wish: a giant birthday cake appears with three bright candles.",
      "A baby elephant, teddy bear, and friendly animals help decorate the cake and prepare a beautiful table.",
      "The child learns that a wish feels even more special when it brings happiness to everyone nearby.",
      "The child and the bunny discover the third star glowing above a rainbow path.",
      "The child makes the final wish: to celebrate with everyone they love, not just to receive more presents.",
      "The magical garden transforms as family and friends arrive with hugs, music, flowers, and gentle laughter.",
      "The child welcomes every guest kindly and shares the balloons, cake, and garden treasures with the animals.",
      "Everyone gathers around the giant cake and sings while the child looks at the three glowing stars.",
      "The child blows out the three candles and realizes that love made the birthday wish come true.",
      "The family and friends celebrate together under the rainbow while the bunny reminds the child that shared moments are precious.",
      "The child falls asleep happy, knowing the greatest birthday gift is being surrounded by people and friends who love them."
    ]
  }$json$::jsonb,
  NULL,
  '/templates/third-birthday-three-wishes/cover.png',
  TRUE,
  1,
  ARRAY['birthday', 'wishes', 'family', 'love', 'bunny', 'animals', '3rd birthday'],
  'PREDEFINED',
  NULL,
  'Three magical stars, three wishes, and a birthday full of love!',
  'On their third birthday, the child discovers three glowing stars in a magical garden. With a talking bunny, they wish for balloons, a giant cake, and one wonderful surprise: a party with everyone they love.',
  '🎂',
  'any',
  'photorealistic children''s storybook photography with gentle magical wonder',
  $json${"rating":5,"count":0,"quote":"A tender birthday keepsake about the people and moments that matter most.","author":"Mon Petit Hero"}$json$::jsonb,
  $json$[
    {"src":"/templates/third-birthday-three-wishes/preview-1.png","type":"image","mimeType":"image/png","caption":"Three glowing stars appear in the magical garden."},
    {"src":"/templates/third-birthday-three-wishes/preview-2.png","type":"image","mimeType":"image/png","caption":"The child makes a wish with the friendly talking bunny."},
    {"src":"/templates/third-birthday-three-wishes/preview-3.png","type":"image","mimeType":"image/png","caption":"Everyone gathers for a joyful birthday celebration."}
  ]$json$::jsonb,
  NOW(),
  NOW()
);
