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
      "Professional black-and-white printable children's coloring-book illustration, designed by a children's book illustrator.",
      "Create a polished full-page composition with the child as the clear central hero, a strong foreground, a detailed middle ground, and a charming background.",
      "Use confident thick outer contour lines, varied clean interior line weights, closed shapes, expressive faces, natural anatomy, and large areas that are easy to color with crayons.",
      "Add 5 to 8 story-relevant objects and playful decorative details such as stars, leaves, clouds, flowers, bubbles, or small patterns that support the scene without making it crowded.",
      "Use a tasteful rounded ornamental coloring-page frame with small scene-related corner motifs, balanced margins, and generous white negative space.",
      "Pure white paper with pure black ink only: no color, no gray, no shading, no gradients, no halftones, no watercolor, no realism, no text, no letters, no logos, no watermark.",
      "Do not crop the child's head, hands, or feet. Keep every important object fully inside the page and make the composition feel finished, balanced, and ready to print.",
      `Use the reference photo only for the identity of ${input.childName || "the child"}; preserve face shape, hair, facial structure, and age, but do not copy the photo background.`,
      `Story scene and action: ${input.scene}`,
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
