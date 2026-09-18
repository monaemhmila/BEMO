import { fal } from "@fal-ai/client";
import { env } from "../config/env";
import { logger } from "../lib/logger";

const IMAGE_WEBHOOK = env.WEBHOOK_BASE_URL?.concat("/fal-ai/webhook/image") ?? "";

export class FalAIModel {
  // Image generation
  async generateImage(prompt: string, tensorPath: string) {
    logger.info({ promptLength: prompt.length, tensorPath }, "Submitting image generation to fal.ai");

    const { request_id, response_url } = await fal.queue.submit(
      "",
      {
        input: {
          prompt,
          loras: [{ path: tensorPath, scale: 1 }],
        },
        webhookUrl: IMAGE_WEBHOOK || undefined,
      }
    );

    logger.info({ requestId: request_id }, "Image generation submitted");
    return { requestId: request_id, responseUrl: response_url };
  }

  async generateImageSync(tensorPath: string): Promise<string> {
    logger.info({ tensorPath }, "Generating hero preview image synchronously");
    try {
      const response = await fal.subscribe("", {
        input: {
          prompt:
            "A professional portrait photo of the person, centered, high quality, studio lighting, 4k resolution, looking at camera, friendly expression",
          loras: [{ path: tensorPath, scale: 1 }],
          num_inference_steps: 28,
          guidance_scale: 1.5,
          image_size: { width: 1024, height: 1024 },
        },
      });

      const imageUrl = (response.data as any)?.images?.[0]?.url ?? "";

      if (imageUrl) {
        logger.info({ imageUrl }, "Hero preview image generated successfully");
      } else {
        logger.warn({ response: response.data }, "No image URL in response");
      }

      return imageUrl;
    } catch (error) {
      logger.error({ error, tensorPath }, "Failed to generate hero preview image");
      throw error;
    }
  }

  /** Regenerate thumbnail for an existing model */
  async regenerateThumbnail(modelId: string, tensorPath: string): Promise<string> {
    logger.info({ modelId, tensorPath }, "Regenerating model thumbnail");
    return this.generateImageSync(tensorPath);
  }
}

