import { fal } from "@fal-ai/client";
import { prismaClient } from "../lib/prisma";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import { FaceConsistencyService } from "./face-consistency.service";
import { PositionOnCanvas } from "./face-canvas.service";
import { StoryCompletionService } from "./story-completion.service";
import { GROK_IMAGINE_MODEL, GROK_IMAGINE_EDIT_MODEL } from "./image-generation.service";
import { saveRemoteImageLocally, saveJsonLocally } from "../lib/storage";
import {
  STORYBOOK_PAGE_COUNT,
  getPageType,
  getPageComposition,
  PageType,
} from "../contracts/storybook";

interface PersonalizedStoryInput {
  childName: string;
  childAge: number;
  storyLength: "short" | "medium" | "long";
  category: string;
  dedication?: string;
  theme: string;
  language?: string;
}

interface StoryPageInput {
  pageNumber: number;
  text: string;
  imageDescription: string;
  emotion?: string;
  pageType?: PageType;
  imageAspectRatio?: "16:9";
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
    textLength: "2-3 short sentences per page (25-35 simple words)",
  },
  "6-8": {
    language: "simple and clear vocabulary, short complete sentences",
    themes: "adventure, problem-solving, friendship, family, nature",
    textLength: "3 short sentences per page (35-45 words)",
  },
  "9-12": {
    language: "clear and engaging vocabulary, short sentence structures",
    themes: "bravery, teamwork, moral lessons, discovery, mystery",
    textLength: "3-5 sentences per page (45-60 words)",
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
- Keep the hero as the main character.
- Do not include text, words, signs, billboards, book titles, logos, or speech bubbles in the image description.
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
    return this.withPageComposition(await this.invokeFal(prompt));
  }

  /**
   * Attach the deterministic page composition so every script page already
   * carries its pageType, textPosition and aspect ratio for image + PDF.
   * Also normalizes the script to exactly STORYBOOK_PAGE_COUNT pages: any
   * extra pages from the model are dropped and page numbers are renumbered
   * 1..16 so the book layout is always identical.
   */
  private withPageComposition(script: StoryScript): StoryScript {
    const ordered = [...script.pages]
      .slice()
      .sort((a, b) => a.pageNumber - b.pageNumber)
      .slice(0, STORYBOOK_PAGE_COUNT)
      .map((page, index) => {
        const pageNumber = index + 1;
        return {
          ...page,
          pageNumber,
          pageType: getPageType(pageNumber),
          imageAspectRatio: "16:9" as const,
        };
      });

    return {
      title: script.title,
      pages: ordered,
    };
  }

  /**
   * Generate a personalized age-appropriate story.
   */
  async generatePersonalizedStoryScript(
    characterName: string,
    input: PersonalizedStoryInput,
    characterProfile?: CharacterProfile
  ): Promise<StoryScript> {
    const ageRange = this.getAgeRange(input.childAge);
    const guidance = AGE_GUIDANCE[ageRange];
    const pageCount = this.getPageCount(input.storyLength);

    const prompt = `
Create a personalized children's story for a ${input.childAge}-year-old named "${input.childName}".

Story:
- Exactly ${pageCount} pages (pageNumber 1 through ${pageCount})
- Tone & Style: heartwarming, full of wonder, adventure, gentle humor, and emotional depth.
- Theme: ${input.theme}
- Category: ${input.category}
- ${guidance.language}
- ${guidance.textLength}
- Word budget: write rich, engaging story text of 45 to 60 words per page. Page 1 is a cover: give it only a short one-line hook.
- HEART & LESSON: weave into every page, naturally and never preachy, a gentle moral, a warm sentimental feeling, or a simple educational observation (kindness, honesty, courage, gratitude, friendship, curiosity, sharing, patience, how the world works, and so on).
- Themes: ${guidance.themes}
${input.language ? `- Language: ${input.language}` : ""}
${input.dedication ? `- Dedication: "${input.dedication}"` : ""}

${characterProfile?.appearance
        ? `Character appearance: ${characterProfile.appearance}`
        : "The uploaded reference image defines the character's real face and appearance."
      }

"${input.childName}" is the hero throughout the story and must stay the same recognizable child on every page.

Keep the story continuous and keep characters, clothing, locations, and important objects consistent.
Vary the setting from page to page so the scenes each feel fresh and beautiful.

For each page:
- Write the story text with warmth and charm.
- Create a visual scene description where the ENVIRONMENT and any SIDE CHARACTERS/CREATURES are colorful, imaginative, and detailed.
- The hero child retains their natural real appearance from their photo.
- Do not include text, letters, signs, billboards, book titles, logos, or speech bubbles in imageDescription.
- Do not use the child's name in imageDescription.
- Do not render any story text inside the image.
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
    return this.withPageComposition(await this.invokeFal(prompt));
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
        storyLength: personalization?.storyLength as any,
        category: personalization?.category as any,
        dedication: personalization?.dedication,
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
    options?: { childName?: string; position?: PositionOnCanvas }
  ) {
    try {
      const page = await prismaClient.storyPage.findUnique({
        where: { id: pageId },
        select: { pageNumber: true },
      });

      let position: PositionOnCanvas = options?.position || "center";
      if (!options?.position && page?.pageNumber) {
        if (page.pageNumber === 1) {
          position = "center";
        } else {
          const comp = getPageComposition(page.pageNumber);
          position = comp.characterSide === "left" ? "left" : "right";
        }
      }

      const scenePrompt = options?.childName
        ? `${options.childName} ${prompt.trim()}`
        : prompt;

      const { requestId } =
        await this.faceConsistency.generateFaceConsistentImage(
          {
            prompt: scenePrompt,
            referenceImageUrl: referenceImageUrl || undefined,
            aspectRatio: "16:9",
            childName: options?.childName,
            position,
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
   * Invoke LLM for story generation.
   * OpenAI is used first, Fal.ai is the fallback.
   */
  private async invokeFal(
    prompt: string
  ): Promise<StoryScript> {
    const openAiKey = env.OPENAI_API_KEY;

    if (openAiKey) {
      try {
        return await this.invokeOpenAI(
          prompt,
          openAiKey
        );
      } catch (err) {
        logger.warn(
          { error: err },
          "OpenAI generation failed, falling back to Fal.ai LLM"
        );
      }
    }

    try {
      logger.info(
        "Generating story script with Fal.ai LLM"
      );

      const result = await fal.subscribe(
        "fal-ai/any-llm",
        {
          input: {
            prompt,
            max_tokens: 3000,
            temperature: 0.7,
          } as any,
        }
      );

      const rawOutput =
        (result.data as any).output ||
        (result.data as any).text ||
        (result.data as any).response ||
        "";

      const jsonMatch =
        rawOutput.match(
          /```json\s*([\s\S]*?)\s*```/
        ) ||
        rawOutput.match(
          /```\s*([\s\S]*?)\s*```/
        ) || [null, rawOutput];

      const jsonPayload = (jsonMatch[1] || rawOutput)
        .replace(/```json\n?|```/g, "")
        .trim();

      const parsed = JSON.parse(
        jsonPayload
      ) as StoryScript;

      if (
        !parsed.title ||
        !Array.isArray(parsed.pages)
      ) {
        throw new Error(
          "Invalid story structure from Fal.ai LLM"
        );
      }

      return parsed;
    } catch (error) {
      logger.error(
        { error },
        "Story script generation failed on both OpenAI and Fal.ai"
      );

      throw new Error(
        "Story generation failed - OpenAI and Fal.ai LLM both unavailable"
      );
    }
  }

  /**
   * Generate story text using OpenAI.
   */
  private async invokeOpenAI(
    prompt: string,
    apiKey: string
  ): Promise<StoryScript> {
    logger.info(
      "Generating story script with OpenAI (gpt-4o-mini)"
    );

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
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
                "You are a professional children's book author. Always respond with valid JSON only, no markdown.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 3000,
          temperature: 0.7,
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

    const data = await response.json() as any;

    const rawOutput =
      data.choices?.[0]?.message?.content || "";

    logger.info(
      {
        outputLength: rawOutput.length,
      },
      "OpenAI story script received"
    );

    const parsed = JSON.parse(
      rawOutput
    ) as StoryScript;

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
   * Every story is a fixed landscape book with exactly 16 pages: page 1 is
   * the cover, pages 2-14 carry the story, page 15 the emotional ending and
   * page 16 the closing. The selected story length no longer affects the
   * number of pages.
   */
  private getPageCount(
    _length: PersonalizedStoryInput["storyLength"]
  ): number {
    return STORYBOOK_PAGE_COUNT;
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

        // Page 1 is the cover: its body text is never rendered in the PDF
        // (the title is drawn by the PDF service), so it may be empty.
        const isCover = pageNumber === 1;

        if (isCover) {
          if (!page?.imageDescription?.trim()) {
            throw new Error(
              `Story page 1 is missing illustration direction`
            );
          }
        } else if (
          !page?.text?.trim() ||
          !page?.imageDescription?.trim()
        ) {
          throw new Error(
            `Story page ${pageNumber} is missing text or illustration direction`
          );
        }

        return {
          ...page,
          pageNumber,
          text: (page?.text ?? "").trim(),
          emotion:
            page.emotion?.trim() || "curious",
          pageType: getPageType(pageNumber),
          imageAspectRatio: "16:9" as const,
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