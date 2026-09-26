import { fal } from "@fal-ai/client";
import { prismaClient } from "../lib/prisma";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import { FaceConsistencyService } from "./face-consistency.service";
import { StoryCompletionService } from "./story-completion.service";
import { GROK_IMAGINE_MODEL, GROK_IMAGINE_EDIT_MODEL } from "./image-generation.service";
import { saveRemoteImageLocally, saveJsonLocally } from "../lib/storage";
import {
  STORYBOOK_PAGE_COUNT,
  getPageType,
  getPageComposition,
  getPageAspectRatio,
  isSquareBookPage,
  PageType,
  normalizeStoryCategory,
} from "../contracts/storybook";

/** The canonical 14-beat prompt document stored in `StoryTemplate.prompts`. */
export interface StoryTemplatePrompts {
  theme: string;
  moralLesson: string;
  educationalFocus: string;
  worldContext: string;
  beats: string[];
}

/** The subset of a `StoryTemplate` row the generation prompt needs. */
export interface StoryTemplateRow {
  id: string;
  name: string;
  description: string;
  ageRange: string;
  category: string;
  difficulty: number;
  prompts: StoryTemplatePrompts;
}

export interface PersonalizedStoryInput {
  childName: string;
  childAge: number;
  template: StoryTemplateRow;
  dedication?: string;
  language?: string;
}

interface StoryPageInput {
  pageNumber: number;
  text: string;
  imageDescription: string;
  emotion?: string;
  pageType?: PageType;
  imageAspectRatio?: "16:9" | "1:1";
}

interface StoryScript {
  title: string;
  pages: StoryPageInput[];
}

interface CharacterProfile {
  name: string;
  age?: number;
  appearance?: string;
}

const AGE_GUIDANCE = {
  "3-5": {
    language:
      "very simple words, short sentences, basic concepts like colors and fun",
    themes: "friendship, sharing, bedtime, animals, fun",
    textLength: "2-3 short sentences per page",
    minPageWords: 30,
    targetPageWords: "35-45",
  },
  "6-8": {
    language: "simple and clear vocabulary, short complete sentences",
    themes: "adventure, problem-solving, friendship, family, nature",
    textLength: "3-4 short sentences per page",
    minPageWords: 40,
    targetPageWords: "45-55",
  },
  "9-12": {
    language: "clear and engaging vocabulary, short sentence structures",
    themes: "bravery, teamwork, moral lessons, discovery, mystery",
    textLength: "4-5 sentences per page",
    minPageWords: 45,
    targetPageWords: "50-65",
  },
} as const;

const STORY_WEBHOOK = env.WEBHOOK_BASE_URL
  ? `${env.WEBHOOK_BASE_URL}/api/webhook/story/page`
  : undefined;

export class StoryService {
  private static instance: StoryService;

  private faceConsistency = FaceConsistencyService.getInstance();
  private storyCompletion = StoryCompletionService.getInstance();

  /**
   * Cooldown for the expensive pending-page reconciliation (it calls the fal.ai
   * queue per pending page). Without this, every 3s poll of GET /story/:id from
   * a client watching a generating story would hammer the external API.
   */
  private static readonly PENDING_CHECK_COOLDOWN_MS = 25_000;
  private pendingCheckAt = new Map<string, number>();

  static getInstance() {
    if (!StoryService.instance) {
      StoryService.instance = new StoryService();
    }

    return StoryService.instance;
  }

  /**
   * Generate a basic story.
   */
  async generateStoryScript(
    characterName: string,
    theme: string,
    language?: string
  ): Promise<StoryScript> {
    const prompt = `
Write a ${STORYBOOK_PAGE_COUNT}-page children's story about a hero named "${characterName}".

Theme: "${theme}".
${language ? `Language: ${language}` : ""}

Tone & Style:
- Storytelling: engaging, heartwarming, filled with wonder, adventure, and warmth.
- Create a playful, kid-friendly title.
- Make one continuous story with a beginning, adventure, problem, resolution, and joyful warm ending.

For each page:
- Write a charming paragraph of 2-4 sentences of story text with heart and imagination.
- Create a clear visual scene description for the ENVIRONMENT and any SIDE CHARACTERS/CREATURES (vibrant colors, beautiful lighting, engaging scenery, cute side characters).
- Keep the hero as the main character. Make the child character highly active and engaging in the story and the scenes. The child should be actively doing things, interacting with the environment, and taking action.
- Do not include text, words, signs, billboards, book titles, logos, or speech bubbles in the image description.
- Ensure the hero child is always fully clothed wearing long trousers and pants (never shorts).
- Ensure there is no white space , no blank margins.
- Ensure natural character postures with normal limbs and feet (e.g. standing, walking, sitting naturally).

Return ONLY valid JSON:

{
  "title": "Kid-friendly title featuring ${characterName}",
  "pages": [
    {
      "pageNumber": 1,
      "text": "Story text",
      "imageDescription": "Visual scene description featuring the hero child",
      "emotion": "happy"
    }
  ]
}
`;
    return this.withPageComposition(await this.invokeLLM(prompt));
  }

  /**
   * Attach the deterministic page composition so every script page already
   * carries its pageType, textPosition and aspect ratio for image + PDF.
   * Also normalizes the script to exactly `expectedPageCount` pages: any
   * extra pages from the model are dropped and page numbers are renumbered
   * 1..N so the book layout is always identical for a given length.
   */
  private withPageComposition(
    script: StoryScript,
    expectedPageCount: number = STORYBOOK_PAGE_COUNT
  ): StoryScript {
    const ordered = [...script.pages]
      .slice()
      .sort((a, b) => a.pageNumber - b.pageNumber)
      .slice(0, expectedPageCount)
      .map((page, index) => {
        const pageNumber = index + 1;
        const totalPages = Math.min(script.pages.length, expectedPageCount);
        return {
          ...page,
          pageNumber,
          pageType: getPageType(pageNumber, totalPages),
          imageAspectRatio: getPageAspectRatio(pageNumber, totalPages),
        };
      });

    return {
      title: script.title,
      pages: ordered,
    };
  }

  /**
   * Generate a personalized age-appropriate story from a stored template.
   *
   * The template's 14 beats ARE the page plan: page N follows beat N, so the
   * arc (hook, discovery, attempts, midpoint triumph, trouble, turning point,
   * resolution, warm closing) is guaranteed for every book. The model only
   * writes the prose and the scene direction for each page.
   */
  async generatePersonalizedStoryScript(
    characterName: string,
    input: PersonalizedStoryInput,
    characterProfile?: CharacterProfile
  ): Promise<StoryScript> {
    const ageRange = this.getAgeRange(input.childAge);
    const guidance = AGE_GUIDANCE[ageRange];
    const template = input.template;
    const pageCount = STORYBOOK_PAGE_COUNT;
    const beats = template.prompts.beats;

    if (!Array.isArray(beats) || beats.length !== pageCount) {
      throw new Error(
        `Template "${template.id}" must define exactly ${pageCount} beats, received ${
          Array.isArray(beats) ? beats.length : "none"
        }`
      );
    }

    const beatPlan = beats
      .map((beat, index) => `  - Page ${index + 1}: ${beat}`)
      .join("\n");

    const prompt = `
Create a personalized children's story for a ${input.childAge}-year-old named "${input.childName}".

Story template: "${template.name}" (${template.ageRange}, difficulty ${template.difficulty})
- Central theme: ${template.prompts.theme}
- Moral lesson: ${template.prompts.moralLesson}
- Educational focus: ${template.prompts.educationalFocus}
- World and setting: ${template.prompts.worldContext}

Story:
- Exactly ${pageCount} pages (pageNumber 1 through ${pageCount}). Every book has the same number of pages.
- Follow the template beat plan EXACTLY, one beat per page, in order. Do not skip, merge, reorder or add beats.
- Page 1 is the cover: it shows the hero at the very start of the adventure, its text is a single short hook line (the book title is printed on the page separately).
- Page 2 is the opening page: introduce the hero, the world and what puts the adventure in motion.
- Page ${pageCount - 1} resolves the problem and shows the lesson lived out, not just explained.
- Page ${pageCount} is the closing page: a warm, gentle farewell that echoes the opening. Keep its text very short (about 8-12 words).
- Tone & Style: heartwarming, full of wonder, adventure, gentle humor, and emotional depth.
- ${guidance.language}
- ${guidance.textLength}
- Page length: every story page (pages 3 to ${pageCount - 2}) must carry ${guidance.targetPageWords} words and MUST NOT be shorter than ${guidance.minPageWords} words. A thin page looks unfinished in a printed picture book, so describe what the hero does, says and notices on that page instead of rushing to the next beat. The cover (page 1) is a single short hook line and the closing page is a brief farewell; those two are the only short pages.
- HEART & LESSON: weave the template's moral lesson and educational focus into the story naturally and never preachy.
- Themes: ${guidance.themes}
${input.language ? `- Language: ${input.language}. Write the story text and title in ${input.language}.` : ""}
- The imageDescription field must ALWAYS be written in English (it is used to generate the illustrations); only the story text and title are written in the selected language.
${input.dedication ? `- Dedication: "${input.dedication}"` : ""}

Beat plan (page 1 = beat 1, ... page ${pageCount} = beat ${pageCount}):
${beatPlan}

${characterProfile?.appearance
        ? `Character appearance: ${characterProfile.appearance}`
        : "The uploaded reference image defines the character's real face and appearance."
      }

"${input.childName}" is the hero throughout the story and must stay the same recognizable child on every page.

Keep the story continuous and keep characters, clothing, locations, and important objects consistent.
Vary the setting from page to page so the scenes each feel fresh and beautiful.

For each page:
- Write the story text with warmth and charm, following that page's beat.
- Build the imageDescription by covering the ENTIRE background in four consecutive zones, one after the other: describe what is on the RIGHT side, then the LEFT side, then the TOP, then the BOTTOM, so every part of the backdrop is fully described with absolutely no un-described area.
- Keep all four zones part of ONE continuous, seamless background scene: same location, same time of day, same weather, same lighting and the same color palette across right/left/top/bottom. The zones must blend smoothly into each other where they meet (no hard seams, no abrupt color or style changes, no cut-off objects at any edge), so the whole frame reads as a single homogeneous environment rather than four separate panels.
- Make the ENVIRONMENT and any SIDE CHARACTERS/CREATURES colorful, imaginative, and detailed.
- The hero child retains their natural real appearance from their photo. Make the child character highly active and engaging in the story and the scenes. The child should be actively doing things, interacting with the environment, and taking action.
- The imageDescription must NEVER mention or imply any art style, illustration style, medium, or drawing technique - never use words like illustration, storybook, cartoon, anime, painting, watercolor, 3D, drawing, sketch, render, or any similar artistic term. Descriptions are purely about the scene CONTENT: the setting, time of day, weather, lighting, colors, characters, objects, and atmosphere. The artwork's visual style is applied separately and is not part of the description.
- Do not include text, letters, signs, billboards, book titles, logos, or speech bubbles in imageDescription.
- Do not use the child's name in imageDescription.
- Do not render any story text inside the image.
- Ensure the hero child is always fully clothed wearing long trousers and pants (never wearing shorts or short clothing).
- Ensure there is no white space , no blank margins.
- Ensure natural character postures with normal limbs and feet (e.g. standing, walking, sitting naturally).

Return ONLY valid JSON:

{
  "title": "Kid-friendly title featuring ${input.childName}",
  "pages": [
    {
      "pageNumber": 1,
      "text": "Story text",
      "imageDescription": "Visual scene description featuring the hero child",
      "emotion": "happy"
    }
  ]
}
`;
    return this.withPageComposition(
      await this.expandThinPages(
        await this.invokeLLM(prompt),
        input,
        guidance,
        pageCount
      ),
      pageCount
    );
  }

  /**
   * The model tends to write thin picture-book pages even when the prompt asks
   * for 45-60 words, which leaves a printed book feeling sparse. When a story
   * page comes back under the age-appropriate minimum, one repair call rewrites
   * only those pages. This is best effort: a book is never rejected because a
   * cosmetic pass failed, and image descriptions are never touched.
   */
  private async expandThinPages(
    script: StoryScript,
    input: PersonalizedStoryInput,
    guidance: (typeof AGE_GUIDANCE)[keyof typeof AGE_GUIDANCE],
    pageCount: number
  ): Promise<StoryScript> {
    const firstStoryPage = 3;
    const lastStoryPage = pageCount - 2;
    const countWords = (value: string) =>
      value.trim().split(/\s+/).filter(Boolean).length;

    const thin = script.pages.filter(
      (page) =>
        page.pageNumber >= firstStoryPage &&
        page.pageNumber <= lastStoryPage &&
        countWords(page.text) < guidance.minPageWords
    );

    if (thin.length === 0) {
      return script;
    }

    logger.info(
      `Story page length: expanding ${thin.length} thin page(s) below ${guidance.minPageWords} words`
    );

    const beats = input.template.prompts.beats;
    const previousPage = (pageNumber: number) =>
      script.pages.find((page) => page.pageNumber === pageNumber)?.text ?? "";
    const nextPage = (pageNumber: number) =>
      script.pages.find((page) => page.pageNumber === pageNumber)?.text ?? "";

    const request = thin
      .map((page) => {
        const beat = Array.isArray(beats) ? beats[page.pageNumber - 1] : "";
        return `Page ${page.pageNumber} - the beat it must keep: "${beat}"
Previous page ends: "${previousPage(page.pageNumber - 1).slice(-220)}"
Current thin text (${countWords(page.text)} words): "${page.text}"
Next page begins: "${nextPage(page.pageNumber + 1).slice(0, 220)}"`;
      })
      .join("\n\n");

    try {
      const repaired = (await this.invokeJsonLLM(
        `These pages of a ${pageCount}-page children's story came out too thin for a printed picture book. Rewrite ONLY the listed pages, making each one ${guidance.targetPageWords} words (never fewer than ${guidance.minPageWords}).

Rules:
- Keep exactly the same plot, the same events, the same characters and the same outcome as the current text. Only make the writing fuller.
- Add what the hero does, says, notices and feels on that page: more concrete detail, more sensory description, and natural short dialogue with side characters.
- Do not start or end mid-sentence and never add page numbers, headings or narration labels.
- ${guidance.language}
- The first and last page of the list must still flow into the surrounding text that is quoted above and below.

${request}

Return ONLY valid JSON: { "pages": [ { "pageNumber": 1, "text": "the rewritten story text" } ] }`,
        "You are a professional children's book author. Always respond with valid JSON only, no markdown.",
        { maxTokens: 4000, temperature: 0.8 }
      )) as { pages?: { pageNumber?: unknown; text?: unknown }[] };

      const replacements = new Map<number, string>();

      for (const page of repaired.pages ?? []) {
        const pageNumber = Number(page.pageNumber);
        const text = typeof page.text === "string" ? page.text.trim() : "";

        if (
          Number.isInteger(pageNumber) &&
          pageNumber >= firstStoryPage &&
          pageNumber <= lastStoryPage &&
          text.length > 0
        ) {
          replacements.set(pageNumber, text);
        }
      }

      if (replacements.size === 0) {
        return script;
      }

      return {
        ...script,
        pages: script.pages.map((page) => {
          const replacement = replacements.get(page.pageNumber);
          return replacement ? { ...page, text: replacement } : page;
        }),
      };
    } catch (error) {
      logger.warn(
        `Story page length: repair pass failed, keeping original text: ${
          error instanceof Error ? error.message : String(error)
        }`
      );

      return script;
    }
  }

  /**
   * Turn a parent's idea into a reusable custom template.
   *
   * The returned document is validated to contain exactly 14 beats so the
   * custom path produces the same book shape as the predefined templates. The
   * model occasionally returns the wrong number of beats, so one repair pass is
   * attempted before giving up; the beat count itself is never fudged.
   */
  async generateCustomTemplate(input: {
    idea: string;
    setting?: string;
    extras?: string;
    message?: string;
    ageRange: "3-5" | "6-8" | "9-12";
  }): Promise<{
    name: string;
    description: string;
    category: string;
    difficulty: number;
    tags: string[];
    prompts: StoryTemplatePrompts;
  }> {
    const guidance = AGE_GUIDANCE[input.ageRange];
    const pageCount = STORYBOOK_PAGE_COUNT;
    const systemPrompt =
      "You are a professional children's storybook designer. Always respond with valid JSON only, no markdown.";

    const beatSlots = Array.from({ length: pageCount }, (_, index) => `"beat ${index + 1}"`)
      .join(", ");

    const prompt = `
You are a children's storybook designer. A parent wants a personalized storybook for a ${input.ageRange} year old child.

The parent's idea:
"""
${input.idea}
"""
${input.setting ? `\nSetting they want: "${input.setting}"` : ""}
${input.extras ? `\nThings they want to include: "${input.extras}"` : ""}
${input.message ? `\nMessage the story should teach: "${input.message}"` : ""}

Design ONE reusable story template with these rules:
- A short, warm, kid-friendly template name (2-5 words) and a one-sentence description for a parent to read.
- The "beats" array MUST contain exactly ${pageCount} strings. Count them before you answer: ${pageCount} items, no more, no fewer.
- Each beat is ONE sentence of 12-25 words describing what happens on that page from the hero's point of view. No page numbers, no dialogue quotes, no text or signs.
- Follow this fixed arc, one beat per page:
  1. hook (the hero's ordinary world, something begins)
  2. discovery (what sets the adventure in motion)
  3. first challenge
  4. a helper or friend appears
  5. a bigger obstacle
  6. a setback or mistake
  7. a clever idea
  8. midpoint triumph
  9. a complication
  10. deeper trouble
  11. the low point
  12. the turning point
  13. resolution where the lesson is lived out
  14. a warm, gentle closing
- Keep the story safe, kind and age-appropriate. No violence, no scary imagery, no weapons, no romance, no brand names, no real people.
- Write everything in English, with simple and clear vocabulary suitable for a ${input.ageRange} year old: ${guidance.language}.
- Give 3-5 short lowercase tags describing the template (for example: adventure, friendship, courage).
- The moral lesson and the educational focus must be one short sentence each.

Return ONLY valid JSON, with exactly ${pageCount} items in "beats":

{
  "name": "Template name",
  "description": "One sentence for a parent",
  "category": "adventure | friendship | bedtime | fantasy | learning | animals | family | nature",
  "difficulty": 1,
  "tags": ["tag", "tag"],
  "prompts": {
    "theme": "One sentence describing the whole story arc",
    "moralLesson": "One sentence",
    "educationalFocus": "One sentence",
    "worldContext": "One or two sentences describing where the story happens",
    "beats": [${beatSlots}]
  }
}
`;

    const parse = (
      raw: Record<string, unknown>
    ): {
      name: string;
      description: string;
      category: string;
      difficulty: number;
      tags: string[];
      prompts: StoryTemplatePrompts;
    } => {
      const name = typeof raw.name === "string" ? raw.name.trim() : "";
      const description =
        typeof raw.description === "string" ? raw.description.trim() : "";
      const category = normalizeStoryCategory(
        typeof raw.category === "string" ? raw.category : undefined
      );
      const difficultyRaw = Number(raw.difficulty);
      const difficulty = Number.isFinite(difficultyRaw)
        ? Math.min(3, Math.max(1, Math.round(difficultyRaw)))
        : 1;
      const tags = Array.isArray(raw.tags)
        ? raw.tags
            .filter((tag: unknown): tag is string => typeof tag === "string")
            .map((tag: string) => tag.trim().toLowerCase())
            .filter(Boolean)
            .slice(0, 5)
        : [];

      const rawPrompts = (raw.prompts ?? {}) as Partial<StoryTemplatePrompts>;
      const beats = Array.isArray(rawPrompts.beats)
        ? rawPrompts.beats.filter(
            (beat: unknown): beat is string =>
              typeof beat === "string" && beat.trim().length > 0
          )
        : [];

      if (!name || !description) {
        throw new Error(
          "The generated template is missing a name or description"
        );
      }

      if (beats.length !== pageCount) {
        throw new Error(
          `The generated template must contain exactly ${pageCount} beats, received ${beats.length}`
        );
      }

      return {
        name,
        description,
        category,
        difficulty,
        tags,
        prompts: {
          theme: String(rawPrompts.theme ?? input.idea).trim(),
          moralLesson: String(rawPrompts.moralLesson ?? "").trim(),
          educationalFocus: String(rawPrompts.educationalFocus ?? "").trim(),
          worldContext: String(
            rawPrompts.worldContext ?? input.setting ?? ""
          ).trim(),
          beats: beats.map((beat) => beat.trim()),
        },
      };
    };

    const raw = await this.invokeJsonLLM(prompt, systemPrompt, {
      maxTokens: 2000,
      temperature: 0.8,
    });

    try {
      return parse(raw);
    } catch (error) {
      // One repair pass: show the model what it produced and ask for the fix.
      logger.warn(
        { err: error },
        "Custom template attempt failed validation, retrying once"
      );

      const repaired = await this.invokeJsonLLM(
        `${prompt}

Your previous answer was rejected with this error:
"""
${error instanceof Error ? error.message : String(error)}
"""

Here is what you returned:
"""
${JSON.stringify(raw)}
"""

Return the corrected JSON with exactly ${pageCount} items in "beats". Do not add commentary.`,
        systemPrompt,
        { maxTokens: 2000, temperature: 0.4 }
      );

      return parse(repaired);
    }
  }

  /**
   * Create story and pages in the database.
   */
  async createStory(
    userId: string,
    modelId: string,
    script: StoryScript,
    artStyle: string,
    personalization?: Partial<PersonalizedStoryInput> & {
      includeAudio?: boolean;
      voiceId?: string;
    }
  ) {
    const story = await prismaClient.story.create({
      data: {
        title: script.title,
        userId,
        modelId,
        status: "Generating",
        childName: personalization?.childName,
        childAge: personalization?.childAge,
        // Every book has the same 14-page shape, so the legacy storyLength
        // column is no longer written; the template row is the source of truth.
        category: normalizeStoryCategory(
          personalization?.template?.category
        ),
        dedication: personalization?.dedication,
        templateId: personalization?.template?.id,
        includeAudio: personalization?.includeAudio || false,
        voiceId: personalization?.voiceId || "sarah",
      },
    });

    const pages = await Promise.all(
      script.pages.map((page) =>
        prismaClient.storyPage.create({
          data: {
            storyId: story.id,
            pageNumber: page.pageNumber,
            content: page.text,

            // Child name is intentionally NOT passed here.
            imagePrompt: this.buildImagePrompt(page),

            status: "Pending",
          },
        })
      )
    );

    logger.info(
      {
        storyId: story.id,
        pageCount: pages.length,
      },
      "Story created"
    );

    saveJsonLocally(
      { story, script },
      `story_${story.id}`
    );

    return { story, pages };
  }

  /**
   * Build the image-generation prompt.
   *
   * Returns only the scene description for a page; identity, art style,
   * composition, quality and no-text rules are assembled by the
   * Grok Imagine prompt builder in image-generation.service.ts.
   * The first scene changes with the story like every other page.
   */
  private buildImagePrompt(
    page: StoryPageInput
  ): string {
    return page.imageDescription;
  }

  /**
   * Trigger face-consistent image generation.
   */
  async triggerPageGeneration(
    pageId: string,
    prompt: string,
    referenceImageUrl?: string | null,
    options?: { childName?: string; position?: "left" | "right"; artStyle?: string }
  ) {
    try {
      const page = await prismaClient.storyPage.findUnique({
        where: { id: pageId },
        select: { pageNumber: true, storyId: true },
      });
      if (!page) return { requestId: "" };

      // The cover and closing pages are generated and rendered as single 1:1
      // square pages, so we need the story's total page count to know which
      // page is the last one.
      const totalPages = await prismaClient.storyPage.count({
        where: { storyId: page.storyId },
      });
      const isSquarePage = isSquareBookPage(page.pageNumber, totalPages);

      let position: "left" | "right" = options?.position || "right";
      if (!options?.position) {
        const comp = getPageComposition(page.pageNumber, totalPages);
        position = comp.characterSide === "left" ? "left" : "right";
      }

      const scenePrompt = options?.childName
        ? `${options.childName} ${prompt.trim()}`
        : prompt;

      const { requestId } =
        await this.faceConsistency.generateFaceConsistentImage(
          {
            prompt: scenePrompt,
            referenceImageUrl: referenceImageUrl || undefined,
            aspectRatio: getPageAspectRatio(page.pageNumber, totalPages),
            childName: options?.childName,
            edgePlacementSide: isSquarePage ? undefined : position,
            artStyle: options?.artStyle,
          },
          STORY_WEBHOOK
        );

      await prismaClient.storyPage.update({
        where: { id: pageId },
        data: {
          falAiRequestId: requestId,
          status: "Pending",
        },
      });

      logger.info(
        { pageId, requestId },
        "Page generation triggered"
      );

      return { requestId };
    } catch (error) {
      logger.error(
        { error, pageId },
        "Failed to trigger page generation"
      );

      await prismaClient.storyPage.update({
        where: { id: pageId },
        data: {
          status: "Failed",
        },
      });

      throw error;
    }
  }

  /**
   * Retry failed page generation.
   */
  async retryPageGeneration(pageId: string) {
    const page = await prismaClient.storyPage.findUnique({
      where: { id: pageId },
      include: {
        story: {
          include: {
            model: true,
          },
        },
      },
    });

    if (!page) {
      throw new Error("Page not found");
    }

    if (!page.story.model.tensorPath) {
      throw new Error("Model not trained");
    }

    return this.triggerPageGeneration(
      pageId,
      page.imagePrompt,
      page.story.model.thumbnail
    );
  }

  /**
   * Get story with generation status.
   */
  async getStoryWithStatus(
    storyId: string,
    userId: string
  ) {
    const story = await prismaClient.story.findFirst({
      where: {
        id: storyId,
        userId,
      },
      include: {
        pages: {
          orderBy: {
            pageNumber: "asc",
          },
        },
        model: true,
      },
    });

    if (!story) {
      return null;
    }

    const generatedPages = story.pages.filter(
      (p) => p.status === "Generated"
    ).length;

    const failedPages = story.pages.filter(
      (p) => p.status === "Failed"
    ).length;

    const progress = story.pages.length
      ? Math.round(
        (generatedPages / story.pages.length) * 100
      )
      : 0;

    if (
      story.status === "Generating" ||
      story.status === "Pending"
    ) {
      const pendingCount = story.pages.filter(
        (p) => p.status === "Pending"
      ).length;

      if (pendingCount > 0) {
        logger.info(
          {
            storyId,
            pendingCount,
            totalPages: story.pages.length,
          },
          "Story has pending pages"
        );
      }

      const lastCheckAt = this.pendingCheckAt.get(storyId) ?? 0;
      const cooldownElapsed =
        Date.now() - lastCheckAt >= StoryService.PENDING_CHECK_COOLDOWN_MS;

      if (cooldownElapsed) {
        this.pendingCheckAt.set(storyId, Date.now());
        this.checkPendingPages(story as any).catch(
          (error) => {
            logger.error(
              { error, storyId },
              "Failed to check pending pages"
            );
          }
        );
      }
    }

    return {
      ...story,
      progress,
      generatedPages,
      failedPages,
      totalPages: story.pages.length,
    };
  }

  /**
   * Invoke LLM for story generation via OpenAI only.
   */
  private async invokeLLM(
    prompt: string
  ): Promise<StoryScript> {
    const openAiKey = env.OPENAI_API_KEY;

    if (!openAiKey) {
      logger.error(
        "Story generation: OPENAI_API_KEY is not configured"
      );

      throw new Error(
        "OpenAI API key is not configured"
      );
    }

    return await this.invokeOpenAI(prompt);
  }

  /**
   * Ask the model for a JSON document. This is the shared transport: it only
   * guarantees well-formed JSON, so callers that need a different shape (a
   * template document, for example) can reuse it.
   */
  private async invokeJsonLLM(
    prompt: string,
    systemPrompt: string,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<Record<string, unknown>> {
    const openAiKey = env.OPENAI_API_KEY;

    if (!openAiKey) {
      logger.error(
        "OpenAI generation: OPENAI_API_KEY is not configured"
      );

      throw new Error(
        "OpenAI API key is not configured"
      );
    }

    logger.info(
      "Generating JSON document with OpenAI (gpt-4o-mini)"
    );

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: options?.maxTokens ?? 3000,
          temperature: options?.temperature ?? 0.7,
          response_format: {
            type: "json_object",
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();

      logger.error(
        {
          status: response.status,
          err,
        },
        "OpenAI API error"
      );

      throw new Error(
        `OpenAI API error: ${response.status} - ${err}`
      );
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const rawOutput = data.choices?.[0]?.message?.content || "";

    logger.info(
      {
        outputLength: rawOutput.length,
      },
      "OpenAI JSON document received"
    );

    return JSON.parse(rawOutput) as Record<string, unknown>;
  }

  /**
   * Generate story text using OpenAI.
   */
  private async invokeOpenAI(
    prompt: string,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<StoryScript> {
    // A full book is 14 pages of story text plus 14 four-zone image
    // descriptions. The default 3k cap forced the model to compress every
    // page, so it gets real headroom here.
    const parsed = (await this.invokeJsonLLM(
      prompt,
      "You are a professional children's book author. Always respond with valid JSON only, no markdown.",
      { maxTokens: 8000, temperature: 0.8, ...options }
    )) as unknown as StoryScript;

    if (
      !parsed.title ||
      !Array.isArray(parsed.pages)
    ) {
      throw new Error(
        "Invalid story structure from OpenAI"
      );
    }

    logger.info(
      {
        title: parsed.title,
        pageCount: parsed.pages.length,
      },
      "Story script generated via OpenAI"
    );

    return parsed;
  }

  private getAgeRange(
    age: number
  ): keyof typeof AGE_GUIDANCE {
    if (age <= 5) return "3-5";
    if (age <= 8) return "6-8";

    return "9-12";
  }

  /**
   * Validate story structure before image/PDF generation.
   */
  private ensureStoryScript(
    script: StoryScript,
    expectedPageCount: number
  ): StoryScript {
    if (
      !script?.title?.trim() ||
      !Array.isArray(script.pages) ||
      script.pages.length !== expectedPageCount
    ) {
      throw new Error(
        `Story script must include a title and exactly ${expectedPageCount} pages`
      );
    }

    const pages = script.pages
      .slice()
      .sort(
        (a, b) => a.pageNumber - b.pageNumber
      )
      .map((page, index) => {
        const pageNumber = index + 1;
        const totalPages = script.pages.length;

        // Page 1 is the cover: its body text is never rendered in the PDF
        // (the title is drawn by the PDF service), so it may be empty.
        const isCover = pageNumber === 1;

        if (isCover) {
          if (!page?.imageDescription?.trim()) {
            throw new Error(
              `Story page 1 is missing  direction`
            );
          }
        } else if (
          !page?.text?.trim() ||
          !page?.imageDescription?.trim()
        ) {
          throw new Error(
            `Story page ${pageNumber} is missing text or  direction`
          );
        }

        return {
          ...page,
          pageNumber,
          text: (page?.text ?? "").trim(),
          emotion:
            page.emotion?.trim() || "curious",
          pageType: getPageType(pageNumber, totalPages),
          imageAspectRatio: getPageAspectRatio(pageNumber, totalPages),
        };
      });

    return {
      title: script.title.trim(),
      pages,
    };
  }

  /**
   * Check pages that may have missed their webhook.
   */
  private async checkPendingPages(story: {
    id: string;
    pages: {
      id: string;
      status: string;
      falAiRequestId: string | null;
      updatedAt: Date;
      pageNumber: number;
    }[];
    model: {
      thumbnail: string | null;
    };
  }) {
    const pendingPages = story.pages.filter(
      (p) =>
        p.status === "Pending" &&
        p.falAiRequestId &&
        Date.now() -
        new Date(p.updatedAt).getTime() >
        10000
    );

    if (pendingPages.length === 0) {
      return;
    }

    logger.info(
      {
        storyId: story.id,
        pendingCount: pendingPages.length,
      },
      "Checking pending pages"
    );

    await Promise.allSettled(
      pendingPages.map(async (page) => {
        try {
          const endpoint = story.model.thumbnail
            ? GROK_IMAGINE_EDIT_MODEL
            : GROK_IMAGINE_MODEL;

          const result = await fal.queue.result(
            endpoint,
            {
              requestId: page.falAiRequestId!,
            }
          );

          const imageUrl = (
            result.data as any
          )?.images?.[0]?.url;

          if (!imageUrl) {
            return;
          }

          logger.info(
            {
              pageId: page.id,
              requestId: page.falAiRequestId,
            },
            "Retrieved image from fal.ai queue"
          );

          const localImageUrl =
            await saveRemoteImageLocally(
              imageUrl,
              "generated",
              `story_${story.id}_p${page.pageNumber}`
            );

          await prismaClient.storyPage.update({
            where: {
              id: page.id,
            },
            data: {
              imageUrl: localImageUrl,
              status: "Generated",
            },
          });

          await this.storyCompletion.checkStoryCompletion(
            story.id
          );
        } catch (error) {
          logger.warn(
            {
              error,
              pageId: page.id,
              requestId: page.falAiRequestId,
            },
            "Failed to check fal.ai status for page"
          );
        }
      })
    );
  }
}

export const storyService =
  StoryService.getInstance();