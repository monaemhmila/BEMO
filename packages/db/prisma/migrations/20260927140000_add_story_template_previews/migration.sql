-- Gallery previews for the book detail page. The storefront carousel was
-- previously hard-coded to filler "Preview N" slides because there was nowhere
-- to store real ones.
--
-- Shape: [{ "src": "https://...", "type": "image" | "video", "mimeType"?: "image/jpeg", "caption"?: "Page 3" }]
ALTER TABLE "StoryTemplate" ADD COLUMN "previews" JSONB;
