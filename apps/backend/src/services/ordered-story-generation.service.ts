import { prismaClient } from "../lib/prisma";
import { getPageAspectRatio, isSquareBookPage, getPageComposition } from "../contracts/storybook";
import { ImageGenerationService } from "./image-generation.service";
import { PDFService } from "./pdf.service";
import { saveBufferAsset } from "../lib/storage";
import { logger } from "../lib/logger";

const imageService = ImageGenerationService.getInstance();
const inProgress = new Set<string>();

/** Generate held artwork and the print PDF after admin confirmation. */
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

    await prismaClient.story.update({
      where: { id: storyId },
      data: { status: "Generating", pdfUrl: null, completedAt: null },
    });

    const totalPages = order.story.pages.length;
    const heldPages = order.story.pages.filter(
      (page) => page.pageNumber !== totalPages && page.status !== "Generated"
    );

    for (const page of heldPages) {
      try {
        const imageUrl = await imageService.generateImageSync({
          prompt: `${order.story.childName || "The child"} ${page.imagePrompt.trim()}`,
          aspectRatio: getPageAspectRatio(page.pageNumber, totalPages),
          imageUrl: order.story.referenceImageUrl || undefined,
          childName: order.story.childName || undefined,
          edgePlacementSide: isSquareBookPage(page.pageNumber, totalPages)
            ? undefined
            : getPageComposition(page.pageNumber, totalPages).characterSide,
        });
        await prismaClient.storyPage.update({
          where: { id: page.id },
          data: { imageUrl, status: "Generated", falAiRequestId: null },
        });
      } catch (error) {
        await prismaClient.storyPage.update({ where: { id: page.id }, data: { status: "Failed" } });
        throw error;
      }
    }

    const pages = await prismaClient.storyPage.findMany({ where: { storyId }, orderBy: { pageNumber: "asc" } });
    if (pages.some((page) => page.status !== "Generated" || !page.imageUrl)) {
      throw new Error("Some story illustrations could not be generated");
    }

    const pdfBuffer = await new PDFService().generateStorybookPdf(
      { title: order.story.title, dedication: order.story.dedication, childName: order.story.childName },
      pages.map((page) => ({ pageNumber: page.pageNumber, content: page.content, imagePrompt: page.imagePrompt, imageUrl: page.imageUrl }))
    );
    const pdfUrl = await saveBufferAsset(pdfBuffer, "pdfs", `${storyId}.pdf`, "application/pdf");
    await prismaClient.story.update({ where: { id: storyId }, data: { status: "Completed", completedAt: new Date(), pdfUrl } });
    logger.info({ orderId, storyId }, "Confirmed order artwork and PDF generated");
  } catch (error) {
    logger.error({ error, orderId, storyId }, "Failed to generate confirmed order artwork/PDF");
    if (storyId) await prismaClient.story.update({ where: { id: storyId }, data: { status: "Failed" } }).catch(() => undefined);
  } finally {
    inProgress.delete(orderId);
  }
}
