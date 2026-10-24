import path from "path";
import { env } from "../config/env";

export type StoryCoverColor = "blue" | "green" | "pink";
export type StoryCoverLanguage = "arabic" | "english" | "french";

const COVER_FILES: Record<StoryCoverColor, Record<StoryCoverLanguage, string>> = {
  blue: { arabic: "BAR.png", english: "BENG.png", french: "BFR.png" },
  green: { arabic: "GAR.png", english: "GENG.png", french: "GFR.png" },
  pink: { arabic: "PAR.png", english: "PENG.png", french: "PFR.png" },
};

const BLUE_WORDS = ["sea", "ocean", "water", "underwater", "beach", "island", "mermaid", "marine", "river", "lake", "sail"];
const GREEN_WORDS = ["forest", "jungle", "nature", "garden", "safari", "farm", "dinosaur", "woodland", "mountain", "plant", "animal", "adventure"];
const PINK_WORDS = ["princess", "fairy", "unicorn", "birthday", "castle", "magic", "ballet", "flower", "rainbow"];

function countMatches(text: string, words: string[]): number {
  return words.reduce((score, word) => score + (text.includes(word) ? 1 : 0), 0);
}

function normalizeCoverLanguage(language?: string | null): StoryCoverLanguage {
  const normalized = (language || "").trim().toLowerCase();
  if (normalized.startsWith("ar") || normalized.startsWith("arab")) return "arabic";
  if (normalized.startsWith("fr") || normalized.startsWith("fren")) return "french";
  return "english";
}

/**
 * Selects the reusable closing cover for a generated story. The resolver uses
 * the template's category/content, the generated title and page descriptions,
 * so newly-created templates work without a hard-coded template ID list.
 */
export function chooseStoryCover(input: {
  category?: string | null;
  title?: string | null;
  templateName?: string | null;
  templateDescription?: string | null;
  templatePrompts?: unknown;
  pagePrompts?: string[];
  gender?: "boy" | "girl" | null;
  language?: string | null;
}): { color: StoryCoverColor; language: StoryCoverLanguage; filename: string; url: string; filePath: string } {
  const prompts = input.templatePrompts && typeof input.templatePrompts === "object"
    ? JSON.stringify(input.templatePrompts)
    : "";
  const text = [
    input.category,
    input.title,
    input.templateName,
    input.templateDescription,
    prompts,
    ...(input.pagePrompts ?? []),
  ].filter(Boolean).join(" ").toLowerCase();

  const blueScore = countMatches(text, BLUE_WORDS) * 5;
  const greenScore = countMatches(text, GREEN_WORDS) * 3;
  // A boy must never receive the pink closing-cover palette, even when the
  // story theme contains words such as princess, fairy, or rainbow.
  const pinkScore = input.gender === "boy"
    ? Number.NEGATIVE_INFINITY
    : countMatches(text, PINK_WORDS) * 4 + (input.gender === "girl" ? 2 : 0);

  let color: StoryCoverColor = "green";
  if (blueScore > greenScore && blueScore >= pinkScore) color = "blue";
  else if (pinkScore > greenScore && pinkScore > blueScore) color = "pink";

  const language = normalizeCoverLanguage(input.language);
  const filename = COVER_FILES[color][language];
  const publicBase = env.PUBLIC_ASSET_BASE_URL?.replace(/\/$/, "");
  const sourceCandidates = [
    path.join(process.cwd(), "src", "covers", filename),
    path.join(process.cwd(), "apps", "backend", "src", "covers", filename),
    path.join(process.cwd(), "assets", "covers", filename),
  ];

  return {
    color,
    language,
    filename,
    url: publicBase ? `${publicBase}/assets/covers/${filename}` : `/assets/covers/${filename}`,
    filePath: sourceCandidates[0],
  };
}
