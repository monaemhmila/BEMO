import PDFDocument from "pdfkit";
export interface ColoringBookPage {
  pageNumber: number;
  image: Buffer;
}

/** Builds a standalone printable coloring-book PDF. */
export class ColoringBookPdfService {
  async render(input: { title: string; childName?: string | null; pages: ColoringBookPage[] }): Promise<Buffer> {
    const document = new PDFDocument({ size: "LETTER", margin: 48 });
    const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    const finished = new Promise<Buffer>((resolve, reject) => {
      document.on("end", () => resolve(Buffer.concat(chunks)));
      document.on("error", reject);
    });

    document.fontSize(26).font("Helvetica-Bold").text(input.title, { align: "center" });
    document.moveDown(1);
    document.fontSize(16).font("Helvetica").text(
      `${input.childName || "My Hero"}'s Coloring Book`,
      { align: "center" },
    );
    document.moveDown(2);
    document.fontSize(12).text("Color every adventure!", { align: "center" });

    for (const page of input.pages) {
      document.addPage({ size: "LETTER", margin: 36 });
      document.fontSize(10).fillColor("#000000").text(`Page ${page.pageNumber}`, { align: "right" });
      document.image(page.image, 54, 72, { fit: [504, 650], align: "center", valign: "center" });
    }

    document.end();
    return finished;
  }
}

export const coloringBookPdfService = new ColoringBookPdfService();
