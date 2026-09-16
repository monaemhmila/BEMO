import sharp from "sharp";
import { PDFDocument, PDFImage, PDFPage } from "pdf-lib";

/**
 * WHY COVER THEN CONTAIN IS USED INSTEAD OF A SINGLE STRETCH/FILL:
 * 1. Step 1 (Sharp Cover Crop): Cropping the source 16:9 image to exact A4 landscape aspect ratio (~1.414:1, e.g. 2481x1754 px)
 *    using fit: 'cover' ensures the image cleanly fills A4 proportions without stretching, warping, or altering facial features.
 * 2. Step 3 (PDF Contain Placement): Embedding into the A4 PDF canvas (841.89 x 595.28 points) using uniform aspect scaling
 *    (scale = min(pageWidth / imgWidth, pageHeight / imgHeight)) ensures 1:1 pixel rendering inside PDF point coordinates without distorting.
 * 3. Direct fill/stretch (page.drawImage with raw pageWidth and pageHeight without aspect scaling) distorts image geometry,
 *    causing ugly stretching across dimensions. The cover-then-contain approach guarantees zero geometric distortion at all stages.
 */

/** Target dimensions for A4 Landscape aspect ratio at ~300 DPI (2481 x 1754 px) */
const A4_LANDSCAPE_CROP_WIDTH = 2481;
const A4_LANDSCAPE_CROP_HEIGHT = 1754;

/** Standard A4 Landscape dimensions in PDF points (72 points/inch) */
const A4_LANDSCAPE_PDF_WIDTH = 841.89;
const A4_LANDSCAPE_PDF_HEIGHT = 595.28;

/**
 * Converts a Grok-generated 16:9 image buffer into an A4 landscape PDF page without any stretching or distortion.
 *
 * @param imageBuffer - The source image buffer (e.g. 16:9 Grok generated image)
 * @returns Promise resolving to Uint8Array containing the compiled PDF document bytes
 */
export async function imageBufferToA4Pdf(imageBuffer: Buffer): Promise<Uint8Array> {
  if (!imageBuffer || !(imageBuffer instanceof Buffer) || imageBuffer.length === 0) {
    throw new Error("Invalid input: imageBuffer must be a non-empty Node.js Buffer.");
  }

  // STEP 1: Crop the 16:9 image using Sharp with fit: 'cover' down to A4 landscape ratio (~1.414:1)
  let croppedBuffer: Buffer;
  try {
    croppedBuffer = await sharp(imageBuffer)
      .resize(A4_LANDSCAPE_CROP_WIDTH, A4_LANDSCAPE_CROP_HEIGHT, {
        fit: "cover",
        position: sharp.strategy.attention,
      })
      .jpeg({ quality: 95 })
      .toBuffer();
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Step 1 (Sharp Cover Crop to A4 Landscape ratio) failed: ${errorMsg}`);
  }

  // STEP 2: Use pdf-lib to create an A4 landscape PDF page (841.89 x 595.28 points)
  let pdfDoc: PDFDocument;
  let page: PDFPage;
  try {
    pdfDoc = await PDFDocument.create();
    page = pdfDoc.addPage([A4_LANDSCAPE_PDF_WIDTH, A4_LANDSCAPE_PDF_HEIGHT]);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Step 2 (PDF-lib Document/Page Creation) failed: ${errorMsg}`);
  }

  // STEP 3: Embed cropped image and place using a "contain" fit (aspect scaling & centering)
  try {
    const embeddedImage: PDFImage = await pdfDoc.embedJpg(croppedBuffer);

    const imgWidth = embeddedImage.width;
    const imgHeight = embeddedImage.height;

    // Calculate "contain" scale factor (preserves aspect ratio)
    const scale = Math.min(
      A4_LANDSCAPE_PDF_WIDTH / imgWidth,
      A4_LANDSCAPE_PDF_HEIGHT / imgHeight
    );

    const drawWidth = imgWidth * scale;
    const drawHeight = imgHeight * scale;

    // Center on the page
    const x = (A4_LANDSCAPE_PDF_WIDTH - drawWidth) / 2;
    const y = (A4_LANDSCAPE_PDF_HEIGHT - drawHeight) / 2;

    page.drawImage(embeddedImage, {
      x,
      y,
      width: drawWidth,
      height: drawHeight,
    });

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Step 3 (PDF Image Embedding/Placement) failed: ${errorMsg}`);
  }
}
