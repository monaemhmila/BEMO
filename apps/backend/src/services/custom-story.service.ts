/**
 * Custom Story Service
 *
 * A fully template-free storybook generator. The parent describes the story
 * they want in their own words ("story idea" free text) and the LLM turns it
 * into a personalized picture book with the child as the hero.
 *
 * This service intentionally lives side-by-side with the template-based
 * story.service.ts and reuses none of its prompts: the entire free-form
 * prompt is defined below so the two generation paths stay independent.
 */

import { fal } from "@fal-ai/client";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import { getPageType, PageType } from "../contracts/storybook";

export interface CustomStoryInput {
  childName: string;
  childAge: number;
  /** The parent's own, free-form story idea. Required. */
  storyIdea: string;
  /** Optional free text to refine the story (characters, places, twists). */
  extraDetails?: string;
  /** Optional setting / world the parent wants the story to happen in. */
  setting?: string;
  /** Optional moral lesson / message the parent wants the story to teach. */
  moralLesson?: string;
  storyLength?: "short" | "medium" | "long";
  language?: "english" | "french" | "arabic";
}

export interface CustomStoryPage {
  pageNumber: number;
  text: string;
  imageDescription: string;
  emotion?: string;
  pageType?: PageType;
  imageAspectRatio?: "16:9";
}

export interface CustomStoryScript {
  title: string;
  pages: CustomStoryPage[];
}

const LENGTH_CONFIG: Record<
  NonNullable<CustomStoryInput["storyLength"]>,
  { pages: number; wordsPerPage: string }
> = {
  short: { pages: 5, wordsPerPage: "25-35" },
  medium: { pages: 8, wordsPerPage: "35-45" },
  long: { pages: 12, wordsPerPage: "45-60" },
};

/**
 * Build the free-form story prompt from the parent's own words.
 */
export function buildCustomStoryPrompt(input: CustomStoryInput): string {
  const config = LENGTH_CONFIG[input.storyLength ?? "short"];
  const pageCount = config.pages;

  const languageLine = input.language
    ? `Write the story text and the title in ${input.language}.`
    : "Write the story text and the title in English.";

  return `You are a masterful children's book author who turns a parent's own story idea into a personalized picture book. There is NO template: the story must be original and built exactly from the parent's brief below.

Chief hero: "${input.childName}", a real ${input.childAge}-year-old child. ${input.childName} is the hero on EVERY page and appears in every scene exactly as they really look.

THE PARENT'S OWN STORY BRIEF — follow this faithfully, do not replace it with a generic template story:
- Story idea: ${input.storyIdea}
${input.setting ? `- Setting / world: ${input.setting}` : ""}
${input.extraDetails ? `- Extra details to include: ${input.extraDetails}` : ""}
${input.moralLesson ? `- Message the story should teach: ${input.moralLesson}` : `- Message the story should teach: a gentle, natural moral about kindness, courage, family love, or curiosity (never preachy).`}

Story architecture:
- Exactly ${pageCount} illustrated pages (pageNumber 1 through ${pageCount}).
- Build one continuous story arc from the brief: warm opening, engaging adventure in the middle, and a joyful, satisfying ending.
- ${config.wordsPerPage} words of story text per page.
- Page 1 is the cover: give it only a short one-line hook, not a full paragraph.
- Keep characters, clothing, locations and important objects consistent across pages.
- Vary the setting from page to page so each scene feels fresh, colorful and beautiful.

${languageLine}
The "imageDescription" field must ALWAYS be written in English (it is used later to generate the illustrations); only the story text and the title are written in the selected language.

For every page:
- Write the story text with warmth, charm and age-appropriate vocabulary for a ${input.childAge}-year-old.
- Write a clear, visual "imageDescription" of the ENVIRONMENT and any side creatures/characters (vibrant colors, beautiful lighting, engaging scenery). Put ${input.childName} in the middle of the action, actively doing things in the scene.
- Do NOT include text, letters, signs, billboards, book titles, logos or speech bubbles in the imageDescription, and never render any story text inside the image.
- Never use the child's name inside the imageDescription.
- Keep the hero fully clothed with long trousers/pants (never shorts or bare legs).
- Ensure no white space and no blank margins in the composition.
- Ensure natural body postures with normal limbs and feet.

Return ONLY valid JSON:

{
  "title": "Kid-friendly original title featuring ${input.childName}",
  "pages": [
    {
      "pageNumber": 1,
      "text": "Story text for this page",
      "imageDescription": "Visual scene description featuring the hero child",
      "emotion": "happy"
    }
  ]
}`;
}

/**
 * Attach the deterministic page composition so every script page carries its
 * pageType and aspect ratio, and normalize the script to exactly the requested
 * page count.
 */
function withPageComposition(script: CustomStoryScript): CustomStoryScript {
  const ordered = [...script.pages]
    .slice()
    .sort((a, b) => a.pageNumber - b.pageNumber)
    .map((page, index) => ({
      ...page,
      pageNumber: index + 1,
      pageType: getPageType(index + 1),
      imageAspectRatio: "16:9" as const,
    }));

  return {
    title: script.title,
    pages: ordered,
  };
}

/**
 * Generate a template-free story script from the parent's free-form brief.
 * OpenAI is tried first; Fal.ai LLM is the automatic fallback.
 */
export async function generateCustomStoryScript(
  input: CustomStoryInput
): Promise<CustomStoryScript> {
  const prompt = buildCustomStoryPrompt(input);
  const openAiKey = env.OPENAI_API_KEY;

  if (openAiKey) {
    try {
      return withPageComposition(await invokeOpenAI(prompt, openAiKey));
    } catch (err) {
      logger.warn({ error: err }, "Custom story: OpenAI failed, falling back to Fal.ai LLM");
    }
  }

  try {
    logger.info("Custom story: generating script with Fal.ai LLM");

    const result = await fal.subscribe("fal-ai/any-llm", {
      input: {
        prompt,
        max_tokens: 3000,
        temperature: 0.7,
      } as any,
    });

    const rawOutput =
      (result.data as any).output ||
      (result.data as any).text ||
      (result.data as any).response ||
      "";

    const jsonMatch =
      rawOutput.match(/```json\s*([\s\S]*?)\s*```/) ||
      rawOutput.match(/```\s*([\s\S]*?)\s*```/) ||
      [null, rawOutput];

    const jsonPayload = (jsonMatch[1] || rawOutput)
      .replace(/```json\n?|```/g, "")
      .trim();

    const parsed = JSON.parse(jsonPayload) as CustomStoryScript;

    if (!parsed.title || !Array.isArray(parsed.pages)) {
      throw new Error("Invalid story structure from Fal.ai LLM");
    }

    return withPageComposition(parsed);
  } catch (error) {
    logger.error({ error }, "Custom story script generation failed on all providers");
    throw new Error("Custom story generation failed - OpenAI and Fal.ai LLM both unavailable");
  }
}

/**
 * Generate the story script using OpenAI.
 */
async function invokeOpenAI(prompt: string, apiKey: string): Promise<CustomStoryScript> {
  logger.info("Custom story: generating script with OpenAI (gpt-4o-mini)");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a professional children's book author who follows the parent's story brief exactly. Always respond with valid JSON only, no markdown.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 3000,
      temperature: 0.7,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    logger.error({ status: response.status, err }, "Custom story: OpenAI API error");
    throw new Error(`OpenAI API error: ${response.status} - ${err}`);
  }

  const data = (await response.json()) as any;
  const rawOutput = data.choices?.[0]?.message?.content || "";
  const parsed = JSON.parse(rawOutput) as CustomStoryScript;

  if (!parsed.title || !Array.isArray(parsed.pages)) {
    throw new Error("Invalid story structure from OpenAI");
  }

  logger.info({ title: parsed.title, pageCount: parsed.pages.length }, "Custom story script generated");
  return parsed;
}

export const customStoryService = {
  buildCustomStoryPrompt,
  generateCustomStoryScript,
  LENGTH_CONFIG,
};