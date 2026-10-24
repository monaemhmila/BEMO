import PDFDocument from "pdfkit";
import path from "path";
import fs, { existsSync } from "fs";
import {
  getPageType,
  getPageComposition,
  STORYBOOK_PAGE_WIDTH_PT,
  STORYBOOK_PAGE_HEIGHT_PT,
  StorybookPdfPageSize,
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
  language?: string | null;
}

const FINAL_COVER_COPY = {
  english: {
    title: "A Little Adventure to Remember Forever",
    body: "Childhood goes by so quickly, but the happy moments can stay with us forever.\n\nThat's why I'm here. To turn your child's dreams into a beautiful story they can call their own.\n\nI'm more than just a book. I'm a special part of their childhood, made to be loved today and remembered for years to come.",
  },
  french: {
    title: "Une petite aventure, un souvenir pour toujours",
    body: "L'enfance passe si vite, mais les plus beaux moments restent gravés dans nos cœurs.\n\nC'est pour cela que j'existe. Pour transformer les rêves de votre enfant en une belle histoire qui lui ressemble.\n\nJe suis bien plus qu'un simple livre. Je suis un petit morceau de son enfance, à aimer aujourd'hui et à garder précieusement pour les années à venir.",
  },
  arabic: {
    title: "مغامرة صغيرة، وذكرى تبقى للأبد",
    body: "تمرّ أيام الطفولة بسرعة، لكن أجمل اللحظات تبقى محفورة في قلوبنا إلى الأبد.\n\nلهذا وُجدتُ، لأحوّل أحلام طفلك إلى قصة جميلة تشبهه وتخصّه وحده.\n\nأنا أكثر من مجرد كتاب. أنا ذكرى جميلة من طفولته، يحبّها اليوم ويحتفظ بها في قلبه لسنوات طويلة.",
  },
} as const;

const SHORT_FINAL_COVER_BODY = {
  english: "Childhood passes quickly, but happy memories last forever.\n\nA special book to love today and remember for years.",
  french: "L’enfance passe vite, mais les beaux souvenirs restent pour toujours.\n\nUn livre à aimer aujourd’hui et à garder longtemps.",
  arabic: "تمرّ الطفولة بسرعة، لكن لحظاتها الجميلة تبقى إلى الأبد.\n\nكتاب جميل يحبه اليوم ويحتفظ به لسنوات طويلة.",
} as const;

function repairCoverText(value: string): string {
  // Some older deployments persisted these strings after an accidental
  // UTF-8 -> Latin-1 conversion (for example, "HÃ©ros"). Repair that data at
  // the rendering boundary so all three language versions print correctly.
  if (!/[ÃÂâ€¦ÙØ]/.test(value)) return value;
  try {
    return Buffer.from(value, "latin1").toString("utf8");
  } catch {
    return value;
  }
}

function repairPdfText(value: string): string {
  let repaired = value;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (!/[ÃÂÐÑØÙÛÜ]/.test(repaired)) break;
    const next = Buffer.from(repaired, "latin1").toString("utf8");
    if (next.includes("�")) break;
    repaired = next;
  }
  return repaired;
}

/** Keep the same logical text the browser story reader receives. */
function normalizeStoryReaderArabicText(value: string): string {
  return repairPdfText(value)
    // Browsers use these invisible direction controls for bidi punctuation;
    // PDFKit/fontkit can otherwise emit them as visible missing-glyph boxes.
    .replace(/[\u061C\u200B\u200C\u200D\u200E\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g, "")
    .trim();
}

function getFinalCoverCopy(language?: string | null) {
  const lang = (language || "").toLowerCase();
  if (lang.startsWith("ar")) return FINAL_COVER_COPY.arabic;
  if (lang.startsWith("en")) return FINAL_COVER_COPY.english;
  return FINAL_COVER_COPY.french;
}

// --- Kid-friendly palette -------------------------------------------------
const PAGE_BACKGROUND = "#FFF9F0";
const STORY_TEXT_COLOR = "#FFFFFF";
const STORY_TEXT_SHADOW = "#000000";
const STORY_TEXT_OUTLINE = "#1A2235";


// Exact square printed page size in points (140 x 140 mm), shared with the
// contracts so the image pipeline and PDF layout stay in lockstep. Every
// story ships as exactly 15 pages - page 1 is the full-bleed cover with a
// PDF-rendered title, pages 2-13 carry the story, page 14 the emotional
// ending and page 15 the closing.
const PAGE_WIDTH = STORYBOOK_PAGE_WIDTH_PT; // 140mm square
const PAGE_HEIGHT = STORYBOOK_PAGE_HEIGHT_PT; // 140mm square

// --- Web reader parity ------------------------------------------------------
// `reader.css` and StoryBookCover.tsx express the cover in container query
// units (`cqw`), which resolve against the leaf's own width, plus a few
// `rem`/`px` values. A PDF page is a fixed box, so 1cqw is 1% of the page
// width and every CSS length is converted to points at 96dpi (1px = 0.75pt).
// Each constant below quotes the CSS it mirrors. PDFKit has no gradients or
// blurs, so the soft edges are fanned out as thin low-opacity passes.
const WEB_CQW = PAGE_WIDTH / 100; // 5.9528pt
const WEB_PX = 0.75; // 1 CSS px, in points

/**
 * `StoryBookCover.tsx` - the outside-cover overlay. The generated artwork
 * stays the hero and this is drawn on top of it, exactly as the reader does,
 * so the printed book and the screen show the same title block.
 */
const COVER_TITLE = {
  // Mirrors BookFlipbook: top-8 (32px), inset-x-4 plus px-4 (32px total).
  top: 24,
  sidePad: 24,
  fontSize: 13.5, // 50% smaller than the story-view-sized title
  leading: 1.25, // leading-tight
  shadowOpacity: 0.7, // 0 2px 12px rgba(0, 0, 0, 0.7)
  shadowOffsetY: 2 * WEB_PX, // 2px
  shadowBlur: 12 * WEB_PX, // 12px
  starring: {
    size: 0.78 * WEB_CQW,
    marginTop: 1.4 * WEB_CQW, // mt-[1.4cqw]
    leading: 1.3,
    tracking: 0.28, // tracking-[0.28em]
    color: "#FFC83D", // text-buttercup
    shadowOpacity: 0.6, // 0 1px 6px rgba(0, 0, 0, 0.6)
  },
  footer: {
    bottom: 0.04 * PAGE_HEIGHT, // bottom-[4%]
    whiteSpaceY: 167,
    whiteSpaceSidePad: 87,
    pillBottom: 28.35, // 1 cm above the bottom edge
    dedicationSize: 0.9 * WEB_CQW,
    dedicationLeading: 1.375, // leading-snug
    pillSize: 0.85 * WEB_CQW,
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
const ARABIC_FONT_PATH = [
  path.join(FONT_DIR, "Arabic.ttf"),
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  "C:\\Windows\\Fonts\\tahoma.ttf",
].find(existsSync);



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
  private readonly arabicFontAvailable = Boolean(ARABIC_FONT_PATH);

  async generateStorybookPdf(
    story: StoryPayload,
    pages: StoryPagePayload[],
    onWarning?: (message: string) => void,
    options?: { allowMissingArtwork?: boolean; pageSize?: StorybookPdfPageSize }
  ): Promise<Buffer> {
    // Render exactly the pages provided for this story: keep the first page for
    // each page number in order, ignore any duplicate/extra pages that may exist
    // in an old story, and pad any gaps with blank placeholders so the book layout
    // always matches the generated story page count.
    const byPageNumber = new Map<number, StoryPagePayload>();
    const orderedPages = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);
    orderedPages.forEach((page) => {
      if (!byPageNumber.has(page.pageNumber)) byPageNumber.set(page.pageNumber, page);
    });

    const sortedPages: StoryPagePayload[] = Array.from(
      { length: Math.max(0, pages.length, ...[...byPageNumber.keys()]) },
      (_, index) => {
        const pageNumber = index + 1;
        return (
          byPageNumber.get(pageNumber) || {
            ...(orderedPages[index] || { content: "", imageUrl: null }),
            pageNumber,
          }
        );
      }
    );
    if (sortedPages.length === 0) {
      throw new Error("PDF_GENERATION_NO_PAGES");
    }

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
      if (!options?.allowMissingArtwork) throw new Error(message);
    }

    // A 16:9 story page becomes two PDF leaves (left square, then right square).
    // The first cover stays a single full-bleed square leaf. Pages without an
    // image collapse to one fallback leaf.
    const leaves: PdfLeaf[] = [];
    sortedPages.forEach((page, index) => {
      const split = splitImages[index];
      if (split?.left && split.right) {
        const isSinglePageCover = page.pageNumber === 1;
        const composition = getPageComposition(page.pageNumber, sortedPages.length);
        const textOnRightLeaf = composition.characterSide === "left";
        leaves.push({ pageNumber: page.pageNumber, content: textOnRightLeaf ? "" : page.content, image: split.left, renderText: !textOnRightLeaf });
        if (!isSinglePageCover) {
          leaves.push({ pageNumber: page.pageNumber, content: textOnRightLeaf ? page.content : "", image: split.right, renderText: textOnRightLeaf });
        }
      } else if (split?.full) {
        leaves.push({ pageNumber: page.pageNumber, content: page.content, image: split.full, renderText: true });
      } else {
        leaves.push({ pageNumber: page.pageNumber, content: page.content, image: null, renderText: true });
      }
    });

    const pageSize = options?.pageSize === "20x20"
      ? STORYBOOK_PAGE_WIDTH_PT * (20 / 14)
      : PAGE_WIDTH;
    const renderScale = pageSize / PAGE_WIDTH;

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: [pageSize, pageSize],
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
        // Keep the existing 14 x 14 cm composition unchanged and scale it
        // uniformly only for the explicit 20 x 20 cm PDF export.
        doc.save();
        doc.scale(renderScale, renderScale);
        const totalBookPages = sortedPages.length;
        const pageType = getPageType(leaf.pageNumber, totalBookPages);
        switch (pageType) {
          case "cover":
            this.renderCoverPage(doc, leaf, story);
            break;
          case "ending":
            this.renderEndingPage(doc, leaf, totalBookPages, story);
            break;
          case "closing":
            this.renderClosingPage(doc, leaf);
            break;
          default:
            this.renderStoryPage(doc, leaf, totalBookPages, story);
        }
        doc.restore();
      });
      doc.end();
    });
  }

  /**
   * Generate an empty/sample storybook PDF layout preview for admin testing
   */
  async generateEmptyPreviewPdf(
    title = "Empty Storybook Layout Preview",
    language = "English"
  ): Promise<Buffer> {
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
      ...Array.from({ length: 12 }, (_, index) => ({
        pageNumber: index + 3,
        content: index % 2 === 0
          ? "Story page - text placed in the bottom-right text-safe area, white with a soft shadow."
          : "Story page - text placed in the bottom-left text-safe area, white with a soft shadow.",
        imageUrl: null,
      })),
      {
        pageNumber: 15,
        content: "Closing page - a warm goodbye message centered over the closing artwork.",
        imageUrl: "/assets/covers/GREEN-CO.png",
      },
    ];

    return this.generateStorybookPdf(
      {
        title,
        dedication: "",
        language,
      },
      samplePages
    );
  }

  /** Generate a plain text-only PDF for checking language/font rendering. */
  async generateTextOnlySamplePdf(
    title = "Sample Story",
    text = "Once upon a time, a little explorer discovered a wonderful new world.",
    language = "English",
  ): Promise<Buffer> {
    const doc = new PDFDocument({
      size: "A4",
      margin: 56,
      bufferPages: true,
      info: { Title: title, Author: "Mon Petit Hero", Subject: "Text-only sample story" },
    });
    const buffers: Buffer[] = [];
    const width = 595.28 - 112;
    const bottom = 786;
    let pageNumber = 1;
    let y = 72;

    return new Promise<Buffer>((resolve, reject) => {
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);
      this.registerFonts(doc);

      const arabic = this.isArabicLanguage(language);
      const normalizedTitle = arabic ? normalizeStoryReaderArabicText(title) : repairPdfText(title.trim());
      const normalizedText = arabic ? normalizeStoryReaderArabicText(text) : repairPdfText(text.trim());
      const align: PDFKit.Mixins.TextOptions["align"] = arabic ? "right" : "left";

      const drawFooter = () => {
        doc.font("Helvetica").fontSize(9).fillColor("#94a3b8")
          .text(`Text-only sample · ${pageNumber}`, 56, 806, { width, align: "center" });
      };
      const addPage = () => {
        drawFooter();
        doc.addPage();
        pageNumber += 1;
        y = 72;
      };

      if (arabic) this.arabicFont(doc).fontSize(24);
      else this.font(doc, "BodyExtraBold", "Helvetica-Bold").fontSize(24);
      const titleText = normalizedTitle || "Sample Story";
      if (arabic) {
        this.drawRtlText(doc, titleText, 56, y, { width, align: "right", lineGap: 0 }, "#241b3b", 1);
        y += this.rtlLineCount(doc, titleText, width) * 24 + 24;
      } else {
        doc.fillColor("#241b3b").text(titleText, 56, y, { width, align });
        y += doc.heightOfString(titleText, { width, align }) + 24;
      }

      if (arabic) this.arabicFont(doc).fontSize(16);
      else this.font(doc, "BodyRegular", "Helvetica").fontSize(16);
      for (const paragraph of normalizedText.split(/\n\s*\n/).filter(Boolean)) {
        const paragraphHeight = arabic
          ? this.rtlLineCount(doc, paragraph, width) * 23
          : doc.heightOfString(paragraph, { width, align, lineGap: 7 });
        if (y + paragraphHeight > bottom) addPage();
        if (arabic) {
          this.drawRtlText(doc, paragraph, 56, y, { width, align: "right", lineGap: 7 }, "#334155", 1);
        } else {
          doc.fillColor("#334155").text(paragraph, 56, y, { width, align, lineGap: 7 });
        }
        y += paragraphHeight + 18;
      }
      drawFooter();
      doc.end();
    });
  }

  private registerFonts(doc: PDFKit.PDFDocument) {
    // Font assets are optional in production deployments. The visual hierarchy
    // remains intact with PDFKit's bundled fonts if a deployment has not copied them.
    if (this.customFontsAvailable) {
      doc.registerFont("Title", FONTS.title);
      doc.registerFont("BodyRegular", FONTS.bodyRegular);
      doc.registerFont("BodySemiBold", FONTS.bodySemiBold);
      doc.registerFont("BodyBold", FONTS.bodyBold);
      doc.registerFont("BodyExtraBold", FONTS.bodyExtraBold);
    }
    if (ARABIC_FONT_PATH) doc.registerFont("Arabic", ARABIC_FONT_PATH);
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
    const width = PAGE_WIDTH;
    const height = PAGE_HEIGHT;
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
    leaf: PdfLeaf,
    totalPages: number,
    story: StoryPayload
  ) {
    const width = PAGE_WIDTH;
    const height = PAGE_HEIGHT;
    this.paintBackground(doc, width, height, "page");
    this.drawPageImage(doc, leaf.image, width, height);
    if (leaf.renderText) {
      this.drawStoryText(doc, leaf.pageNumber, leaf.content, totalPages, story.language);
    }
  }

  /**
   * Emotional ending: full-bleed illustration with the closing thought placed
   * at the bottom-center text-safe area. Only the first leaf gets text when a
   * legacy wide image is split into two PDF leaves.
   */
  private renderEndingPage(
    doc: PDFKit.PDFDocument,
    leaf: PdfLeaf,
    totalPages: number,
    story: StoryPayload
  ) {
    const width = PAGE_WIDTH;
    const height = PAGE_HEIGHT;
    this.paintBackground(doc, width, height, "page");
    this.drawPageImage(doc, leaf.image, width, height);
    if (leaf.renderText) {
      this.drawStoryText(doc, leaf.pageNumber, leaf.content, totalPages, story.language);
    }
  }

  /**
   * Closing page: the supplied cover asset already contains all artwork and
   * copy, so it must remain a clean full-bleed image with no PDF overlay.
   */
  private renderClosingPage(
    doc: PDFKit.PDFDocument,
    leaf: PdfLeaf,
  ) {
    const width = PAGE_WIDTH;
    const height = PAGE_HEIGHT;
    this.paintBackground(doc, width, height, "page");
    this.drawPageImage(doc, leaf.image, width, height);
  }

  private drawFinalCoverMessage(
    doc: PDFKit.PDFDocument,
    story: StoryPayload,
    width: number,
    height: number,
    bodyDrop = 0,
  ) {
    const copy = getFinalCoverCopy(story.language);
    const arabic = this.isArabicLanguage(story.language);
    const coverTitle = arabic ? normalizeStoryReaderArabicText(copy.title) : copy.title;
    const coverBody = arabic ? normalizeStoryReaderArabicText(copy.body) : copy.body;

    // Layout: no panel/shape — text sits directly on the full-bleed cover image.
    const sidePad = 85.04; // 3 cm from each side on the 14 cm PDF page
    const textWidth = width - sidePad * 2;

    const titleSize = 15;
    const titleLineHeight = titleSize * 1.2;
    // Arabic final-cover text needs a little more breathing room below the
    // artwork; keep every other language and page position unchanged.
    const finalCoverDrop = arabic ? 20 : 0;
    const titleY = height * 0.04 + finalCoverDrop;

    let titleBottom: number;
    if (arabic) {
      this.arabicFont(doc).fontSize(titleSize);
      titleBottom = this.drawCoverLine(doc, coverTitle, {
        x: sidePad,
        y: titleY,
        width: textWidth,
        align: "center",
        fontSize: titleSize,
        color: STORY_TEXT_COLOR,
        lineHeight: titleLineHeight,
        shadowOpacity: COVER_TITLE.shadowOpacity,
        shadowOffsetY: COVER_TITLE.shadowOffsetY,
        shadowBlur: COVER_TITLE.shadowBlur,
        bold: true,
        rtl: true,
      });
    } else {
      titleBottom = this.drawGoofyTitle(doc, coverTitle, width, titleY, textWidth, titleSize, titleLineHeight);
    }

    // Body: black text, centered below the title
    const bodySize = arabic ? 9.5 : 11;
    const bodyLineHeight = bodySize * (arabic ? 1.38 : 1.28);
    const gap = 40;
    const bodyY = titleBottom + gap + bodyDrop;

    if (arabic) {
      this.arabicFont(doc).fontSize(bodySize);
    } else {
      this.font(doc, "BodyBold", "Helvetica-Bold").fontSize(bodySize);
    }
    this.drawCoverLine(doc, coverBody, {
      x: sidePad,
      y: bodyY,
      width: textWidth,
      align: "center",
      fontSize: bodySize,
      color: "#000000",
      lineHeight: bodyLineHeight,
      shadowOpacity: 0,
      shadowOffsetY: 0,
      shadowBlur: 0,
      bold: false,
      rtl: arabic,
    });
  }

  /**
   * Place the cover-cropped image so it fills every pixel of the page.
   * The buffer is already cover-cropped to the exact square page aspect, so
   * drawing it at 0,0 stretched to the 14 cm page never distorts it.
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
  }

  /**
   * Render story text using the same geometry as BookFlipbook's story view:
   * bottom-anchored text, 5px/10px page-side margins, natural wrapping, and
   * no artificial line limit that can hide the end of a caption.
   */
  private drawStoryText(
    doc: PDFKit.PDFDocument,
    pageNumber: number,
    text: string,
    totalPages = 15,
    language?: string | null,
  ) {
    const cleanText = this.isArabicLanguage(language)
      ? normalizeStoryReaderArabicText(text || "")
      : repairPdfText((text || "").trim());
    if (!cleanText) return;

    const isArabic = this.isArabicLanguage(language);
    const cssPx = 0.75;
    const sideMargin = 5 * cssPx;
    const outerMargin = 10 * cssPx;
    const bottomOffset = 9 * cssPx;
    const fontSize = 14 * cssPx;
    const lineHeight = fontSize * 1.625; // leading-relaxed
    const isOpeningPage = pageNumber === 2;
    const isLeftPage = pageNumber % 2 === 0;
    const x = isOpeningPage || isLeftPage ? sideMargin : outerMargin;
    const width = PAGE_WIDTH - x - sideMargin;
    const webText = cleanText.replace(/\s+/g, " ").trim();

    if (isArabic) {
      this.arabicFont(doc).fontSize(fontSize);
    } else {
      const baseFont = this.customFontsAvailable ? "BodyRegular" : "Helvetica";
      this.font(doc, baseFont, "Helvetica").fontSize(fontSize);
    }

    const options: PDFKit.Mixins.TextOptions = {
      width,
      align: isArabic ? "right" : "left",
      lineGap: lineHeight - fontSize,
      characterSpacing: isArabic ? 0 : 0.2,
      ellipsis: false,
      lineBreak: true,
    };
    const textHeight = isArabic
      ? this.storyReaderArabicLines(doc, webText, width).length * lineHeight
      : doc.heightOfString(webText, options);
    const y = PAGE_HEIGHT - bottomOffset - textHeight;
    const layout = {
      glowOpacity: 0.34,
      shadowOffsetX: 1.2,
      shadowOffsetY: 1.6,
      shadowOpacity: 0.75,
    };
    this.drawTextWithShadow(
      doc,
      webText,
      x,
      Math.max(0, y),
      options,
      layout,
      isArabic,
    );
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
    layout: { glowOpacity: number; shadowOffsetX: number; shadowOffsetY: number; shadowOpacity: number },
    arabic = false,
  ) {
    if (arabic) {
      if (layout.shadowOpacity > 0) {
        this.drawRtlText(
          doc,
          text,
          x + (layout.shadowOffsetX || 0) * 0.4,
          y + Math.max(1, (layout.shadowOffsetY || 0) * 0.7 + 0.8),
          options,
          STORY_TEXT_SHADOW,
          layout.shadowOpacity * 0.6,
        );
      }
      const blurPasses = 6;
      const blurSpread = 6;
      for (let i = 1; i <= blurPasses; i += 1) {
        const t = i / blurPasses;
        this.drawRtlText(
          doc,
          text,
          x + layout.shadowOffsetX * 0.4 * t,
          y + blurSpread * t,
          options,
          STORY_TEXT_SHADOW,
          layout.shadowOpacity * Math.pow(1 - t, 1.6),
        );
      }
      this.drawRtlText(doc, text, x, y, options, STORY_TEXT_COLOR, 1);
      return;
    }

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
   * Render Arabic/RTL text using the story reader's logical direction,
   * caption alignment, shaping, and line wrapping.
   */
  private drawRtlText(
    doc: PDFKit.PDFDocument,
    text: string,
    x: number,
    y: number,
    options: PDFKit.Mixins.TextOptions,
    color: string,
    opacity = 1,
  ) {
    const fontSize = (doc as PDFKit.PDFDocument & { _fontSize?: number })._fontSize || 14;
    const lineHeight = fontSize + (options.lineGap || 0);
    const maxWidth = options.width || 500;
    const lines = this.storyReaderArabicLines(doc, text, maxWidth);
    const { width: _width, align: _align, lineGap: _lineGap, ...singleLineOptions } = options;

    lines.forEach((visualLine, index) => {
      if (!visualLine) return;
      const lineWidth = this.arabicWidthOfString(doc, visualLine);
      const lineX = options.align === "center"
        ? x + Math.max(0, (maxWidth - lineWidth) / 2)
        : options.align === "left"
          ? x
          : x + Math.max(0, maxWidth - lineWidth);
      const lineOptions = {
        ...singleLineOptions,
        characterSpacing: 0,
        features: ["calt"],
        lineBreak: false,
      } as PDFKit.Mixins.TextOptions;
      // The line has already been wrapped above. Do not pass `width` here:
      // PDFKit's wrapper can otherwise auto-add an overflow page when a
      // shadow pass is near the bottom of the Arabic page.
      try {
        doc
          .fillColor(color)
          .fillOpacity(opacity)
          .text(visualLine, lineX, y + index * lineHeight, lineOptions);
      } catch {
        // Some deployed fontkit versions reject an optional Arabic feature
        // for a rare glyph. Keep the same text and geometry, retrying without
        // the optional feature rather than failing the whole PDF export.
        doc
          .fillColor(color)
          .fillOpacity(opacity)
          .text(visualLine, lineX, y + index * lineHeight, {
            ...lineOptions,
            features: [],
          });
      }
      doc.fillOpacity(1);
    });
  }

  private storyReaderArabicLines(doc: PDFKit.PDFDocument, text: string, width: number): string[] {
    const lines: string[] = [];
    for (const paragraph of text.split(/\r?\n/)) {
      if (!paragraph.trim()) {
        lines.push("");
        continue;
      }
      let logicalLine = "";
      for (const word of paragraph.trim().split(/\s+/)) {
        const candidate = logicalLine ? `${logicalLine} ${word}` : word;
        if (logicalLine && this.arabicWidthOfString(doc, candidate) > width) {
          lines.push(logicalLine);
          logicalLine = word;
        } else {
          logicalLine = candidate;
        }
      }
      if (logicalLine) lines.push(logicalLine);
    }
    return lines;
  }

  private arabicWidthOfString(doc: PDFKit.PDFDocument, value: string): number {
    try {
      return doc.widthOfString(value, { features: ["calt"] });
    } catch {
      return doc.widthOfString(value);
    }
  }

  /**
   * The outside-cover overlay, mirroring `StoryBookCover.tsx`: a top-to-bottom
   * scrim so the type stays readable over any artwork, then the title and
   * either the dedication or the Mon Petit Hero pill.
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
    const arabic = this.isArabicLanguage(story.language);

    const title = (story.title ?? "").trim();
    if (title) {
      const coverTitle = this.isArabicLanguage(story.language)
        ? normalizeStoryReaderArabicText(title)
        : repairPdfText(title);
      (arabic ? this.arabicFont(doc) : this.font(doc, "Title", "Helvetica-Bold")).fontSize(COVER_TITLE.fontSize);
      y = this.drawCoverLine(doc, coverTitle, {
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
        bold: arabic,
        rtl: arabic,
      });
    }

    const dedicationValue = (story.dedication ?? "").trim();
    const dedication = arabic
      ? normalizeStoryReaderArabicText(dedicationValue)
      : dedicationValue;
    const footer = COVER_TITLE.footer;
    const footerSidePad = footer.whiteSpaceSidePad;
    const footerWidth = width - footerSidePad * 2;
    if (dedication) {
      const quote = `\u201C${dedication}\u201D`;
      (arabic ? this.arabicFont(doc) : this.font(doc, "Title", "Helvetica-Oblique")).fontSize(footer.dedicationSize);
      const lineHeight = footer.dedicationSize * footer.dedicationLeading; // leading-snug
      // The reader pins this block with `bottom-[4%]`, so a dedication that
      // wraps grows *upward*. PDFKit text grows downward, so measure first and
      // lift the start point by the block's real height.
      const blockHeight = doc.heightOfString(quote, {
        width: footerWidth,
        align: "center",
        lineGap: lineHeight - footer.dedicationSize,
        lineBreak: true,
      });
      this.drawCoverLine(doc, quote, {
        x: footerSidePad,
        y: footer.whiteSpaceY,
        width: footerWidth,
        align: "center",
        fontSize: footer.dedicationSize,
        color: STORY_TEXT_COLOR,
        opacity: 0.9,
        lineHeight,
        shadowOpacity: arabic ? 0 : 0.7,
        shadowOffsetY: 1 * WEB_PX,
        shadowBlur: 8 * WEB_PX,
        rtl: arabic,
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
    // Keep the fallback label independent from the dedication text area.
    const boxY = height - footer.pillBottom - boxHeight;

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
      bold?: boolean;
      rtl?: boolean;
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

    const rtl = options.rtl === true;
    const height = rtl
      ? this.rtlLineCount(doc, text, width) * lineHeight
      : doc.heightOfString(text, textOptions);
    const steps = 6;
    const shadowOpacity = options.shadowOpacity ?? 0;
    if (shadowOpacity > 0 && !rtl) {
      for (let i = 1; i <= steps; i += 1) {
        const t = i / steps;
        doc
          .fillColor("#000000")
          .fillOpacity(shadowOpacity * Math.pow(1 - t, 1.6))
          .text(text, x, y + (options.shadowOffsetY ?? 0) * 0.4 * t + (options.shadowBlur ?? 0) * t, textOptions);
      }
    }
    doc.fillOpacity(1);

    if (rtl) {
      if (shadowOpacity > 0) {
        const shadowPasses = 6;
        const shadowSpread = options.shadowBlur ?? 0;
        for (let i = 1; i <= shadowPasses; i += 1) {
          const t = i / shadowPasses;
          this.drawRtlText(
            doc,
            text,
            x + (options.shadowOffsetY ?? 1) * 0.3 * t,
            y + (options.shadowOffsetY ?? 2) * 0.4 * t + shadowSpread * t,
            textOptions,
            "#000000",
            shadowOpacity * Math.pow(1 - t, 1.6),
          );
        }
      }
      if (options.bold) {
        doc.lineWidth(0.65).strokeColor(color);
        this.drawRtlText(doc, text, x, y, { ...textOptions, stroke: true }, color, options.opacity ?? 1);
      }
      this.drawRtlText(doc, text, x, y, textOptions, color, options.opacity ?? 1);
    } else {
      doc
        .fillColor(color)
        .fillOpacity(options.opacity ?? 1)
        .text(text, x, y, textOptions);
    }
    doc.fillOpacity(1);

    return y + Math.max(height, lineHeight);
  }

  private rtlLineCount(doc: PDFKit.PDFDocument, text: string, width: number): number {
    return this.storyReaderArabicLines(doc, text, width).length;
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

  private arabicFont(doc: PDFKit.PDFDocument) {
    return doc.font(this.arabicFontAvailable ? "Arabic" : "Helvetica");
  }

  private isArabicLanguage(language?: string | null) {
    return (language || "").toLowerCase().startsWith("ar");
  }

  /**
   * Draw the title text character-by-character with a playful wavy arc,
   * per-character rotation, and subtle size wobble — giving it a bent,
   * goofy, fun storybook feel. Returns the Y coordinate just below the
   * last line so the caller can position content beneath it.
   */
  private drawGoofyTitle(
    doc: PDFKit.PDFDocument,
    text: string,
    pageWidth: number,
    baseY: number,
    maxWidth: number,
    fontSize: number,
    lineHeight: number,
  ): number {
    this.font(doc, "Title", "Helvetica-Bold").fontSize(fontSize);

    // Word-wrap into lines manually so we can draw each character individually.
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = "";
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (doc.widthOfString(testLine) > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    // Keep the cover title contained within the single cover leaf. Long
    // generated titles are reduced to a compact two-line cover treatment.
    if (lines.length > 2) {
      lines.length = 2;
      const lastLine = lines[1].replace(/[.!,;:!?\s]+$/, "");
      lines[1] = `${lastLine}…`;
    }

    // Wave / wobble parameters
    const waveAmplitude = fontSize * 0.16;   // vertical bounce height
    const maxRotation = 7;                   // degrees of tilt per character
    const sizeWobble = 0.07;                 // ±7 % size variation
    const shadowSteps = 4;

    lines.forEach((line, lineIndex) => {
      this.font(doc, "Title", "Helvetica-Bold").fontSize(fontSize);
      const chars = line.split("");
      const charWidths = chars.map((c) => doc.widthOfString(c));
      const totalLineWidth = charWidths.reduce((s, w) => s + w, 0);

      let cursorX = (pageWidth - totalLineWidth) / 2; // centre the line
      const cursorY = baseY + lineIndex * lineHeight;

      chars.forEach((char, i) => {
        const charW = charWidths[i];

        // Spaces just advance the cursor — nothing to draw.
        if (char === " ") {
          cursorX += charW;
          return;
        }

        // Progress through the line drives the wave.
        const t = chars.length > 1 ? i / (chars.length - 1) : 0.5;
        const phase = t * Math.PI * 2.2 + lineIndex * 1.8; // offset per line
        const yOff = Math.sin(phase) * waveAmplitude;
        const rot = Math.cos(phase) * maxRotation;
        const scale = 1 + Math.sin(t * Math.PI * 3.4 + lineIndex) * sizeWobble;
        const charSize = fontSize * scale;

        const cx = cursorX + charW / 2;
        const cy = cursorY + yOff;

        // --- shadow passes (soft dark halo) ---
        for (let s = 1; s <= shadowSteps; s++) {
          const st = s / shadowSteps;
          doc.save();
          doc.translate(cx, cy + 6 * st);
          doc.rotate(rot, { origin: [0, 0] });
          this.font(doc, "Title", "Helvetica-Bold")
            .fontSize(charSize)
            .fillColor("#000000")
            .fillOpacity(0.7 * Math.pow(1 - st, 1.5));
          doc.text(char, -charW / 2, 0, { lineBreak: false });
          doc.fillOpacity(1);
          doc.restore();
        }

        // --- solid white character on top ---
        doc.save();
        doc.translate(cx, cy);
        doc.rotate(rot, { origin: [0, 0] });
        this.font(doc, "Title", "Helvetica-Bold")
          .fontSize(charSize)
          .fillColor("#FFFFFF")
          .fillOpacity(1);
        doc.text(char, -charW / 2, 0, { lineBreak: false });
        doc.restore();

        cursorX += charW;
      });
    });

    // Return y just below the last line, accounting for the wave overshoot.
    return baseY + lines.length * lineHeight + waveAmplitude;
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
