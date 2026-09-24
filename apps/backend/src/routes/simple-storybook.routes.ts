import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { imageGenerationService } from "../services/image-generation.service";
import {
  faceCanvasService,
  FaceReferences,
  getReferenceForPage,
} from "../services/face-canvas.service";
import { PDFService } from "../services/pdf.service";
import { logger } from "../lib/logger";
import { z } from "zod";

const router = Router();

// Request schema for the simplified storybook generation
const SimpleStorybookSchema = z.object({
  title: z.string().min(1),
  pages: z.array(
    z.object({
      content: z.string().min(1),
      prompt: z.string().min(1), // prompt for the image illustration
    })
  ).min(1),
  childImage: z.string().optional(), // base64 data URL of uploaded child image
});

/**
 * POST /simple
 * Generate a storybook PDF with on-the-fly image generation (no model training).
 * Returns the PDF as a binary stream.
 */
router.post("/simple", authMiddleware, async (req, res) => {
  const validation = SimpleStorybookSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      message: "Invalid input",
      errors: validation.error.flatten(),
    });
    return;
  }

  const { title, pages, childImage } = validation.data;

  try {
    // Generate the positioned face references ONCE per storybook from the
    // uploaded photo (local detection + white-canvas compositing), then upload
    // each canvas once so page calls reuse the URL instead of re-uploading
    // the raw child photo on every page.
    let storyRefs: FaceReferences | null = null;
    if (childImage) {
      try {
        const faceRefs = await faceCanvasService.generateFaceReferences(childImage);
        const [center, right, left] = await Promise.all([
          imageGenerationService.uploadReferenceImage(faceRefs.center),
          imageGenerationService.uploadReferenceImage(faceRefs.right),
          imageGenerationService.uploadReferenceImage(faceRefs.left),
        ]);
        storyRefs = { center, right, left };
        logger.info("Positioned face references generated and uploaded for storybook");
      } catch (err) {
        logger.warn({ err }, "Face reference generation failed; falling back to the raw child photo");
      }
    }

    // Generate images synchronously for each page
    const generatedPages = [] as {
      pageNumber: number;
      content: string;
      imageUrl?: string | null;
    }[];

    for (let i = 0; i < pages.length; i++) {
      const { content, prompt } = pages[i];
      const pageNumber = i + 1;
      let imageUrl: string | null = null;
      if (childImage) {
        // Cover uses the centered reference; later pages pick the side from
        // getPageComposition(pageNumber).characterSide so the reference framing
        // matches the requested character placement.
        const referenceUrl = storyRefs
          ? getReferenceForPage(storyRefs, pageNumber)
          : childImage;

        imageUrl = await imageGenerationService.generateImageSync({
          prompt,
          aspectRatio: "1:1",
          imageUrl: referenceUrl,
        });
      } else {
        imageUrl = await imageGenerationService.generateImageSync({
          prompt,
          aspectRatio: "1:1",
        });
      }
      generatedPages.push({
        pageNumber: i + 1,
        content,
        imageUrl: imageUrl || null,
      });
    }

    const pdfService = new PDFService();
    const pdfBuffer = await pdfService.generateStorybookPdf(
      { title },
      generatedPages.map(p => ({
        pageNumber: p.pageNumber,
        content: p.content,
        imageUrl: p.imageUrl,
      }))
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${title}.pdf"`);
    res.send(pdfBuffer);
    return;
  } catch (error) {
    logger.error({ error }, "Failed to generate simple storybook PDF");
    res.status(500).json({ message: "Error generating storybook" });
    return;
  }
});

export const simpleStorybookRouter = router;
