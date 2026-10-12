import { fal } from "@fal-ai/client";
import { logger } from "../lib/logger";
import sharp from "sharp";
import { safeFetchAndValidateImage } from "../lib/safe-image-fetcher";

/** Dedicated image generator for the admin coloring-book experiment. */
export class ColoringBookImageService {
  async generatePage(input: {
    childName?: string | null;
    scene: string;
    referenceImageUrl: string;
    pageNumber: number;
  }): Promise<Buffer> {
    const prompt = [
      "Black and white printable children's coloring-book page.",
      "Clean bold ink outlines, simple friendly shapes, large open areas for crayons, white background.",
      "No shading, no gray fills, no color, no gradients, no text, no watermark, no border.",
      `Keep the child in the reference photo recognizable as ${input.childName || "the child"}; preserve face shape, hair, facial structure, and age.`,
      `Scene: ${input.scene}`,
    ].join(" ");

    try {
      const response = await fal.subscribe("xai/grok-imagine-image/edit", {
        input: {
          prompt,
          image_urls: [input.referenceImageUrl],
          aspect_ratio: "1:1",
          resolution: "2k",
          output_format: "png",
          num_images: 1,
        },
      });
      const imageUrl = (response.data as { images?: Array<{ url?: string }> })?.images?.[0]?.url;
      if (!imageUrl) throw new Error("Coloring-book image generation returned no image");

      // Enforce the output contract after generation: one grayscale threshold
      // turns any accidental color or gray wash into pure black/white art.
      const generated = await safeFetchAndValidateImage(imageUrl);
      return sharp(generated.buffer)
        .flatten({ background: "#ffffff" })
        .grayscale()
        .threshold(205)
        .png()
        .toBuffer();
    } catch (error) {
      logger.error({ error, pageNumber: input.pageNumber }, "Coloring-book page generation failed");
      throw error;
    }
  }
}

export const coloringBookImageService = new ColoringBookImageService();
