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

export const STORYBOOK_PAGE_COUNT = 5;

export const STORYBOOK_IMAGE_ASPECT_RATIO = "16:9";

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
  imageAspectRatio: "16:9";
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

const TEXT_POSITION_BY_PAGE: Record<number, TextPosition> = {
  1: "top-center",
  2: "bottom-left",
  3: "bottom-right",
  4: "bottom-left",
  5: "bottom-right",
  6: "bottom-left",
  7: "bottom-right",
  8: "bottom-left",
  9: "bottom-right",
  10: "bottom-left",
  11: "bottom-right",
  12: "bottom-left",
  13: "bottom-right",
  14: "bottom-left",
  15: "bottom-center",
  16: "center",
};

const PAGE_TYPE_BY_NUMBER: Record<number, PageType> = {
  1: "cover",
  2: "opening",
  15: "ending",
  16: "closing",
};

function isStoryPage(pageNumber: number): boolean {
  return pageNumber >= 3 && pageNumber <= 14;
}

export function getPageType(pageNumber: number): PageType {
  return PAGE_TYPE_BY_NUMBER[pageNumber] || (isStoryPage(pageNumber) ? "story" : "opening");
}

export function getTextPosition(pageNumber: number): TextPosition {
  return TEXT_POSITION_BY_PAGE[pageNumber] || "bottom-center";
}


export function getPageComposition(pageNumber: number): PageComposition {
  const textPosition = getTextPosition(pageNumber);
  const isCover = pageNumber === 1;
  const isWide = textPosition === "bottom-center" || textPosition === "center";

  const characterSide: CharacterSide =
    textPosition === "bottom-right" || textPosition === "bottom-center"
      ? "left"
      : "right";

  return {
    pageNumber,
    pageType: getPageType(pageNumber),
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
export function getPageTextLayout(pageNumber: number): PageTextLayout {
  const composition = getPageComposition(pageNumber);
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
        shadowOpacity: 0.55,
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
        shadowOpacity: 0.55,
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
        shadowOpacity: 0.55,
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
        shadowOpacity: 0.55,
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
        shadowOpacity: 0.55,
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
        shadowOpacity: 0.55,
      };
  }
}

/**
 * Reusable, strongly-worded negative prompt for storybook image generation.
 * Guards identity, anatomy, and the no-AI-text rule.
 */
export const STORYBOOK_NEGATIVE_PROMPT =
  "cartoon, cartoon character, cartoonized child, anime, manga, illustration, children's book illustration, drawing, painting, comic, stylized character, 3D cartoon, CGI character, toy-like appearance, plastic skin, exaggerated facial features, empty side areas, empty left side, empty right side, white side margins, white side panels, blank areas, blank margins, borders, letterboxing, pillarboxing, vertical bars, unused canvas, isolated central composition, text, typography, words, letters, signs, speech bubbles, logos, watermark, bad anatomy, deformed feet, extra feet, missing feet, mutated legs, shorts, bare legs, partial crop, truncated frame";

export function normalizeStoryCategory(rawCategory?: string | null): string {
  if (!rawCategory || !rawCategory.trim()) return "adventure";
  return rawCategory.trim();
}