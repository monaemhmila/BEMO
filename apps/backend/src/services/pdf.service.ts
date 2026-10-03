import PDFDocument from "pdfkit";
import path from "path";
import fs, { existsSync } from "fs";
import {
  getPageType,
  getPageTextLayout,
} from "../contracts/storybook";
import {
  splitForBookPage,
  BookPageImage,
} from "../utils/split16x9IntoTwoSquares";
import { safeFetchAndValidateImage, validateImageBuffer } from "../lib/safe-image-fetcher";
import { logger } from "../lib/logger";

interface StoryPagePayload {
  pageNumber: number;
  content: string;
  imageUrl?: string | null;
}

/* A story page whose 16:9 image is available produces TWO leaves (left square
 * then right square); a 1:1 source (cover / closing) is already the exact
 * printed square page and produces a single full-bleed leaf. Pages without an
 * image produce a single fallback leaf. */
interface PdfLeaf {
  pageNumber: number;
  content: string;
  image: Buffer | null;
  renderText: boolean;
}

interface StoryPayload {
  title: string;
  dedication?: string | null;
  childName?: string | null;
}

// --- Kid-friendly palette -------------------------------------------------
const PAGE_BACKGROUND = "#FFF9F0";
const STORY_TEXT_COLOR = "#FFFFFF";
const STORY_TEXT_SHADOW = "#000000";
const STORY_TEXT_OUTLINE = "#1A2235";


// Exact A4 landscape page size in points (297 x 210 mm), shared with the
// contracts so the image pipeline and PDF layout stay in lockstep. Every
// story ships as exactly 15 pages - page 1 is the full-bleed cover with a
// PDF-rendered title, pages 2-13 carry the story, page 14 the emotional
// ending and page 15 the closing.
const PAGE_WIDTH = 595.28; // 210mm square
const PAGE_HEIGHT = 595.28; // 210mm square

// --- Web reader parity ------------------------------------------------------
// `reader.css` and StoryBookCover.tsx express the cover in container query
// units (`cqw`), which resolve against the leaf's own width, plus a few
// `rem`/`px` values. A PDF page is a fixed box, so 1cqw is 1% of the page
// width and every CSS length is converted to points at 96dpi (1px = 0.75pt).
// Each constant below quotes the CSS it mirrors. PDFKit has no gradients or
// blurs, so the soft edges are fanned out as thin low-opacity passes.
const WEB_CQW = PAGE_WIDTH / 100; // 5.9528pt
const WEB_PX = 0.75; // 1 CSS px, in points

/** `.is-cover::after` - the white hairline border inset on the cover leaf. */
const COVER_FRAME = {
  inset: 0.02 * PAGE_WIDTH, // inset: 2% -> 11.9pt
  lineWidth: Math.max(2 * WEB_PX, 0.4 * WEB_CQW), // max(2px, 0.4cqw) -> 2.38pt
  opacity: 0.6, // rgba(255, 255, 255, 0.6)
  radius: 3 * WEB_PX, // border-radius: 3px
};

/**
 * `StoryBookCover.tsx` - the outside-cover overlay. The generated artwork
 * stays the hero and this is drawn on top of it, exactly as the reader does,
 * so the printed book and the screen show the same title block.
 */
const COVER_TITLE = {
  top: 0.07 * PAGE_HEIGHT, // top-[7%]
  sidePad: 0.08 * PAGE_WIDTH, // px-[8%]
  fontSize: 4.2 * WEB_CQW, // clamp(1rem, 4.2cqw, 2.2rem) -> 25.0pt
  leading: 1.25, // leading-tight
  shadowOpacity: 0.7, // 0 2px 12px rgba(0, 0, 0, 0.7)
  shadowOffsetY: 2 * WEB_PX, // 2px
  shadowBlur: 12 * WEB_PX, // 12px
  starring: {
    size: 1.5 * WEB_CQW, // clamp(0.45rem, 1.5cqw, 0.85rem) -> 8.93pt
    marginTop: 1.4 * WEB_CQW, // mt-[1.4cqw]
    leading: 1.3,
    tracking: 0.28, // tracking-[0.28em]
    color: "#FFC83D", // text-buttercup
    shadowOpacity: 0.6, // 0 1px 6px rgba(0, 0, 0, 0.6)
  },
  footer: {
    bottom: 0.04 * PAGE_HEIGHT, // bottom-[4%]
    dedicationSize: 1.8 * WEB_CQW, // clamp(0.55rem, 1.8cqw, 1rem) -> 10.7pt
    dedicationLeading: 1.375, // leading-snug
    pillSize: 1.2 * WEB_CQW, // clamp(0.4rem, 1.2cqw, 0.75rem) -> 7.14pt
    pillTracking: 0.3, // tracking-[0.3em]
    pillPadX: 0.02 * PAGE_WIDTH, // px-[2%]
    pillPadY: 0.8 * WEB_CQW, // py-[0.8cqw]
    pillColor: "#000000", // bg-black/35
    pillOpacity: 0.35,
  },
  scrim: {
    // bg-gradient-to-b from-black/45 via-transparent to-black/55
    topOpacity: 0.45,
    bottomOpacity: 0.55,
  },
};

// --- Fonts -----------------------------------------------------------------
// Fredoka One = big, bubbly display font. It is used for the cover title *and*
// for every piece of body text (story pages, ending, closing), mirroring the
// web reader, which renders the caption in the same display face
// (`font-display` -> --font-fredoka) in `reader.css`. PDFKit's bundled fonts
// are the fallback if the .ttf files are not copied into the deployment.
//
// Place the .ttf files that ship alongside this service in a `fonts/`
// folder next to this file (or update FONT_DIR below to wherever you keep
// them). Make sure your build step copies non-.ts assets like fonts into
// your dist/ output, or the paths below won't resolve at runtime.
const FONT_DIR = [
  path.join(__dirname, "../fonts"),
  path.join(process.cwd(), "src/fonts"),
  path.join(process.cwd(), "apps/backend/src/fonts"),
].find((directory) => existsSync(path.join(directory, "FredokaOne-Regular.ttf"))) || path.join(__dirname, "../fonts");
const FONTS = {
  title: path.join(FONT_DIR, "FredokaOne-Regular.ttf"),
  bodyRegular: path.join(FONT_DIR, "FredokaOne-Regular.ttf"),
  bodySemiBold: path.join(FONT_DIR, "FredokaOne-Regular.ttf"),
  bodyBold: path.join(FONT_DIR, "FredokaOne-Regular.ttf"),
  bodyExtraBold: path.join(FONT_DIR, "FredokaOne-Regular.ttf"),
};

// --- Page artwork download -------------------------------------------------
// Story art lives on fal's CDN, which can be slow to reach from some networks:
// a single 16:9 page here is ~5.5 MB and has been observed to take the better
// part of a minute. `fetch` inherits undici's 10s *connect* timeout, which
// every one of those pages blows through, and because a failed image used to
// degrade silently the whole book came out with no artwork at all. So the
// budget is explicit, slow hosts get a second attempt, and downloads are
// throttled instead of opening one 5.5 MB stream per page at once.
const IMAGE_FETCH_TIMEOUT_MS = 120_000;
const IMAGE_FETCH_ATTEMPTS = 2;
const IMAGE_FETCH_CONCURRENCY = 4;

/**
 * `Promise.all` over every page opens N simultaneous multi-megabyte downloads
 * and starves them all. Keep a small fixed number in flight instead.
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  run: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await run(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Download one page image, retrying once so a dropped connection or a brief
 * CDN hiccup does not cost the page its artwork. Protected against SSRF and
 * decompression bombs via safeFetchAndValidateImage.
 */
async function downloadImage(url: string): Promise<Buffer> {
  // If local asset URL, load securely from assets directory without network requests
  if (url.includes("/assets/")) {
    try {
      const marker = "/assets/";
      const assetRelative = url.slice(url.indexOf(marker) + marker.length);
      const safeRelative = path.normalize(assetRelative).replace(/^(\.\.[\/\\])+/, "");
      const fullPath = path.join(process.cwd(), "assets", safeRelative);
      const localCandidates = [
        fullPath,
        path.join(process.cwd(), "src", safeRelative),
        path.join(process.cwd(), "apps", "backend", "src", safeRelative),
      ];
      for (const candidate of localCandidates) {
        if (!existsSync(candidate)) continue;
        const fileBuf = fs.readFileSync(candidate);
        const validated = await validateImageBuffer(fileBuf);
        return validated.buffer;
      }
    } catch (err) {
      logger.warn({ error: (err as Error).message, url }, "Could not read local asset for PDF");
    }
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= IMAGE_FETCH_ATTEMPTS; attempt += 1) {
    try {
      const validated = await safeFetchAndValidateImage(url);
      return validated.buffer;
    } catch (error) {
      lastError = error;
      if (attempt < IMAGE_FETCH_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }
  }
  throw lastError;
}

/**
 * Download the generated page image and split it for the book. A 16:9 image
 * becomes two equal square crops (left + right), vertically centered; a 1:1
 * image (cover / closing pages) stays whole as a single square. The source is
 * never modified and no stretching/distortion happens.
 */
async function fetchSplitPageImages(url: string): Promise<BookPageImage | null> {
  try {
    // Inline art needs no network at all.
    if (url.startsWith("data:")) {
      const base64Data = url.split(",")[1];
      if (!base64Data) return null;
      return await splitForBookPage(Buffer.from(base64Data, "base64"));
    }
    return await splitForBookPage(await downloadImage(url));
  } catch (error) {
    // One concise line per page; the caller reports the overall tally.
    console.error(
      `Failed to fetch story page image: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
}

export class PDFService {
  private readonly customFontsAvailable = Object.values(FONTS).every(existsSync);

  async generateStorybookPdf(
    story: StoryPayload,
    pages: StoryPagePayload[],
    onWarning?: (message: string) => void
  ): Promise<Buffer> {
    // Render exactly the pages provided for this story: keep the first page for
    // each page number in order, ignore any duplicate/extra pages that may exist
    // in an old story, and pad any gaps with blank placeholders so the book layout
    // always matches the generated story page count.
    const byPageNumber = new Map<number, StoryPagePayload>();
    [...pages]
      .sort((a, b) => a.pageNumber - b.pageNumber)
      .forEach((page) => {
        if (!byPageNumber.has(page.pageNumber)) byPageNumber.set(page.pageNumber, page);
      });

    const sortedPages: StoryPagePayload[] = Array.from(
      { length: Math.max(0, ...[...byPageNumber.keys()]) },
      (_, index) => {
        const pageNumber = index + 1;
        return (
          byPageNumber.get(pageNumber) || {
            pageNumber,
            content: "",
            imageUrl: null,
          }
        );
      }
    );

    const splitImages = await mapWithConcurrency(sortedPages, IMAGE_FETCH_CONCURRENCY, (page) =>
      page.imageUrl ? fetchSplitPageImages(page.imageUrl) : Promise.resolve(null)
    );

    // Never let a book go out looking finished when its artwork is missing:
    // collect the offenders and say so once, loudly, instead of only logging
    // a stack trace per page. A page that never had an imageUrl is not a
    // failure - it legitimately falls back to a text-only leaf.
    const missingArt = sortedPages
      .filter((page, index) => Boolean(page.imageUrl) && !splitImages[index])
      .map((page) => page.pageNumber);
    if (missingArt.length > 0) {
      const message =
        `PDF for "${story.title}" is missing artwork on ${missingArt.length} of ` +
        `${sortedPages.length} pages (page numbers: ${missingArt.join(", ")}). ` +
        `The image host was unreachable; the book was rendered without those illustrations.`;
      console.error(message);
      onWarning?.(message);
      throw new Error(message);
    }

    // A 16:9 story page becomes two PDF leaves (left square, then right square).
    // A 1:1 source (cover / closing) is already the exact page shape and stays a
    // single full-bleed leaf. Pages without an image collapse to one fallback leaf.
    const leaves: PdfLeaf[] = [];
    sortedPages.forEach((page, index) => {
      const split = splitImages[index];
      if (split?.left && split.right) {
        leaves.push({ pageNumber: page.pageNumber, content: page.content, image: split.left, renderText: true });
        leaves.push({ pageNumber: page.pageNumber, content: "", image: split.right, renderText: false });
      } else if (split?.full) {
        leaves.push({ pageNumber: page.pageNumber, content: page.content, image: split.full, renderText: true });
      } else {
        leaves.push({ pageNumber: page.pageNumber, content: page.content, image: null, renderText: true });
      }
    });

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: [PAGE_WIDTH, PAGE_HEIGHT], // 210mm square page
        margin: 0,
        bufferPages: true,
        info: {
          Title: story.title,
          Author: "Mon Petit Hero",
          Subject: "A personalized children's storybook",
          Creator: "Mon Petit Hero",
        },
      });
      const buffers: Buffer[] = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      this.registerFonts(doc);
      // Page 1 is the full-bleed cover; page 14 the emotional ending and
      // page 15 the closing have their own centered layouts. Everything in
      // between is a regular story page. Each leaf uses a square crop of the
      // generated 16:9 image drawn full-bleed into the square page.
      leaves.forEach((leaf, index) => {
        if (index > 0) {
          doc.addPage();
        }
        const totalBookPages = sortedPages.length;
        const pageType = getPageType(leaf.pageNumber, totalBookPages);
        switch (pageType) {
          case "cover":
            this.renderCoverPage(doc, leaf, story);
            break;
          case "ending":
            this.renderEndingPage(doc, leaf, totalBookPages);
            break;
          case "closing":
            this.renderClosingPage(doc, leaf, totalBookPages);
            break;
          default:
            this.renderStoryPage(doc, leaf);
        }
        // The cover's hairline frame sits above the artwork, matching the
        // reader's z-index. Nothing else is drawn over the interior pages.
        if (pageType === "cover") {
          this.drawCoverFrame(doc, PAGE_WIDTH, PAGE_HEIGHT);
        }
      });
      doc.end();
    });
  }

  /**
   * Generate an empty/sample storybook PDF layout preview for admin testing
   */
  async generateEmptyPreviewPdf(title = "Empty Storybook Layout Preview"): Promise<Buffer> {
    const samplePages: StoryPagePayload[] = [
      {
        pageNumber: 1,
        content: "Cover - full-bleed  with a PDF-rendered title at the top center.",
        imageUrl: null,
      },
      {
        pageNumber: 2,
        content: "Opening page - text placed in the bottom-left text-safe area, white with a soft shadow.",
        imageUrl: null,
      },
      {
        pageNumber: 3,
        content: "Story page - text placed in the bottom-right text-safe area, white with a soft shadow.",
        imageUrl: null,
      },
    ];

    return this.generateStorybookPdf(
      {
        title,
        dedication: "",
      },
      samplePages
    );
  }

  private registerFonts(doc: PDFKit.PDFDocument) {
    // Font assets are optional in production deployments. The visual hierarchy
    // remains intact with PDFKit's bundled fonts if a deployment has not copied them.
    if (!this.customFontsAvailable) return;
    doc.registerFont("Title", FONTS.title);
    doc.registerFont("BodyRegular", FONTS.bodyRegular);
    doc.registerFont("BodySemiBold", FONTS.bodySemiBold);
    doc.registerFont("BodyBold", FONTS.bodyBold);
    doc.registerFont("BodyExtraBold", FONTS.bodyExtraBold);
  }

  /**
   * Full-bleed cover: the illustration fills the entire page and the reader's
   * outside-cover overlay (scrim, title, "Starring", dedication) is drawn on
   * top of it. No body text.
   */
  private renderCoverPage(
    doc: PDFKit.PDFDocument,
    leaf: PdfLeaf,
    story: StoryPayload
  ) {
    const { width, height } = doc.page;
    this.paintBackground(doc, width, height, "cover");
    this.drawPageImage(doc, leaf.image, width, height);
    if (leaf.renderText) {
      this.drawCoverTitle(doc, story, width, height);
    }
  }

  /**
   * Regular story page (pages 2-14): full-bleed square illustration, story
   * text placed in the deterministic text-safe area for this page number.
   */
  private renderStoryPage(
    doc: PDFKit.PDFDocument,
    leaf: PdfLeaf
  ) {
    const { width, height } = doc.page;
    this.paintBackground(doc, width, height, "page");
    this.drawPageImage(doc, leaf.image, width, height);
    if (leaf.renderText) {
      this.drawStoryText(doc, leaf.pageNumber, leaf.content);
    }
  }

  /**
   * Emotional ending (page 15): full-bleed square illustration with the closing
   * thought placed at the bottom-center text-safe area.
   */
  private renderEndingPage(
    doc: PDFKit.PDFDocument,
    leaf: PdfLeaf,
    totalPages: number
  ) {
    const { width, height } = doc.page;
    this.paintBackground(doc, width, height, "page");
    this.drawPageImage(doc, leaf.image, width, height);
    this.drawStoryText(doc, leaf.pageNumber, leaf.content, totalPages);
  }

  /**
   * Closing page (page 15): full-bleed square illustration with a short, warm
   * goodbye centered in the lower middle of the page.
   */
  private renderClosingPage(
    doc: PDFKit.PDFDocument,
    leaf: PdfLeaf,
    totalPages: number
  ) {
    const { width, height } = doc.page;
    this.paintBackground(doc, width, height, "page");
    this.drawPageImage(doc, leaf.image, width, height);
    this.drawStoryText(doc, leaf.pageNumber, leaf.content, totalPages);
  }

  /**
   * The cover's hairline frame, mirroring the `border` half of
   * `.is-cover::after`: a white border inset 2% of the page.
   */
  private drawCoverFrame(doc: PDFKit.PDFDocument, width: number, height: number) {
    const { inset, radius } = COVER_FRAME;
    doc
      .roundedRect(inset, inset, width - inset * 2, height - inset * 2, radius)
      .lineWidth(COVER_FRAME.lineWidth)
      .strokeColor("#FFFFFF")
      .strokeOpacity(COVER_FRAME.opacity)
      .stroke("#FFFFFF");
    doc.strokeOpacity(0);
  }

  /**
   * Place the cover-cropped image so it fills every pixel of the page.
   * The buffer is already cover-cropped to the exact A4 landscape aspect,
   * so drawing it at 0,0 stretched to the page size never distorts it.
   */
  private drawPageImage(
    doc: PDFKit.PDFDocument,
    image: Buffer | null,
    width: number,
    height: number
  ) {
    if (image) {
      doc.image(image, 0, 0, { width, height });
      return;
    }

    this.font(doc, "BodyRegular", "Helvetica").fontSize(16).fillColor(STORY_TEXT_COLOR).text(
      " on its way!",
      0,
      height / 2 - 8,
      { width, align: "center" }
    );
  }

  /**
   * Render the story text for a page using the shared PageTextLayout:
   * font size, position, wrapping width, alignment and line height are all
   * derived from the page number via the contracts, keeping the PDF layout
   * identical to the text-safe area the image generator was told to reserve.
   */
  private drawStoryText(doc: PDFKit.PDFDocument, pageNumber: number, text: string, totalPages = 15) {
    const layout = getPageTextLayout(pageNumber, totalPages);
    const cleanText = (text || "").trim();
    if (!cleanText) return;

    const baseFont = this.customFontsAvailable ? "BodyRegular" : "Helvetica";
    this.font(doc, baseFont, "Helvetica").fontSize(layout.fontSize);

    const options: PDFKit.Mixins.TextOptions = {
      width: 500,
      height: Math.round(layout.maxLines * layout.lineHeight),
      align: layout.align,
      lineGap: layout.lineHeight - layout.fontSize,
      characterSpacing: 0.2,
      ellipsis: true,
      lineBreak: true,
    };

    this.drawTextWithShadow(doc, cleanText, 50, layout.y, options, layout);
  }

  /**
   * Draw text in white with a soft dark halo, mirroring the web reader's
   * `text-shadow: 0 1px 8px rgba(0, 0, 0, 0.75)`. PDFKit has no blur, so the
   * blur is fanned out as a stack of offset passes whose opacity decays with
   * distance: they accumulate into a tight dark core that fades to nothing
   * `BLUR_SPREAD` points away. A thin outline pass follows to keep the glyphs
   * crisp over light artwork, then the solid white fill goes on top.
   */
  private drawTextWithShadow(
    doc: PDFKit.PDFDocument,
    text: string,
    x: number,
    y: number,
    options: PDFKit.Mixins.TextOptions,
    layout: { glowOpacity: number; shadowOffsetX: number; shadowOffsetY: number; shadowOpacity: number }
  ) {
    // 8px of CSS blur at 96dpi is 6pt; the 1px y-offset is 0.75pt.
    const BLUR_PASSES = 6;
    const BLUR_SPREAD = 6;

    for (let i = 1; i <= BLUR_PASSES; i += 1) {
      const t = i / BLUR_PASSES;
      doc
        .fillColor(STORY_TEXT_SHADOW)
        .fillOpacity(layout.shadowOpacity * Math.pow(1 - t, 1.6))
        .text(text, x + layout.shadowOffsetX * 0.4 * t, y + BLUR_SPREAD * t, options);
      doc.fillOpacity(1);
    }

    // Thin crisp outline
    doc
      .lineWidth(Math.max(1.2, layout.glowOpacity * 3))
      .strokeColor(STORY_TEXT_OUTLINE)
      .fillColor(STORY_TEXT_SHADOW)
      .text(text, x, y, { ...options, stroke: true });
    doc.fillOpacity(1);

    // Solid white fill on top
    doc
      .fillColor(STORY_TEXT_COLOR)
      .text(text, x, y, options);
  }

  /**
   * The outside-cover overlay, mirroring `StoryBookCover.tsx`: a top-to-bottom
   * scrim so the type stays readable over any artwork, then the title, the
   * "Starring ..." credit, and either the dedication or the Mon Petit Hero pill.
   *
   * CSS reaches the scrim with `bg-gradient-to-b from-black/45 via-transparent
   * to-black/55`. PDFKit has no gradient fill, so it is approximated with
   * horizontal strips whose alpha interpolates 0.45 -> 0 -> 0.55 top to bottom.
   */
  private drawCoverTitle(
    doc: PDFKit.PDFDocument,
    story: StoryPayload,
    width: number,
    height: number
  ) {

    const contentWidth = width - COVER_TITLE.sidePad * 2;
    let y = COVER_TITLE.top;

    const title = (story.title ?? "").trim();
    if (title) {
      this.font(doc, "Title", "Helvetica-Bold").fontSize(COVER_TITLE.fontSize);
      y = this.drawCoverLine(doc, title, {
        x: COVER_TITLE.sidePad,
        y,
        width: contentWidth,
        align: "center",
        fontSize: COVER_TITLE.fontSize,
        color: STORY_TEXT_COLOR,
        lineHeight: COVER_TITLE.fontSize * COVER_TITLE.leading, // leading-tight
        shadowOpacity: COVER_TITLE.shadowOpacity,
        shadowOffsetY: COVER_TITLE.shadowOffsetY,
        shadowBlur: COVER_TITLE.shadowBlur,
      });
    }

    const childName = (story.childName ?? "").trim();
    if (childName) {
      const star = COVER_TITLE.starring;
      this.font(doc, "BodySemiBold", "Helvetica-Bold").fontSize(star.size);
      y += star.marginTop;
      y = this.drawCoverLine(doc, `STARRING ${childName.toUpperCase()}`, {
        x: COVER_TITLE.sidePad,
        y,
        width: contentWidth,
        align: "center",
        fontSize: star.size,
        color: star.color,
        tracking: star.tracking,
        lineHeight: star.size * star.leading,
        shadowOpacity: star.shadowOpacity,
        shadowOffsetY: 1 * WEB_PX,
        shadowBlur: 6 * WEB_PX,
      });
    }

    const dedication = (story.dedication ?? "").trim();
    const footer = COVER_TITLE.footer;
    if (dedication) {
      const quote = `\u201C${dedication}\u201D`;
      this.font(doc, "Title", "Helvetica-Oblique").fontSize(footer.dedicationSize);
      const lineHeight = footer.dedicationSize * footer.dedicationLeading; // leading-snug
      // The reader pins this block with `bottom-[4%]`, so a dedication that
      // wraps grows *upward*. PDFKit text grows downward, so measure first and
      // lift the start point by the block's real height.
      const blockHeight = doc.heightOfString(quote, {
        width: contentWidth,
        align: "center",
        lineGap: lineHeight - footer.dedicationSize,
        lineBreak: true,
      });
      this.drawCoverLine(doc, quote, {
        x: COVER_TITLE.sidePad,
        y: height - footer.bottom - blockHeight,
        width: contentWidth,
        align: "center",
        fontSize: footer.dedicationSize,
        color: STORY_TEXT_COLOR,
        opacity: 0.9,
        lineHeight,
        shadowOpacity: 0.7,
        shadowOffsetY: 1 * WEB_PX,
        shadowBlur: 8 * WEB_PX,
      });
      return;
    }

    // No dedication: the reader shows a rounded "Mon Petit Hero" pill instead.
    // The pill's `BookOpen` lucide glyph is not reproduced - PDFKit has no
    // equivalent path - so the label is centred in the pill on its own.
    const label = "Mon Petit Hero";
    this.font(doc, "BodyRegular", "Helvetica").fontSize(footer.pillSize);
    const tracking = footer.pillTracking * footer.pillSize;
    const textWidth = doc.widthOfString(label) + tracking * label.length;
    const boxWidth = textWidth + footer.pillPadX * 2;
    const boxHeight = footer.pillSize + footer.pillPadY * 2;
    const boxX = (width - boxWidth) / 2;
    const boxY = height - footer.bottom - boxHeight;

    doc.roundedRect(boxX, boxY, boxWidth, boxHeight, boxHeight / 2);
    doc.fillColor(footer.pillColor).fillOpacity(footer.pillOpacity).fill();
    doc.fillOpacity(1);

    this.drawCoverLine(doc, label, {
      x: boxX + footer.pillPadX,
      y: boxY + footer.pillPadY,
      width: textWidth,
      align: "center",
      fontSize: footer.pillSize,
      color: STORY_TEXT_COLOR,
      opacity: 0.9,
      tracking: footer.pillTracking,
      lineHeight: footer.pillSize,
    });
  }

  /** The cover scrim: black 45% at the top fading through clear to 55% black. */


  /**
   * Draw one centred line of cover type with the reader's soft text-shadow
   * behind it, and return the y just below the last line drawn.
   *
   * The shadow is fanned out like `drawTextWithShadow`, because PDFKit cannot
   * blur: 6 low-opacity passes at increasing offsets sum into a soft halo.
   */
  private drawCoverLine(
    doc: PDFKit.PDFDocument,
    text: string,
    options: {
      x: number;
      y: number;
      width: number;
      align: "left" | "center" | "right";
      fontSize: number;
      color: string;
      lineHeight: number;
      opacity?: number;
      tracking?: number;
      shadowOpacity?: number;
      shadowOffsetY?: number;
      shadowBlur?: number;
    }
  ): number {
    const { x, y, width, align, fontSize, color, lineHeight } = options;
    const textOptions: PDFKit.Mixins.TextOptions = {
      width,
      align,
      lineGap: lineHeight - fontSize,
      characterSpacing: options.tracking ? options.tracking * fontSize : 0,
      lineBreak: true,
    };

    const height = doc.heightOfString(text, textOptions);
    const steps = 6;
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      doc
        .fillColor("#000000")
        .fillOpacity((options.shadowOpacity ?? 0) * Math.pow(1 - t, 1.6))
        .text(text, x, y + (options.shadowOffsetY ?? 0) * 0.4 * t + (options.shadowBlur ?? 0) * t, textOptions);
    }
    doc.fillOpacity(1);

    doc
      .fillColor(color)
      .fillOpacity(options.opacity ?? 1)
      .text(text, x, y, textOptions);
    doc.fillOpacity(1);

    return y + Math.max(height, lineHeight);
  }

  private paintBackground(doc: PDFKit.PDFDocument, width: number, height: number, variant: "cover" | "page") {
    doc.rect(0, 0, width, height).fill(PAGE_BACKGROUND);

    const blobs: Array<[number, number, number, string, number]> =
      variant === "cover"
        ? [
          [width * 0.07, height * 0.06, 50, "#F6BE7A", 0.2],
          [width * 0.94, height * 0.09, 36, "#91C9B1", 0.18],
          [width * 0.05, height * 0.93, 42, "#F49AC2", 0.16],
          [width * 0.93, height * 0.92, 54, "#8EC6F0", 0.18],
        ]
        : [
          [30, 28, 42, "#F6BE7A", 0.16],
          [width - 26, 34, 30, "#8EC6F0", 0.16],
          [24, height - 26, 34, "#91C9B1", 0.14],
          [width - 30, height - 110, 26, "#F49AC2", 0.14],
        ];

    blobs.forEach(([cx, cy, r, color, opacity]) => {
      doc.circle(cx, cy, r).fillOpacity(opacity).fill(color).fillOpacity(1);
    });

    // Small decorative details: a few sparkles and confetti dots so even the
    // fallback background feels hand-crafted and kid-friendly.
    const sparkles: Array<[number, number, number]> =
      variant === "cover"
        ? [
          [width * 0.16, height * 0.2, 11],
          [width * 0.84, height * 0.14, 9],
          [width * 0.5, height * 0.32, 7],
          [width * 0.1, height * 0.72, 10],
          [width * 0.9, height * 0.7, 12],
        ]
        : [
          [width * 0.07, height * 0.22, 7],
          [width * 0.93, height * 0.38, 6],
          [width * 0.12, height * 0.78, 6],
          [width * 0.88, height * 0.72, 7],
        ];
    sparkles.forEach(([cx, cy, size]) => this.drawSparkle(doc, cx, cy, size, "#F6C453"));

    const confetti: Array<[number, number, number, string]> = [
      [width * 0.25, height * 0.16, 4, "#FF6F59"],
      [width * 0.66, height * 0.2, 5, "#4D96D7"],
      [width * 0.78, height * 0.55, 4, "#91C9B1"],
      [width * 0.34, height * 0.7, 5, "#F49AC2"],
      [width * 0.55, height * 0.83, 4, "#F6BE7A"],
    ];
    confetti.forEach(([cx, cy, r, color]) => {
      doc.circle(cx, cy, r).fillOpacity(0.55).fill(color).fillOpacity(1);
    });
  }

  private font(doc: PDFKit.PDFDocument, customFont: string, fallback: string) {
    return doc.font(this.customFontsAvailable ? customFont : fallback);
  }

  private drawSparkle(doc: PDFKit.PDFDocument, cx: number, cy: number, size: number, color: string) {
    doc.save();
    doc.fillColor(color);
    for (let i = 0; i < 4; i++) {
      doc.save();
      doc.rotate(i * 45, { origin: [cx, cy] });
      doc
        .path(
          `M ${cx} ${cy - size} ` +
          `Q ${cx + size * 0.18} ${cy - size * 0.18} ${cx + size} ${cy} ` +
          `Q ${cx + size * 0.18} ${cy + size * 0.18} ${cx} ${cy + size} ` +
          `Q ${cx - size * 0.18} ${cy + size * 0.18} ${cx - size} ${cy} ` +
          `Q ${cx - size * 0.18} ${cy - size * 0.18} ${cx} ${cy - size} Z`
        )
        .fill();
      doc.restore();
    }
    doc.restore();
  }
}
