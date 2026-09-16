import { fal } from "@fal-ai/client";
import { logger } from "../lib/logger";
import { env } from "../config/env";
import {
  STORYBOOK_IMAGE_ASPECT_RATIO,
  STORYBOOK_NEGATIVE_PROMPT,
  getPageComposition,
} from "../contracts/storybook";

interface ImageGenerationRequest {
  prompt: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "3:2" | "2:3";
  seed?: number;
  imageUrl?: string;
  childName?: string;
  /** Page number in the 16-page storybook, used to derive the text-safe area. */
  pageNumber?: number;
}

interface ImageGenerationResult {
  requestId: string;
  success: boolean;
  error?: string;
}

export const GROK_IMAGINE_MODEL = "xai/grok-imagine-image";
export const GROK_IMAGINE_EDIT_MODEL = "xai/grok-imagine-image/edit";

/**
 * Dedicated storybook image configuration so storybook-specific values are
 * not scattered across the codebase.
 */
export const STORYBOOK_IMAGE_CONFIG = {
  aspectRatio: STORYBOOK_IMAGE_ASPECT_RATIO as "16:9",
  resolution: "2k" as const,
  outputFormat: "jpeg" as const,
  quality: "best" as const,
  childFramePercent: "roughly 12-20% of the frame",
};

const STORY_PAGE_WEBHOOK = env.WEBHOOK_BASE_URL
  ? `${env.WEBHOOK_BASE_URL}/api/webhook/story/page`
  : undefined;

export class ImageGenerationService {
  private static instance: ImageGenerationService;

  private maxRetries = 3;
  private retryDelays = [1000, 2000, 4000];

  static getInstance(): ImageGenerationService {
    if (!ImageGenerationService.instance) {
      ImageGenerationService.instance = new ImageGenerationService();
    }

    return ImageGenerationService.instance;
  }

  /**
   * Upload base64 images to Fal storage so they can be used as references.
   */
  private async ensurePublicImageUrl(url: string): Promise<string> {
    if (!url.startsWith("data:")) {
      return url;
    }

    try {
      const base64Data = url.split(",")[1];

      if (!base64Data) {
        throw new Error("Invalid image data");
      }

      const mimeType = url.match(/data:(.*?);/)?.[1] || "image/jpeg";
      const buffer = Buffer.from(base64Data, "base64");

      const file = new File(
        [new Blob([buffer], { type: mimeType })],
        `child-reference-${Date.now()}.jpg`,
        { type: mimeType }
      );

      return await fal.storage.upload(file);
    } catch (error) {
      logger.error({ error }, "Failed to upload child reference image");
      throw error;
    }
  }

  /**
   * Queue storybook image generation.
   */
  async generateStorybookImage(
    request: ImageGenerationRequest,
    webhookUrl?: string
  ): Promise<ImageGenerationResult> {
    try {
      const referenceUrl = request.imageUrl
        ? await this.ensurePublicImageUrl(request.imageUrl)
        : undefined;

      const { request_id } = await fal.queue.submit(
        this.getEndpoint(referenceUrl),
        {
          input: this.buildInput(request, referenceUrl),
          webhookUrl: webhookUrl || STORY_PAGE_WEBHOOK || undefined,
        }
      );

      logger.info(
        {
          requestId: request_id,
          hasReference: !!referenceUrl,
          model: referenceUrl
            ? GROK_IMAGINE_EDIT_MODEL
            : GROK_IMAGINE_MODEL,
        },
        "Storybook image queued"
      );

      return {
        requestId: request_id,
        success: true,
      };
    } catch (error) {
      logger.error(
        { error, prompt: request.prompt },
        "Failed to queue storybook image"
      );

      return {
        requestId: "",
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Generate image synchronously with retry logic.
   */
  async generateImageSync(
    request: ImageGenerationRequest,
    retryCount = 0
  ): Promise<string> {
    try {
      const referenceUrl = request.imageUrl
        ? await this.ensurePublicImageUrl(request.imageUrl)
        : undefined;

      const response = await fal.subscribe(
        this.getEndpoint(referenceUrl),
        {
          input: this.buildInput(request, referenceUrl),
        }
      );

      const imageUrl = (response.data as any)?.images?.[0]?.url || "";

      if (!imageUrl) {
        throw new Error("Grok Imagine returned no image");
      }

      return imageUrl;
    } catch (error) {
      if (retryCount < this.maxRetries) {
        logger.warn(
          { error, retryCount },
          "Image generation failed, retrying"
        );

        await this.delay(this.retryDelays[retryCount] || 4000);

        return this.generateImageSync(request, retryCount + 1);
      }

      logger.error(
        { error, prompt: request.prompt },
        "Image generation failed after retries"
      );

      throw error;
    }
  }

  /**
   * Build Grok Imagine input.
   */
  private buildInput(request: ImageGenerationRequest, referenceUrl?: string) {
    const input: Record<string, unknown> = {
      prompt: this.buildGrokPrompt(request),

      num_images: 1,

      // Landscape 16:9 wide cinematic frame; cropped to A4 by the PDF service.
      aspect_ratio: request.aspectRatio || STORYBOOK_IMAGE_CONFIG.aspectRatio,

      resolution: STORYBOOK_IMAGE_CONFIG.resolution,

      output_format: STORYBOOK_IMAGE_CONFIG.outputFormat,
    };

    if (request.seed !== undefined) {
      input.seed = request.seed;
    }

    if (referenceUrl) {
      input.image_urls = [referenceUrl];
    }

    return input;
  }

  /**
   * Use the edit model when a child reference is available.
   */
  private getEndpoint(referenceUrl?: string) {
    return referenceUrl
      ? GROK_IMAGINE_EDIT_MODEL
      : GROK_IMAGINE_MODEL;
  }

  /**
   * Build a structured storybook image prompt from shared data.
   *
   * The same page composition that drives the PDF text layout also reserves
   * the text-safe area here, so text and art never collide.
   */
  buildStorybookImagePrompt(input: {
    sceneDescription: string;
    childName?: string;
    textSafeArea?: string;
    characterSide?: "left" | "right";
    sideCharacterArea?: string;
    negativePrompt: string;
  }): string {
    const { sceneDescription, childName, textSafeArea, characterSide, sideCharacterArea, negativePrompt } = input;

    const characterPlacement =
      characterSide === "left"
        ? `The child stands at the FAR LEFT EDGE of the frame, clearly on the left side and never in the middle, opposite the story text. ${sideCharacterArea || ""}.`
        : characterSide === "right"
          ? `The child stands at the FAR RIGHT EDGE of the frame, clearly on the right side and never in the middle, opposite the story text. ${sideCharacterArea || ""}.`
          : "";

    return `
CHARACTER: ${childName || "The child"} is the main character and hero of the story. Keep the child natural, age-appropriate, and recognizable throughout every page.

SCENE: ${sceneDescription.trim()}

SETTING & DETAILS: Design an EPIC, very large and expansive storybook environment that dominates the entire 16:9 landscape frame. The scenery must feel huge and sweeping - towering enchanted forests with gigantic trees, vast rolling hills reaching to the horizon, towering snowy mountains, enormous crystal caves, a wide starry sky, a mighty castle on a cliff, or a vast ocean. Everything is oversized and breathtaking, filling far more of the image than the child. Add small, delightful background details that make every scene feel alive and hand-crafted: lush plants and colorful flowers, softly glowing fairy lights or hanging lanterns, floating petals and sparkles, tiny playful animals, gentle light beams, drifting clouds, and soft weather particles. Layer the scenery for depth - large foreground elements, the vast main environment in the middle, and a dreamy softly-blurred backdrop behind. The environment is the star of the image; the child stands within it as a small hero.
${textSafeArea ? `
TEXT SAFE AREA: Reserve the text-safe area for the story text: ${textSafeArea.trim()}. This area must blend perfectly into the rest of the illustration - same colors, same lighting, same background - so it looks like one continuous painted scene and never like a separate strip.
` : ""}
${characterPlacement ? `
CHARACTER PLACEMENT: ${characterPlacement}
` : ""}
NO BANDING: The whole image is ONE continuous scene from top to bottom. Sky, land and background all blend naturally into each other with the same color palette everywhere. Never split the image into a top zone and a bottom zone, never add a dark or brown patch at the bottom, never add a vignette, a hard edge, an out-of-place color block or a horizontal strip.
ART STYLE: Premium 3D children's storybook illustration with a polished animated-film aesthetic. Natural human child proportions, realistic facial features, detailed hair and clothing, soft realistic skin shading, subtle glossy materials, warm cinematic sunlight, gentle shadows, vibrant but natural colors, and beautiful atmospheric depth. The child should look like a real child beautifully translated into high-quality 3D storybook CGI.

COMPOSITION: Wide 16:9 landscape composition designed for a horizontal A4 page. The scenery is VERY BIG and fills the whole frame; the child is relatively small within it, ${STORYBOOK_IMAGE_CONFIG.childFramePercent}, placed at the far left or far right edge of the frame as instructed in CHARACTER PLACEMENT and NEVER in the middle or center of the image. Keep the face clearly visible and unobstructed even at that size. Natural pose and anatomy. Cinematic depth of field with large foreground elements and a vast, softly blurred background that still shows off the scenic details.

EXPRESSION & POSE: Give the child a natural, lively facial expression that matches the action and emotion of the scene (happy, surprised, curious, excited, proud, thoughtful, worried, gentle, or calm). Change the child's body posture naturally for each scene (standing, sitting, leaning, running, reaching, kneeling, holding, or hugging) so every page feels expressive and alive. Keep the face recognizable, pleasant, and age-appropriate.

QUALITY: High-end polished 3D CGI, natural expression, realistic facial proportions, clean anatomy, natural hands and fingers, detailed clothing and hair, warm lighting, beautiful depth and professional children's book quality.

NO TEXT anywhere in the image: ${negativePrompt.trim()}
`;
  }

  /**
   * Assemble the final prompt string and JSON-stringify it as
   * `{ "prompt": "..." }` for the Grok Imagine API.
   */
  private buildGrokPrompt(request: ImageGenerationRequest): string {
    const identity = request.imageUrl
      ? `
IDENTITY: Use the uploaded child reference image as the primary identity reference. Preserve the exact same child and recognizable facial identity. Keep the child's face shape, facial structure, eyes, eye color, nose, mouth, cheeks, ears, skin tone, skin color, hair color, hair texture, hairstyle, age, and natural body proportions. Do not change the child's ethnicity, skin color, facial structure, or age. Do not replace the child with a generic child.
`
      : "";

    const textSafeArea =
      request.pageNumber !== undefined
        ? getPageComposition(request.pageNumber).textSafeArea
        : undefined;

    const composition =
      request.pageNumber !== undefined
        ? getPageComposition(request.pageNumber)
        : undefined;

    const innerPrompt = this.buildStorybookImagePrompt({
      sceneDescription: `${identity.trim()}\n${request.prompt.trim()}`,
      childName: request.childName,
      textSafeArea,
      characterSide: composition?.characterSide,
      sideCharacterArea: composition?.sideCharacterArea,
      negativePrompt: STORYBOOK_NEGATIVE_PROMPT,
    });

    return JSON.stringify({ prompt: innerPrompt });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const imageGenerationService =
  ImageGenerationService.getInstance();