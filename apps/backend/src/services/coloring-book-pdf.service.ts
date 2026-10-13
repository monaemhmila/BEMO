import PDFDocument from "pdfkit";
export interface ColoringBookPage {
  pageNumber: number;
  image: Buffer;
  caption?: string | null;
}

/** Builds a standalone printable coloring-book PDF. */
export class ColoringBookPdfService {
  private drawFrame(document: PDFKit.PDFDocument, width: number, height: number, inset: number) {
    document.save();
    document.lineWidth(2).strokeColor("#000000");
    document.roundedRect(inset, inset, width - inset * 2, height - inset * 2, 14).stroke();
    document.lineWidth(0.75).roundedRect(inset + 9, inset + 9, width - inset * 2 - 18, height - inset * 2 - 18, 9).stroke();

    const dots = [
      [inset + 19, inset + 19], [width - inset - 19, inset + 19],
      [inset + 19, height - inset - 19], [width - inset - 19, height - inset - 19],
    ];
    document.lineWidth(1);
    for (const [x, y] of dots) document.circle(x, y, 4).stroke();
    document.restore();
  }

  async render(input: { title: string; childName?: string | null; pages: ColoringBookPage[] }): Promise<Buffer> {
    const document = new PDFDocument({ size: "LETTER", margin: 48 });
    const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    const finished = new Promise<Buffer>((resolve, reject) => {
      document.on("end", () => resolve(Buffer.concat(chunks)));
      document.on("error", reject);
    });

    const coverWidth = document.page.width;
    const coverHeight = document.page.height;
    this.drawFrame(document, coverWidth, coverHeight, 34);
    document.fontSize(12).font("Helvetica-Bold").text("MON PETIT HÉROS", 0, 105, { align: "center" });
    document.moveDown(1.8);
    document.fontSize(30).font("Helvetica-Bold").text(input.title, { align: "center" });
    document.moveDown(1);
    document.fontSize(18).font("Helvetica").text(
      `${input.childName || "My Hero"}'s Coloring Book`,
      { align: "center" },
    );
    document.moveDown(2);
    document.fontSize(14).font("Helvetica-Bold").text("Color every adventure!", { align: "center" });
    document.moveDown(1);
    document.fontSize(11).font("Helvetica").text("A special activity book made just for you", { align: "center" });
    document.fontSize(11).text("Name: ______________________________", 0, coverHeight - 120, { align: "center" });

    for (const page of input.pages) {
      document.addPage({ size: "LETTER", margin: 36 });
      const width = document.page.width;
      const height = document.page.height;
      this.drawFrame(document, width, height, 28);
      document.fontSize(10).font("Helvetica-Bold").fillColor("#000000").text(
        `${input.childName || "MY HERO"}  •  COLORING ADVENTURE`,
        52,
        43,
        { width: width - 104, align: "center" },
      );
      document.image(page.image, 62, 76, { fit: [width - 124, height - 170], align: "center", valign: "center" });
      document.fontSize(9).font("Helvetica").text(`PAGE ${page.pageNumber}`, 48, height - 57, { width: width - 96, align: "center" });
    }

    document.end();
    return finished;
  }
}

export const coloringBookPdfService = new ColoringBookPdfService();
