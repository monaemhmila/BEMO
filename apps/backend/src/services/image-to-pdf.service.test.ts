import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import { imageBufferToA4Pdf } from "./image-to-pdf.service";

async function runTests() {
  console.log("--- START IMAGE TO A4 PDF TESTS ---");

  // Test 1: Valid 16:9 Grok image buffer (1920x1080)
  try {
    const grokImageBuf = await sharp({
      create: { width: 1920, height: 1080, channels: 3, background: { r: 30, g: 144, b: 255 } }
    }).jpeg().toBuffer();

    const pdfBytes = await imageBufferToA4Pdf(grokImageBuf);
    
    // Verify PDF structure with pdf-lib
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    console.log(`PASS: Created PDF document -> Page count: ${pages.length}, Dimensions: ${width.toFixed(2)} x ${height.toFixed(2)} pt, Size: ${pdfBytes.length} bytes`);
    
    if (Math.abs(width - 841.89) < 0.1 && Math.abs(height - 595.28) < 0.1) {
      console.log("PASS: Page dimensions match exact A4 landscape (841.89 x 595.28 pt)");
    } else {
      console.error(`FAIL: Page dimensions (${width} x ${height}) do not match expected A4 landscape!`);
    }
  } catch (err: any) {
    console.error("FAIL: Test 1 failed ->", err.message);
  }

  // Test 2: Invalid/empty buffer
  try {
    await imageBufferToA4Pdf(Buffer.from([]));
    console.error("FAIL: Empty buffer was NOT rejected!");
  } catch (err: any) {
    console.log("PASS: Empty buffer rejected correctly ->", err.message);
  }

  console.log("--- END IMAGE TO A4 PDF TESTS ---");
}

runTests();
