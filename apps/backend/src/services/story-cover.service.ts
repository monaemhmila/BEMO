import path from "path";

export type StoryCoverColor = "blue" | "green" | "pink";

const COVER_FILES: Record<StoryCoverColor, string> = {
  blue: "BLUE-CO.jpg",
  green: "GREEN-CO.jpg",
  pink: "PINK-CO.jpg",
};

const BLUE_WORDS = ["sea", "ocean", "water", "underwater", "beach", "island", "mermaid", "marine", "river", "lake", "sail"];
const GREEN_WORDS = ["forest", "jungle", "nature", "garden", "safari", "farm", "dinosaur", "woodland", "mountain", "plant", "animal", "adventure"];
const PINK_WORDS = ["princess", "fairy", "unicorn", "birthday", "castle", "magic", "ballet", "flower", "rainbow"];

function countMatches(text: string, words: string[]): number {
  return words.reduce((score, word) => score + (text.includes(word) ? 1 : 0), 0);
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
}): { color: StoryCoverColor; url: string; filePath: string } {
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
  const pinkScore = countMatches(text, PINK_WORDS) * 4 + (input.gender === "girl" ? 2 : 0);

  let color: StoryCoverColor = "green";
  if (blueScore > greenScore && blueScore >= pinkScore) color = "blue";
  else if (pinkScore > greenScore && pinkScore > blueScore) color = "pink";

  const filename = COVER_FILES[color];
  const sourceCandidates = [
    path.join(process.cwd(), "src", "covers", filename),
    path.join(process.cwd(), "apps", "backend", "src", "covers", filename),
    path.join(process.cwd(), "assets", "covers", filename),
  ];

  return {
    color,
    url: `/assets/covers/${filename}`,
    filePath: sourceCandidates[0],
  };
}
