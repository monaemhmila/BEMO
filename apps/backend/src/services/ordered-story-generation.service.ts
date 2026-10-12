import { prismaClient } from "../lib/prisma";
import { logger } from "../lib/logger";
import { getPersonalizedGenerationSlots } from "../contracts/personalized-book-layout";
import { personalizedBookImageService } from "./personalized-book-image.service";
import { PDFService } from "./pdf.service";
import { saveBufferAsset } from "../lib/storage";
import { getPageAspectRatio, getPageComposition, isSquareBookPage } from "../contracts/storybook";
import { ImageGenerationService } from "./image-generation.service";

const inProgress = new Set<string>();
const legacyImageService = ImageGenerationService.getInstance();

/** Generate the held child pages and scene spreads after admin confirmation. */
export async function generateOrderedStory(orderId: string): Promise<void> {
  if (inProgress.has(orderId)) return;
  inProgress.add(orderId);

  let storyId: string | undefined;
  try {
    const order = await prismaClient.order.findUnique({
      where: { id: orderId },
      include: { story: { include: { pages: { orderBy: { pageNumber: "asc" } } } } },
    });
    if (!order || order.status === "CANCELLED") return;
    storyId = order.storyId;

    // Keep previously-created books printable. Only the new 30-square-page
    // layout uses the generation-slot logic below.
    if (order.story.pages.length !== 30) {
      await generateLegacyOrderedStory(order);
      return;
    }

    if (!order.story.referenceImageUrl) {
      throw new Error("CHILD_REFERENCE_REQUIRED");
    }

    await prismaClient.story.update({
      where: { id: storyId },
      data: { status: "Generating", pdfUrl: null, completedAt: null },
    });

    for (const slot of getPersonalizedGenerationSlots()) {
      const slotPages = order.story.pages.filter((page) => slot.pageNumbers.includes(page.pageNumber));
      if (slot.kind === "child") {
        const page = slotPages[0];
        if (!page || page.status === "Generated") continue;
        const imageUrl = await personalizedBookImageService.generateChildSquare({
          childName: order.story.childName || "the child",
          childAge: order.story.childAge,
          referenceImageUrl: order.story.referenceImageUrl,
          prompt: page.imagePrompt,
        });
        await prismaClient.storyPage.update({ where: { id: page.id }, data: { imageUrl, status: "Generated" } });
        continue;
      }

      const left = slotPages.find((page) => page.pageNumber === slot.pageNumbers[0]);
      const right = slotPages.find((page) => page.pageNumber === slot.pageNumbers[1]);
      if (!left || !right || (left.status === "Generated" && right.status === "Generated")) continue;

      const spread = await personalizedBookImageService.generateSceneSpread({
        prompt: `${left.imagePrompt}. ${right.imagePrompt}`,
      });
      await prismaClient.$transaction([
        prismaClient.storyPage.update({ where: { id: left.id, }, data: { imageUrl: spread.leftUrl, status: "Generated" } }),
        prismaClient.storyPage.update({ where: { id: right.id }, data: { imageUrl: spread.rightUrl, status: "Generated" } }),
      ]);
    }

    const pages = await prismaClient.storyPage.findMany({ where: { storyId }, orderBy: { pageNumber: "asc" } });
    if (pages.length !== 30 || pages.some((page) => page.status !== "Generated" || !page.imageUrl)) {
      throw new Error("PERSONALIZED_BOOK_ARTWORK_INCOMPLETE");
    }

    const pdfBuffer = await new PDFService().generateStorybookPdf(
      { title: order.story.title, dedication: order.story.dedication, childName: order.story.childName, language: order.story.language },
      pages.map((page) => ({ pageNumber: page.pageNumber, content: page.content, imagePrompt: page.imagePrompt, imageUrl: page.imageUrl }))
    );
    const pdfUrl = await saveBufferAsset(pdfBuffer, "pdfs", `${storyId}.pdf`, "application/pdf");
    await prismaClient.story.update({ where: { id: storyId }, data: { status: "Completed", completedAt: new Date(), pdfUrl } });
    logger.info({ orderId, storyId }, "Personalized 30-page book artwork and PDF generated");
  } catch (error) {
    logger.error({ error, orderId, storyId }, "Failed to generate personalized book");
    if (storyId) await prismaClient.story.update({ where: { id: storyId }, data: { status: "Failed" } }).catch(() => undefined);
  } finally {
    inProgress.delete(orderId);
  }
}

/** Compatibility path for orders created before the 30-page layout. */
async function generateLegacyOrderedStory(order: any): Promise<void> {
  const pages = order.story.pages as Array<{
    id: string;
    pageNumber: number;
    imagePrompt: string;
    imageUrl: string | null;
    status: string;
  }>;
  const totalPages = pages.length;
  for (const page of pages) {
    if (page.status === "Generated" && page.imageUrl) continue;
    if (page.pageNumber === totalPages) throw new Error("LEGACY_CLOSING_COVER_MISSING");
    const imageUrl = await legacyImageService.generateImageSync({
      prompt: `${order.story.childName || "The child"} ${page.imagePrompt}`,
      aspectRatio: getPageAspectRatio(page.pageNumber, totalPages),
      imageUrl: order.story.referenceImageUrl || undefined,
      childName: order.story.childName || undefined,
      edgePlacementSide: isSquareBookPage(page.pageNumber, totalPages)
        ? undefined
        : getPageComposition(page.pageNumber, totalPages).characterSide,
    });
    await prismaClient.storyPage.update({ where: { id: page.id }, data: { imageUrl, status: "Generated" } });
  }

  const completePages = await prismaClient.storyPage.findMany({ where: { storyId: order.storyId }, orderBy: { pageNumber: "asc" } });
  const pdfBuffer = await new PDFService().generateStorybookPdf(
    { title: order.story.title, dedication: order.story.dedication, childName: order.story.childName, language: order.story.language },
    completePages.map((page) => ({ pageNumber: page.pageNumber, content: page.content, imagePrompt: page.imagePrompt, imageUrl: page.imageUrl }))
  );
  const pdfUrl = await saveBufferAsset(pdfBuffer, "pdfs", `${order.storyId}.pdf`, "application/pdf");
  await prismaClient.story.update({ where: { id: order.storyId }, data: { status: "Completed", completedAt: new Date(), pdfUrl } });
  logger.info({ orderId: order.id, storyId: order.storyId }, "Legacy ordered story artwork and PDF generated");
}
