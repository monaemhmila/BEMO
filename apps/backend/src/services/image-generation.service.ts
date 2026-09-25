import { fal } from "@fal-ai/client";
import { logger } from "../lib/logger";
import { env } from "../config/env";
import {
  STORYBOOK_IMAGE_ASPECT_RATIO,
  STORYBOOK_NEGATIVE_PROMPT,
} from "../contracts/storybook";
import { buildStorybookImagePrompt } from "./image-style.service";

interface ImageGenerationRequest {
  prompt: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "3:2" | "2:3";
  seed?: number;
  imageUrl?: string;
  childName?: string;
  artStyle?: string;
  /** Internal: keep set after fal content-policy rejections. */
  sanitizePolicy?: boolean;
  /** Anchor the child to the far edge (left/right) in the final image
   *  (middle pages only). */
  edgePlacementSide?: "left" | "right";
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
   * Upload a face-crop reference to Fal storage ONCE per story so every page
   * call can reuse the same public URL instead of re-uploading the client's
   * raw photo. Non-data URLs are returned unchanged.
   */
  async uploadReferenceImage(url: string): Promise<string> {
    return this.ensurePublicImageUrl(url);
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
      const isPolicyViolation = this.isContentPolicyError(error);

      // Content-policy flags never resolve on identical prompts, so rephrase
      // the prompt to policy-safe wording before retrying instead of repeating
      // the exact same failing request.
      const retryRequest: ImageGenerationRequest = isPolicyViolation
        ? { ...request, sanitizePolicy: true }
        : request;

      if (retryCount < this.maxRetries) {
        logger.warn(
          { error, retryCount, policyViolation: isPolicyViolation },
          "Image generation failed, retrying"
        );

        await this.delay(this.retryDelays[retryCount] || 4000);

        return this.generateImageSync(retryRequest, retryCount + 1);
      }

      logger.error(
        { error, prompt: request.prompt },
        "Image generation failed after retries"
      );

      throw error;
    }
  }

  /**
   * Detect fal.ai content-checker rejections (422 "content_policy_violation").
   */
  private isContentPolicyError(error: unknown): boolean {
    const err = error as any;
    const details: unknown[] = Array.isArray(err?.body?.detail)
      ? err.body.detail
      : [];
    return details.some(
      (d: any) =>
        typeof d?.type === "string" &&
        d.type.toLowerCase().includes("content_policy")
    );
  }

  /**
   * Build Grok Imagine input.
   */
  private buildInput(request: ImageGenerationRequest, referenceUrl?: string) {
    const input: Record<string, unknown> = {
      prompt: this.buildGrokPrompt(request),

      negative_prompt: STORYBOOK_NEGATIVE_PROMPT,

      num_images: 1,

      // Square 16:9 frame (210x210 mm page); rendered directly by the PDF service.
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
   * Assemble the fixed storybook illustration prompt template from the scene
   * description, selected art style, per-page aspect ratio and - for middle
   * pages - the edge placement rule.
   */
  buildStorybookImagePrompt(input: {
    sceneDescription: string;
    artStyle?: string;
    aspectRatio?: string;
    edgePlacementSide?: "left" | "right";
  }): string {
    return buildStorybookImagePrompt(input);
  }

  /**
   * Assemble the final prompt string for the Grok Imagine API from the single
   * storybook template. The template is already policy-safe (it never refers
   * to a "real child photograph"), so content-policy retries reuse it as-is.
   */
  private buildGrokPrompt(request: ImageGenerationRequest): string {
    return buildStorybookImagePrompt({
      sceneDescription: request.prompt.trim(),
      artStyle: request.artStyle,
      aspectRatio: request.aspectRatio,
      edgePlacementSide: request.edgePlacementSide,
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const imageGenerationService =
  ImageGenerationService.getInstance();