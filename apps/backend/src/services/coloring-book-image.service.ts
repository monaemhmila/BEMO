import { fal } from "@fal-ai/client";
import { logger } from "../lib/logger";
import sharp from "sharp";
import { safeFetchAndValidateImage } from "../lib/safe-image-fetcher";

/** Dedicated image generator for the admin coloring-book experiment. */
export class ColoringBookImageService {
  async generateCover(input: {
    childName?: string | null;
    title: string;
    scene: string;
    referenceImageUrl: string;
  }): Promise<Buffer> {
    const prompt = [
      "Full-color children's storybook cover illustration in a polished simple animated 2D style.",
      "Make the child the clear hero in a joyful, magical adventure scene with one or two supporting story elements.",
      "Preserve the child's face shape, hair, skin tone, age, and recognizable identity from the reference image.",
      "Use a bright, warm, child-friendly palette and leave open space at the top for the title.",
      "Do not copy the photo background. No watermark, no extra text, no letters, no logos, no photorealism, no clutter, no anatomy errors.",
      `Book title: ${input.title}. Child: ${input.childName || "the child"}. Cover scene: ${input.scene}`,
    ].join(" ");

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
    if (!imageUrl) throw new Error("Coloring-book cover generation returned no image");
    const generated = await safeFetchAndValidateImage(imageUrl);
    return sharp(generated.buffer).flatten({ background: "#ffffff" }).png().toBuffer();
  }

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
      "Add only 3 to 5 story-relevant objects and a few playful decorative details so the page stays easy for a child to color.",
      "Keep generous white negative space and leave a clean margin; the PDF layout adds the page frame.",
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
