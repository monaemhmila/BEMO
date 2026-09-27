-- Storefront catalogue copy, so /books and the book detail pages render from the
-- database instead of a hard-coded list in the frontend.
ALTER TABLE "StoryTemplate" ADD COLUMN "tagline" TEXT,
ADD COLUMN "excerpt" TEXT,
ADD COLUMN "emoji" TEXT,
ADD COLUMN "audience" TEXT NOT NULL DEFAULT 'any',
ADD COLUMN "artStyle" TEXT,
ADD COLUMN "review" JSONB;
