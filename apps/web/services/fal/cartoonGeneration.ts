/**
 * Cartoon Image Generation Service
 *
 * Dedicated service for cartoon style storybook illustrations — the flagship
 * look is a Disney/Pixar-inspired 3D animated render. Also exposes the other
 * child-friendly art styles (photo realistic, watercolor, claymation, anime,
 * classic storybook and 3D cartoon) used by the storybook creator.
 */

export interface ArtStyleOption {
  id: string;
  name: string;
  emoji: string;
  prompt: string;
  description: string;
}

export const DEFAULT_ART_STYLE = "photo-realistic";

/**
 * Art style options for the /storybook/create selector.
 * The prompt fragment is sent to the backend and used to build the final
 * Grok Imagine prompt for every illustration.
 */
export const CARTOON_ART_STYLES: ArtStyleOption[] = [
  {
    id: "photo-realistic",
    name: "Photo Realistic",
    emoji: "📸",
    prompt:
      "Use the supplied reference image to preserve the subject's recognizable appearance and identity. Keep the same facial features, skin tone, hair, eyes, age, and overall appearance. Transform the surrounding environment completely according to the scene description.",
    description: "True-to-life photos that look just like your child",
  },
  {
    id: "disney-pixar",
    name: "Disney Pixar Cartoon",
    emoji: "🏰",
    prompt:
      "cartoon style 3D animated movie still inspired by Disney and Pixar, soft rounded shapes, expressive big eyes, warm vibrant colors, high quality render, child-friendly animated hero",
    description: "A soft 3D animated-movie look straight from the big screen",
  },
  {
    id: "watercolor-whimsy",
    name: "Watercolor Whimsy",
    emoji: "🎨",
    prompt:
      "watercolor children's book illustration, soft flowing washes, gentle pastel colors, whimsical and dreamy, hand-painted feel",
    description: "Gentle, hand-painted pastel watercolor pages",
  },
  {
    id: "claymation",
    name: "Claymation",
    emoji: "🧸",
    prompt:
      "claymation stop-motion animation style, plasticine texture, cute characters, cozy studio lighting, charming handmade look",
    description: "Adorable stop-motion plasticine characters",
  },
  {
    id: "anime-cute",
    name: "Anime Adorable",
    emoji: "✨",
    prompt:
      "cute anime style illustration, big expressive eyes, smooth cel shading, colorful and joyful, child-friendly cartoon",
    description: "Big expressive anime eyes and joyful colors",
  },
  {
    id: "classic-storybook",
    name: "Classic Tale",
    emoji: "📖",
    prompt:
      "classic vintage storybook illustration, ink line work with watercolor tints, timeless fairytale feel, richly detailed",
    description: "A timeless, vintage fairytale picture-book look",
  },
  {
    id: "3d-cartoon",
    name: "3D Cartoon",
    emoji: "🎬",
    prompt:
      "3D rendered cartoon style, glossy Pixar-inspired render, vibrant colors, soft global illumination, adorable proportions",
    description: "Glossy, cinematic 3D cartoon rendering",
  },
];

export function getArtStyle(id?: string): ArtStyleOption {
  return (
    CARTOON_ART_STYLES.find((style) => style.id === id) ??
    CARTOON_ART_STYLES.find((style) => style.id === DEFAULT_ART_STYLE)!
  );
}

/**
 * Build the illustration prompt for a scene in the given art style.
 */
export function buildArtStyledPrompt(
  sceneDescription: string,
  artStyle?: string
): string {
  const style = getArtStyle(artStyle);
  return `${style.prompt}: ${sceneDescription.trim()}`;
}

export default {
  DEFAULT_ART_STYLE,
  CARTOON_ART_STYLES,
  getArtStyle,
  buildArtStyledPrompt,
};