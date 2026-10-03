/**
 * Shared storybook composition model.
 *
 * Single source of truth for the printed-book design system. Every consumer
 * (story generation, image generation, PDF rendering) imports these constants
 * and helpers so the AI illustration and the real PDF text always agree on
 * where text lives on the page.
 */

export type PageType =
  | "cover"
  | "opening"
  | "story"
  | "ending"
  | "closing";

export type TextPosition =
  | "top-center"
  | "bottom-left"
  | "bottom-right"
  | "bottom-center"
  | "center";

/**
 * Which side of the page the main character is placed on. The main character
 * is ALWAYS on the far left or far right edge of the frame, never in the
 * middle. The side is derived from the text placement: when the text is
 * bottom-left the child is pushed to the far right, and the text side itself
 * is filled by an elegant view of the background place or the side character.
 */
export type CharacterSide = "left" | "right";

export const STORYBOOK_PAGE_COUNT = 15;

export const STORYBOOK_IMAGE_ASPECT_RATIO = "16:9";
export const STORYBOOK_SQUARE_ASPECT_RATIO = "1:1";

// Exact A4 landscape page in PDF points (297 x 210 mm).
export const A4_LANDSCAPE_WIDTH_PT = 841.89;
export const A4_LANDSCAPE_HEIGHT_PT = 595.28;

// Exact square page in PDF points (210 x 210 mm).
export const STORYBOOK_PAGE_WIDTH_PT = 595.28;
export const STORYBOOK_PAGE_HEIGHT_PT = 595.28;

// Approximate print resolution: A4 landscape at 300 DPI.
export const A4_LANDSCAPE_WIDTH_PX = 3508;
export const A4_LANDSCAPE_HEIGHT_PX = 2480;

export interface PageComposition {
  pageNumber: number;
  pageType: PageType;
  textPosition: TextPosition;
  alignment: "left" | "center";
  imageAspectRatio: "16:9" | "1:1";
  textSafeArea: string;
  characterSide: CharacterSide;
  sideCharacterArea: string;
  textWidthPercent: number;
  textMaxWords: number;
}

export interface PageTextLayout {
  x: number;
  y: number;
  width: number;
  align: "left" | "center";
  fontSize: number;
  lineHeight: number;
  maxLines: number;
  glowOpacity: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowOpacity: number;
}

/**
 * The cover (first page) and the closing (last page) render as a single 1:1
 * square page in the book; every intermediate page is a 16:9 illustration that
 * is printed as two square halves. Both the image pipeline and the reader use
 * this single source of truth so generated images always match the page layout.
 */
export function isSquareBookPage(pageNumber: number, totalPages: number): boolean {
  return pageNumber === 1 || pageNumber === Math.max(1, totalPages);
}

export function getPageAspectRatio(
  pageNumber: number,
  totalPages: number
): "1:1" | "16:9" {
  return isSquareBookPage(pageNumber, totalPages)
    ? STORYBOOK_SQUARE_ASPECT_RATIO
    : STORYBOOK_IMAGE_ASPECT_RATIO;
}

/**
 * Page types and text positions are DERIVED from the total page count instead
 * of being hardcoded to absolute page numbers, so a book of any length always
 * gets the same shape: cover, opening, story pages, ending, closing.
 */
export function getPageType(
  pageNumber: number,
  totalPages: number = STORYBOOK_PAGE_COUNT
): PageType {
  const last = Math.max(1, totalPages);

  if (pageNumber === 1) return "cover";
  if (pageNumber === 2) return "opening";
  if (pageNumber === last) return "closing";
  if (pageNumber === last - 1) return "ending";

  return "story";
}

export function getTextPosition(
  pageNumber: number,
  totalPages: number = STORYBOOK_PAGE_COUNT
): TextPosition {
  const pageType = getPageType(pageNumber, totalPages);

  if (pageType === "cover") return "top-center";
  if (pageType === "closing") return "center";
  if (pageType === "ending") return "bottom-center";

  // Body pages alternate corners so consecutive spreads stay balanced.
  return pageNumber % 2 === 0 ? "bottom-left" : "bottom-right";
}


export function getPageComposition(
  pageNumber: number,
  totalPages: number = STORYBOOK_PAGE_COUNT
): PageComposition {
  const textPosition = getTextPosition(pageNumber, totalPages);
  const isCover = pageNumber === 1;
  const isWide = textPosition === "bottom-center" || textPosition === "center";

  const characterSide: CharacterSide =
    textPosition === "bottom-right" || textPosition === "bottom-center"
      ? "left"
      : "right";

  return {
    pageNumber,
    pageType: getPageType(pageNumber, totalPages),
    textPosition,
    alignment: textPosition === "top-center" || textPosition === "bottom-center" || textPosition === "center" ? "center" : "left",
    imageAspectRatio: STORYBOOK_IMAGE_ASPECT_RATIO,
    textSafeArea: "",
    characterSide,
    sideCharacterArea: "",
    textWidthPercent: isCover ? 0.88 : isWide ? 0.6 : 0.5,
    textMaxWords: textPosition === "center" ? 14 : isCover ? 4 : 60,
  };
}

/**
 * Numeric text layout in PDF points for the 210x210 mm square page, driven
 * only by the page number so PDF and image generation stay perfectly in sync.
 */
export function getPageTextLayout(
  pageNumber: number,
  totalPages: number = STORYBOOK_PAGE_COUNT
): PageTextLayout {
  const composition = getPageComposition(pageNumber, totalPages);
  const width = STORYBOOK_PAGE_WIDTH_PT;
  const height = STORYBOOK_PAGE_HEIGHT_PT;
  const margin = 56;

  switch (composition.textPosition) {
    case "top-center":
      return {
        x: margin,
        y: height * 0.1,
        width: width - margin * 2,
        align: "center",
        fontSize: 44,
        lineHeight: 48,
        maxLines: 3,
        glowOpacity: 0.4,
        shadowOffsetX: 1.2,
        shadowOffsetY: 1.6,
        shadowOpacity: 0.75,
      };
    case "bottom-left":
      return {
        x: margin,
        y: height - 150,
        width: width * composition.textWidthPercent,
        align: "left",
        fontSize: 15,
        lineHeight: 19,
        maxLines: 6,
        glowOpacity: 0.34,
        shadowOffsetX: 1.2,
        shadowOffsetY: 1.6,
        shadowOpacity: 0.75,
      };
    case "bottom-right":
      return {
        x: width - margin - width * composition.textWidthPercent,
        y: height - 150,
        width: width * composition.textWidthPercent,
        align: "left",
        fontSize: 15,
        lineHeight: 19,
        maxLines: 6,
        glowOpacity: 0.34,
        shadowOffsetX: 1.2,
        shadowOffsetY: 1.6,
        shadowOpacity: 0.75,
      };
    case "bottom-center":
      return {
        x: (width - width * composition.textWidthPercent) / 2,
        y: height - 155,
        width: width * composition.textWidthPercent,
        align: "center",
        fontSize: 16,
        lineHeight: 20,
        maxLines: 5,
        glowOpacity: 0.36,
        shadowOffsetX: 1.2,
        shadowOffsetY: 1.6,
        shadowOpacity: 0.75,
      };
    case "center":
      return {
        x: (width - width * composition.textWidthPercent) / 2,
        y: height * 0.58,
        width: width * composition.textWidthPercent,
        align: "center",
        fontSize: 18,
        lineHeight: 23,
        maxLines: 3,
        glowOpacity: 0.38,
        shadowOffsetX: 1.2,
        shadowOffsetY: 1.6,
        shadowOpacity: 0.75,
      };
    default:
      return {
        x: margin,
        y: height - 150,
        width: width * 0.5,
        align: "left",
        fontSize: 15,
        lineHeight: 19,
        maxLines: 6,
        glowOpacity: 0.34,
        shadowOffsetX: 1.2,
        shadowOffsetY: 1.6,
        shadowOpacity: 0.75,
      };
  }
}

/**
 * Reusable, strongly-worded negative prompt for storybook image generation.
 * Guards identity, anatomy, and the no-AI-text rule.
 */
export const STORYBOOK_NEGATIVE_PROMPT =
  "cartoon, cartoon character, cartoonized child, anime, manga, illustration, children's book illustration, drawing, painting, comic, stylized character, 3D cartoon, CGI character, toy-like appearance, plastic skin, exaggerated facial features, horizontal stretching, horizontal compression, non-uniform scaling, stretched face, squeezed face, widened child, broad shoulders, wide torso, distorted torso, squashed proportions, oversized head, warped anatomy, deformed feet, extra feet, missing feet, mutated legs, shorts, bare legs, partial crop, truncated frame, text, typography, words, letters, signs, speech bubbles, logos, watermark";

/**
 * The categories a story template may belong to. Anything else (including a
 * model echoing the list of options back at us) falls back to "adventure".
 */
export const STORY_CATEGORIES = ["adventure", "educative", "sentimental"] as const;

export function normalizeStoryCategory(rawCategory?: string | null): string {
  if (!rawCategory || !rawCategory.trim()) return "adventure";

  const normalized = rawCategory.trim().toLowerCase();
  return (STORY_CATEGORIES as readonly string[]).includes(normalized)
    ? normalized
    : "adventure";
}

/** A customer review stored alongside a template, rendered on the detail page. */
export interface StorefrontReview {
  rating: number;
  count: number;
  quote: string;
  author: string;
}

/** One gallery slide on the book detail page. */
export interface StorefrontPreview {
  src: string;
  type: "image" | "video";
  mimeType?: string;
  caption?: string;
}

/**
 * The catalogue payload `GET /storybook/templates` and
 * `POST /storybook/templates/custom` both return. One shape for the storefront
 * and the generator, so a template added in the database appears on /books with
 * no frontend change.
 */
export interface StorefrontTemplate {
  /** Primary key. Also the storefront slug: /books/<id>. */
  id: string;
  title: string;
  description: string;
  tagline: string | null;
  excerpt: string | null;
  translations: StorefrontTemplateTranslations;
  emoji: string | null;
  audience: string;
  ageRange: string;
  category: string;
  difficulty: number;
  tags: string[];
  coverImage: string | null;
  /** Gallery slides for the detail page. Empty means "use the filler previews". */
  previews: StorefrontPreview[];
  theme: string;
  moral: string | null;
  learning: string | null;
  artStyle: string | null;
  review: StorefrontReview | null;
}

export interface StorefrontTemplateTranslations {
  fr: {
    title: string | null;
    description: string | null;
    tagline: string | null;
    excerpt: string | null;
  };
  ar: {
    title: string | null;
    description: string | null;
    tagline: string | null;
    excerpt: string | null;
  };
}

/** The subset of a `StoryTemplate` row the storefront payload is built from. */
interface StoryTemplateRow {
  id: string;
  name: string;
  description: string;
  ageRange: string;
  category: string;
  difficulty: number;
  tags: string[];
  coverImage: string | null;
  sampleImage: string | null;
  tagline: string | null;
  excerpt: string | null;
  nameFr: string | null;
  nameAr: string | null;
  descriptionFr: string | null;
  descriptionAr: string | null;
  taglineFr: string | null;
  taglineAr: string | null;
  excerptFr: string | null;
  excerptAr: string | null;
  emoji: string | null;
  audience: string;
  artStyle: string | null;
  review: unknown;
  previews: unknown;
  prompts: unknown;
}

function readPromptField(prompts: unknown, field: string): string | null {
  if (!prompts || typeof prompts !== "object") return null;
  const value = (prompts as Record<string, unknown>)[field];
  return typeof value === "string" && value.trim() ? value : null;
}

function readReview(review: unknown): StorefrontReview | null {
  if (!review || typeof review !== "object") return null;

  const { rating, count, quote, author } = review as Record<string, unknown>;
  if (typeof quote !== "string" || typeof author !== "string") return null;

  return {
    rating: typeof rating === "number" ? rating : 0,
    count: typeof count === "number" ? count : 0,
    quote,
    author,
  };
}

/**
 * Read the stored preview list. Anything malformed is dropped rather than
 * rejected, because a single bad row must not take the whole shop page down.
 */
function readPreviews(previews: unknown): StorefrontPreview[] {
  if (!Array.isArray(previews)) return [];

  const slides: StorefrontPreview[] = [];

  for (const entry of previews) {
    if (!entry || typeof entry !== "object") continue;

    const { src, type, mimeType, caption } = entry as Record<string, unknown>;
    if (typeof src !== "string" || !src.trim()) continue;
    // Only http(s) and root-relative asset paths, so a stored value can never
    // turn into a javascript: or data: URL in the storefront.
    const isSafe = /^(https?:\/\/|\/)/i.test(src.trim());
    if (!isSafe) continue;

    const slide: StorefrontPreview = {
      src: src.trim(),
      type: type === "video" ? "video" : "image",
    };

    if (typeof mimeType === "string" && mimeType.trim()) {
      slide.mimeType = mimeType.trim().slice(0, 100);
    }
    if (typeof caption === "string" && caption.trim()) {
      slide.caption = caption.trim().slice(0, 200);
    }

    slides.push(slide);
  }

  return slides;
}

/**
 * Turn a `StoryTemplate` row into the storefront payload. The generation prompt
 * document is flattened into `theme`/`moral`/`learning` because those are the
 * three parts the storefront actually shows.
 */
export function toStorefrontTemplate(row: StoryTemplateRow): StorefrontTemplate {
  return {
    id: row.id,
    title: row.name,
    description: row.description,
    tagline: row.tagline,
    excerpt: row.excerpt,
    translations: {
      fr: {
        title: row.nameFr,
        description: row.descriptionFr,
        tagline: row.taglineFr,
        excerpt: row.excerptFr,
      },
      ar: {
        title: row.nameAr,
        description: row.descriptionAr,
        tagline: row.taglineAr,
        excerpt: row.excerptAr,
      },
    },
    emoji: row.emoji,
    audience: row.audience || "any",
    ageRange: row.ageRange,
    category: row.category,
    difficulty: row.difficulty,
    tags: row.tags,
    coverImage: row.coverImage ?? row.sampleImage,
    previews: readPreviews(row.previews),
    theme: readPromptField(row.prompts, "theme") ?? "",
    moral: readPromptField(row.prompts, "moralLesson"),
    learning: readPromptField(row.prompts, "educationalFocus"),
    artStyle: row.artStyle,
    review: readReview(row.review),
  };
}
