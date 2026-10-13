import { prismaClient } from "../lib/prisma";
import { logger } from "../lib/logger";
import { coloringBookImageService } from "./coloring-book-image.service";
import { coloringBookPdfService } from "./coloring-book-pdf.service";
import type { ColoringBookPage } from "./coloring-book-pdf.service";

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

  const pageCount = Math.min(Math.max(input.pageCount ?? 6, 1), 12);
  const sourcePages = story.pages.slice(0, pageCount);
  if (!sourcePages.length) throw new Error("STORY_HAS_NO_PAGES");

  const pages: ColoringBookPage[] = [];
  for (const page of sourcePages) {
    const image = await coloringBookImageService.generatePage({
      childName: story.childName,
      scene: page.imagePrompt,
      referenceImageUrl: story.referenceImageUrl,
      pageNumber: page.pageNumber,
    });
    pages.push({ pageNumber: page.pageNumber, image, caption: page.content });
  }

  logger.info({ storyId: story.id, pageCount: pages.length }, "Admin coloring book generated");
  return coloringBookPdfService.render({ title: story.title, childName: story.childName, pages });
}
