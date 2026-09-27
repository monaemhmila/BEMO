import PDFDocument from "pdfkit";
import path from "path";
import { existsSync } from "fs";
import {
  getPageType,
  getPageTextLayout,
} from "../contracts/storybook";
import {
  splitForBookPage,
  BookPageImage,
} from "../utils/split16x9IntoTwoSquares";

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

interface PlayfulTitleOptions {
  x: number;
  y: number;
  width: number;
  maxHeight: number;
}

// --- Kid-friendly palette -------------------------------------------------
const PAGE_BACKGROUND = "#FFF9F0";
const MARGIN = 38;
const STORY_TEXT_COLOR = "#FFFFFF";
const STORY_TEXT_SHADOW = "#000000";
const STORY_TEXT_OUTLINE = "#1A2235";
const COVER_TITLE_COLORS = ["#EF6351", "#52B788", "#F6C453", "#8E6AD8", "#4D96D7", "#F59E4C"];
const COVER_TITLE_ROTATIONS = [-3.5, 2.5, -1.5, 3.2, -2.4, 1.4, 0.5, -0.8];
const COVER_TITLE_Y_OFFSETS = [0, -3, 2, -1, 3, -2, 1, 0];
const COVER_TITLE_OUTLINE = "#33251F";
const COVER_TITLE_DEPTH = "#8B5A3C";

// Exact A4 landscape page size in points (297 x 210 mm), shared with the
// contracts so the image pipeline and PDF layout stay in lockstep. Every
// story ships as exactly 16 pages - page 1 is the full-bleed cover with a
// PDF-rendered title, pages 2-14 carry the story, page 15 the emotional
// ending and page 16 the closing.
const PAGE_WIDTH = 595.28; // 210mm square
const PAGE_HEIGHT = 595.28; // 210mm square

// --- Web reader parity ------------------------------------------------------
// `reader.css` expresses the page furniture in container query units (`cqw`),
// which resolve against each leaf's own width, plus a few `rem`/`px` values.
// A PDF page is a fixed box, so 1cqw is 1% of the page width and every CSS
// length is converted to points at 96dpi (1px = 0.75pt). Each constant below
// quotes the CSS it mirrors. PDFKit has no gradients or blurs, so the soft
// edges are fanned out as thin low-opacity passes.
const WEB_CQW = PAGE_WIDTH / 100; // 5.9528pt
const WEB_PX = 0.75; // 1 CSS px, in points

/** `.story-book-page-number` - outer corner, like a finished printed book. */
const FOLIO = {
  fontSize: 1.2 * WEB_CQW, // clamp(0.45rem, 1.2cqw, 0.8rem) -> 7.14pt
  tracking: 0.08, // letter-spacing: 0.08em, resolved against fontSize
  opacity: 0.9, // rgba(255, 255, 255, 0.9)
  shadowOpacity: 0.55, // 0 0 4px rgba(0, 0, 0, 0.55)
  shadowBlur: 4 * WEB_PX, // 4px -> 3pt
  bottom: 1.4 * WEB_CQW, // bottom: 1.4cqw -> 8.33pt
  side: 2.4 * WEB_CQW, // left/right: 2.4cqw -> 14.29pt
};

/** `.is-left::after` / `.is-right::after` - spine shading on facing pages. */
const GUTTER = {
  band: 0.11 * PAGE_WIDTH, // width: 11% of the leaf
  color: "#140A05", // rgba(20, 10, 5, ...)
  opacity: 0.22,
};

/** `.is-cover::after` - the hardcover frame inset on the cover leaf. */
const COVER_FRAME = {
  inset: 0.02 * PAGE_WIDTH, // inset: 2% -> 11.9pt
  lineWidth: Math.max(2 * WEB_PX, 0.4 * WEB_CQW), // max(2px, 0.4cqw) -> 2.38pt
  opacity: 0.6, // rgba(255, 255, 255, 0.6)
  radius: 3 * WEB_PX, // border-radius: 3px
  innerBlur: 0.8 * WEB_CQW, // inset 0 0 0.8cqw rgba(0, 0, 0, 0.22)
  innerOpacity: 0.22,
  outerBlur: 0.9 * WEB_CQW, // 0 0.15cqw 0.9cqw rgba(0, 0, 0, 0.28)
  outerOffsetY: 0.15 * WEB_CQW,
  outerOpacity: 0.28,
};

type LeafSide = "single" | "left" | "right";

/**
 * Which side of the spread a leaf sits on. Mirrors `leafSide` in
 * StoryBookReader.tsx: the cover stands alone, then leaves pair up
 * [left, right] across the book.
 */
function leafSide(leafIndex: number): LeafSide {
  return leafIndex === 0 ? "single" : leafIndex % 2 === 1 ? "left" : "right";
}

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
 * CDN hiccup does not cost the page its artwork.
 */
async function downloadImage(url: string): Promise<Buffer> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= IMAGE_FETCH_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS) });
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
      return Buffer.from(await response.arrayBuffer());
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
          Author: "StoryBook AI",
          Subject: "A personalized children's storybook",
          Creator: "StoryBook AI",
        },
      });
      const buffers: Buffer[] = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      this.registerFonts(doc);
      // Page 1 is the full-bleed cover; page 15 the emotional ending and
      // page 16 the closing have their own centered layouts. Everything in
      // between is a regular story page. Each leaf uses a square crop of the
      // generated 16:9 image drawn full-bleed into the square page.
      leaves.forEach((leaf, index) => {
        if (index > 0) {
          doc.addPage();
        }
        const pageType = getPageType(leaf.pageNumber);
        const side = leafSide(index);
        switch (pageType) {
          case "cover":
            this.renderCoverPage(doc, leaf, story.title);
            break;
          case "ending":
            this.renderEndingPage(doc, leaf, side);
            break;
          case "closing":
            this.renderClosingPage(doc, leaf, side);
            break;
          default:
            this.renderStoryPage(doc, leaf, side);
        }
        // Page furniture sits above the artwork and the story text, the same
        // stacking order the reader's z-indexes give it.
        if (pageType === "cover") {
          this.drawCoverFrame(doc, PAGE_WIDTH, PAGE_HEIGHT);
        }
        this.drawPageNumber(doc, PAGE_WIDTH, PAGE_HEIGHT, index, side);
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
   * Full-bleed cover: the illustration fills the entire A4 landscape page and
   * the title is drawn on top, centered toward the top. No body text.
   */
  private renderCoverPage(
    doc: PDFKit.PDFDocument,
    leaf: PdfLeaf,
    title: string
  ) {
    const { width, height } = doc.page;
    this.paintBackground(doc, width, height, "cover");
    this.drawPageImage(doc, leaf.image, width, height);
    if (leaf.renderText) {
      this.drawCoverTitle(doc, title, width);
    }
  }

  /**
   * Regular story page (pages 2-14): full-bleed square illustration, story
   * text placed in the deterministic text-safe area for this page number.
   */
  private renderStoryPage(
    doc: PDFKit.PDFDocument,
    leaf: PdfLeaf,
    side: LeafSide
  ) {
    const { width, height } = doc.page;
    this.paintBackground(doc, width, height, "page");
    this.drawPageImage(doc, leaf.image, width, height);
    this.drawGutter(doc, width, height, side);
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
    side: LeafSide
  ) {
    const { width, height } = doc.page;
    this.paintBackground(doc, width, height, "page");
    this.drawPageImage(doc, leaf.image, width, height);
    this.drawGutter(doc, width, height, side);
    this.drawStoryText(doc, leaf.pageNumber, leaf.content);
  }

  /**
   * Closing page (page 16): full-bleed square illustration with a short, warm
   * goodbye centered in the lower middle of the page.
   */
  private renderClosingPage(
    doc: PDFKit.PDFDocument,
    leaf: PdfLeaf,
    side: LeafSide
  ) {
    const { width, height } = doc.page;
    this.paintBackground(doc, width, height, "page");
    this.drawPageImage(doc, leaf.image, width, height);
    this.drawGutter(doc, width, height, side);
    this.drawStoryText(doc, leaf.pageNumber, leaf.content);
  }

  /**
   * Spine shading on a facing page, mirroring `.is-left::after` /
   * `.is-right::after`: an 11%-wide band on the spine edge fading to
   * transparent toward the outer edge. The cover is a lone leaf and has none.
   *
   * CSS reaches this with a linear gradient; PDFKit has no gradient fill, so
   * the band is drawn as a stack of equal strips whose alpha ramps linearly
   * from opaque at the spine to clear at the outer edge.
   */
  private drawGutter(
    doc: PDFKit.PDFDocument,
    width: number,
    height: number,
    side: LeafSide
  ) {
    if (side === "single") return;

    // On a left-hand page the spine is on the right, and vice versa.
    const anchoredRight = side === "left";
    const steps = 24;
    const stripWidth = GUTTER.band / steps;

    for (let i = 0; i < steps; i += 1) {
      // i = 0 is always the strip touching the spine, i.e. the darkest.
      const darkness = 1 - i / (steps - 1);
      const x = anchoredRight ? width - (i + 1) * stripWidth : i * stripWidth;
      doc
        .rect(x, 0, stripWidth + 0.5, height)
        .fillOpacity(GUTTER.opacity * darkness)
        .fill(GUTTER.color);
    }
    doc.fillOpacity(1);
  }

  /**
   * The cover's hardcover frame, mirroring `.is-cover::after`: a hairline
   * white border inset 2% of the page, with a soft inner shade and a drop
   * shadow. The reader composites it as a box-shadow, so the two blurs are
   * fanned out as expanding low-opacity rounded rects.
   */
  private drawCoverFrame(doc: PDFKit.PDFDocument, width: number, height: number) {
    const { inset, radius } = COVER_FRAME;
    const x = inset;
    const y = inset;
    const w = width - inset * 2;
    const h = height - inset * 2;

    // Drop shadow: a few expanding rounded rects fading outward.
    const outerSteps = 4;
    for (let i = outerSteps; i >= 1; i -= 1) {
      const grow = (COVER_FRAME.outerBlur / outerSteps) * i;
      doc
        .roundedRect(
          x - grow,
          y - grow + COVER_FRAME.outerOffsetY,
          w + grow * 2,
          h + grow * 2,
          radius + grow
        )
        .fillOpacity(COVER_FRAME.outerOpacity * (1 - i / (outerSteps + 1)))
        .fill("#000000");
    }
    doc.fillOpacity(1);

    // Inner shade hugging the inside of the border.
    const innerSteps = 4;
    for (let i = innerSteps; i >= 1; i -= 1) {
      const grow = (COVER_FRAME.innerBlur / innerSteps) * i;
      doc
        .roundedRect(
          x + grow,
          y + grow,
          w - grow * 2,
          h - grow * 2,
          Math.max(0, radius - grow)
        )
        .lineWidth(COVER_FRAME.lineWidth)
        .strokeOpacity(COVER_FRAME.innerOpacity * (1 - i / (innerSteps + 1)))
        .stroke("#000000");
    }
    doc.strokeOpacity(0);

    // The frame itself.
    doc
      .roundedRect(x, y, w, h, radius)
      .lineWidth(COVER_FRAME.lineWidth)
      .strokeColor("#FFFFFF")
      .strokeOpacity(COVER_FRAME.opacity)
      .stroke("#FFFFFF");
    doc.strokeOpacity(0);
  }

  /**
   * Folio in the outer corner, mirroring `.story-book-page-number`. The
   * reader numbers leaves 1..N and never numbers the cover, so leaf 0 is
   * skipped here too.
   */
  private drawPageNumber(
    doc: PDFKit.PDFDocument,
    width: number,
    height: number,
    leafIndex: number,
    side: LeafSide
  ) {
    if (leafIndex === 0) return;

    const fontSize = FOLIO.fontSize;
    const baseFont = this.customFontsAvailable ? "BodyRegular" : "Helvetica";
    this.font(doc, baseFont, "Helvetica").fontSize(fontSize);
    const label = String(leafIndex + 1);
    const textWidth = doc.widthOfString(label) + FOLIO.tracking * fontSize * label.length;

    // `bottom` in CSS pins the element's bottom edge, so back the baseline
    // up off the foot of the page by the line box height.
    const y = height - FOLIO.bottom - fontSize * 1.15;
    const x =
      side === "single"
        ? (width - textWidth) / 2
        : side === "left"
          ? FOLIO.side
          : width - FOLIO.side - textWidth;

    // 0 0 4px rgba(0, 0, 0, 0.55) - a soft halo, so the folio stays legible
    // over pale artwork.
    const haloSteps = 3;
    for (let i = 1; i <= haloSteps; i += 1) {
      const t = i / haloSteps;
      doc
        .fillColor("#000000")
        .fillOpacity(FOLIO.shadowOpacity * Math.pow(1 - t, 1.4))
        .text(label, x, y + FOLIO.shadowBlur * t, {
          lineBreak: false,
          characterSpacing: FOLIO.tracking * fontSize,
        });
    }
    doc.fillOpacity(1);

    doc
      .fillColor(STORY_TEXT_COLOR)
      .fillOpacity(FOLIO.opacity)
      .text(label, x, y, {
        lineBreak: false,
        characterSpacing: FOLIO.tracking * fontSize,
      });
    doc.fillOpacity(1);
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
  private drawStoryText(doc: PDFKit.PDFDocument, pageNumber: number, text: string) {
    const layout = getPageTextLayout(pageNumber);
    const cleanText = (text || "").trim();
    if (!cleanText) return;

    const baseFont = this.customFontsAvailable ? "BodyRegular" : "Helvetica";
    this.font(doc, baseFont, "Helvetica").fontSize(layout.fontSize);

    const options: PDFKit.Mixins.TextOptions = {
      width: layout.width,
      height: Math.round(layout.maxLines * layout.lineHeight),
      align: layout.align,
      lineGap: layout.lineHeight - layout.fontSize,
      characterSpacing: 0.2,
      ellipsis: true,
      lineBreak: true,
    };

    this.drawTextWithShadow(doc, cleanText, layout.x, layout.y, options, layout);
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
   * Full-bleed cover page dispatcher - draws the kid-friendly title centered
   * at the top of the page.
   */
  private drawCoverTitle(doc: PDFKit.PDFDocument, title: string, width: number) {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    this.drawPlayfulCoverTitle(doc, cleanTitle, {
      x: MARGIN,
      y: MARGIN * 0.8,
      width: width - MARGIN * 2,
      maxHeight: 120,
    });
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

  private drawPlayfulCoverTitle(doc: PDFKit.PDFDocument, title: string, options: PlayfulTitleOptions) {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    const layout = this.layoutCoverTitle(doc, cleanTitle, options.width, options.maxHeight);
    const startY = options.y;
    let visibleIndex = 0;

    layout.lines.forEach((line, lineIndex) => {
      const lineWidth = this.measureTitleLine(doc, line, layout.fontSize, layout.tracking);
      let cursorX = options.x + (options.width - lineWidth) / 2;
      const baselineY = startY + lineIndex * layout.lineHeight;
      const characters = Array.from(line);

      characters.forEach((character, characterIndex) => {
        const characterWidth = doc.widthOfString(character);
        if (character === " ") {
          cursorX += characterWidth * 0.72;
          return;
        }

        const color = COVER_TITLE_COLORS[visibleIndex % COVER_TITLE_COLORS.length];
        const rotation = COVER_TITLE_ROTATIONS[visibleIndex % COVER_TITLE_ROTATIONS.length];
        const yOffset = COVER_TITLE_Y_OFFSETS[visibleIndex % COVER_TITLE_Y_OFFSETS.length];
        const textX = cursorX;
        const textY = baselineY + yOffset;
        const origin: [number, number] = [textX + characterWidth / 2, textY + layout.fontSize / 2];

        doc.save();
        doc.rotate(rotation, { origin });
        this.drawCoverTitleCharacter(doc, character, textX, textY, color, layout.fontSize);
        doc.restore();

        cursorX += characterWidth + (characterIndex === characters.length - 1 ? 0 : layout.tracking);
        visibleIndex += 1;
      });
    });
  }

  private layoutCoverTitle(doc: PDFKit.PDFDocument, title: string, maxWidth: number, maxHeight: number) {
    const maxFontSize = 72;
    const minFontSize = 26;

    for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize -= 2) {
      this.font(doc, "Title", "Helvetica-Bold").fontSize(fontSize);
      const tracking = fontSize * 0.035;
      const lineHeight = fontSize * 1.08;
      const lines = this.wrapTitleLines(doc, title, maxWidth, fontSize, tracking);
      const widestLine = Math.max(...lines.map((line) => this.measureTitleLine(doc, line, fontSize, tracking)));

      if (widestLine <= maxWidth && lines.length * lineHeight <= maxHeight) {
        return { lines, fontSize, tracking, lineHeight };
      }
    }

    const fontSize = minFontSize;
    const tracking = fontSize * 0.03;
    const lineHeight = fontSize * 1.05;
    this.font(doc, "Title", "Helvetica-Bold").fontSize(fontSize);
    return { lines: this.wrapTitleLines(doc, title, maxWidth, fontSize, tracking), fontSize, tracking, lineHeight };
  }

  private wrapTitleLines(
    doc: PDFKit.PDFDocument,
    title: string,
    maxWidth: number,
    fontSize: number,
    tracking: number
  ) {
    this.font(doc, "Title", "Helvetica-Bold").fontSize(fontSize);
    const tokens = title.match(/\S+\s*/g) || [title];
    const lines: string[] = [];
    let currentLine = "";

    tokens.forEach((token) => {
      if (!currentLine) {
        currentLine = token.trimStart();
        while (this.measureTitleLine(doc, currentLine.trimEnd(), fontSize, tracking) > maxWidth && currentLine.length > 1) {
          const splitIndex = this.findTitleSplitIndex(doc, currentLine, maxWidth, fontSize, tracking);
          const currentCharacters = Array.from(currentLine);
          lines.push(currentCharacters.slice(0, splitIndex).join("").trimEnd());
          currentLine = currentCharacters.slice(splitIndex).join("").trimStart();
        }
        return;
      }

      const candidate = currentLine + token;
      if (this.measureTitleLine(doc, candidate.trimEnd(), fontSize, tracking) <= maxWidth) {
        currentLine = candidate;
        return;
      }

      lines.push(currentLine.trimEnd());
      currentLine = token.trimStart();

      while (this.measureTitleLine(doc, currentLine.trimEnd(), fontSize, tracking) > maxWidth && currentLine.length > 1) {
        const splitIndex = this.findTitleSplitIndex(doc, currentLine, maxWidth, fontSize, tracking);
        const currentCharacters = Array.from(currentLine);
        lines.push(currentCharacters.slice(0, splitIndex).join("").trimEnd());
        currentLine = currentCharacters.slice(splitIndex).join("").trimStart();
      }
    });

    if (currentLine.trim().length > 0) {
      lines.push(currentLine.trimEnd());
    }

    return lines.length > 0 ? lines : [title];
  }

  private findTitleSplitIndex(
    doc: PDFKit.PDFDocument,
    text: string,
    maxWidth: number,
    fontSize: number,
    tracking: number
  ) {
    const characters = Array.from(text);
    let splitIndex = 1;

    for (let index = 1; index <= characters.length; index += 1) {
      const candidate = characters.slice(0, index).join("");
      if (this.measureTitleLine(doc, candidate, fontSize, tracking) > maxWidth) break;
      splitIndex = index;
    }

    return splitIndex;
  }

  private measureTitleLine(doc: PDFKit.PDFDocument, line: string, fontSize: number, tracking: number) {
    this.font(doc, "Title", "Helvetica-Bold").fontSize(fontSize);
    const characters = Array.from(line);
    return characters.reduce((width, character, index) => {
      const characterWidth = character === " " ? doc.widthOfString(character) * 0.72 : doc.widthOfString(character);
      const extraTracking = character !== " " && index < characters.length - 1 ? tracking : 0;
      return width + characterWidth + extraTracking;
    }, 0);
  }

  private drawCoverTitleCharacter(
    doc: PDFKit.PDFDocument,
    character: string,
    x: number,
    y: number,
    fillColor: string,
    fontSize: number
  ) {
    this.font(doc, "Title", "Helvetica-Bold").fontSize(fontSize);

    const depthSteps: Array<[number, number]> = [
      [5, 6],
      [3, 4],
      [1.5, 2],
    ];

    depthSteps.forEach(([dx, dy]) => {
      doc.fillColor(COVER_TITLE_DEPTH).text(character, x + dx, y + dy, { lineBreak: false });
    });

    doc
      .lineWidth(Math.max(3, fontSize * 0.085))
      .strokeColor(COVER_TITLE_OUTLINE)
      .fillColor(COVER_TITLE_OUTLINE)
      .text(character, x, y, { lineBreak: false, stroke: true });

    doc.fillColor(fillColor).text(character, x, y, { lineBreak: false });
  }

  /** Small four-point sparkle/star, used to add kid-friendly sparkle accents. */
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
