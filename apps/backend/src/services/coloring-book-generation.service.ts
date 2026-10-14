import { prismaClient } from "../lib/prisma";
import { logger } from "../lib/logger";
import { coloringBookImageService } from "./coloring-book-image.service";
import { coloringBookPdfService } from "./coloring-book-pdf.service";
import type { ColoringBookPage } from "./coloring-book-pdf.service";

const COLOR_LESSON_PALETTE: Record<string, string> = {
  elephant: "blue",
  tiger: "yellow with black stripes",
  lion: "golden yellow with a brown mane",
  giraffe: "yellow with brown spots",
  zebra: "white with black stripes",
  monkey: "brown",
  bear: "brown",
  rabbit: "white or light gray",
  frog: "green",
  turtle: "green with a brown shell",
  parrot: "red, blue, and yellow",
  butterfly: "orange and blue",
  fish: "bright orange and blue",
  dolphin: "blue-gray",
  dog: "golden brown",
  cat: "orange with darker stripes",
  tree: "green leaves with a brown trunk",
  grass: "green",
  flowers: "red, yellow, and pink",
  sun: "yellow",
  sky: "light blue",
  clouds: "white or light gray",
  letter: "red, blue, or yellow",
  letters: "red, blue, and yellow",
  number: "orange",
  numbers: "orange, green, and purple",
  rocket: "red and white",
  castle: "purple with a red flag",
  boat: "blue with a red sail",
  map: "tan with a red path",
  book: "green with a yellow cover",
};

function buildColorGuide(scene: string, childName?: string | null): string {
  const lowerScene = scene.toLowerCase();
  const lessons = Object.entries(COLOR_LESSON_PALETTE)
    .filter(([element]) => new RegExp(`\\b${element}\\b`, "i").test(lowerScene))
    .slice(0, 5)
    .map(([element, color]) => `${element}: ${color}`);
  const child = `${childName || "the child"}: blue shirt and red shoes`;
  return [child, ...lessons, "Use bright, clear colors and color each named element carefully."].join(". ");
}

export interface ColoringBookGenerationInput {
  storyId: string;
  pageCount?: number;
}

/** Orchestrates only the admin coloring-book test flow. */
export async function generateAdminColoringBook(input: ColoringBookGenerationInput): Promise<Buffer> {
  const story = await prismaClient.story.findUnique({
    where: { id: input.storyId },
    select: {
      id: true,
      title: true,
      childName: true,
      referenceImageUrl: true,
      pages: { orderBy: { pageNumber: "asc" }, select: { pageNumber: true, imagePrompt: true, content: true } },
    },
  });

  if (!story) throw new Error("STORY_NOT_FOUND");
  if (!story.referenceImageUrl) throw new Error("STORY_HAS_NO_REFERENCE_IMAGE");

  // This admin experiment always represents the complete coloring-book workflow.
  // Ignore smaller legacy requests so a partial PDF cannot be mistaken for a
  // finished 14-page coloring book.
  const pageCount = 14;
  const sourcePages = story.pages.slice(0, pageCount);
  if (sourcePages.length < pageCount) throw new Error("STORY_NEEDS_14_PAGES");

  const cover = await coloringBookImageService.generateCover({
    childName: story.childName,
    title: story.title,
    scene: sourcePages[0]?.imagePrompt || sourcePages[0]?.content || "A joyful magical adventure",
    referenceImageUrl: story.referenceImageUrl,
  });

  const pages: ColoringBookPage[] = [];
  for (const [index, page] of sourcePages.entries()) {
    const scene = page.imagePrompt || page.content || "A joyful storybook adventure scene";
    const colorGuide = buildColorGuide(scene, story.childName);
    const image = await coloringBookImageService.generatePage({
      childName: story.childName,
      scene: `${scene}. COLOR LESSON FOR THIS PAGE: ${colorGuide}`,
      referenceImageUrl: story.referenceImageUrl,
      pageNumber: index + 1,
    });
    pages.push({ pageNumber: index + 1, image, caption: page.content?.slice(0, 220), colorGuide });
  }

  logger.info({ storyId: story.id, pageCount: pages.length }, "Admin coloring book generated");
  return coloringBookPdfService.render({ title: story.title, childName: story.childName, cover, pages });
}
