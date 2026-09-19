/**
 * Image Style Service
 *
 * Resolves an art-style id into the prompt directives used for storybook
 * illustrations. The default is photo-realistic (the original Grok Imagine
 * behaviour); the headline addition is the cartoon / Disney-Pixar look and a
 * handful of other child-friendly styles. Every style keeps the shared
 * guarantees (edge-to-edge composition, correct anatomy, textless canvas) that
 * the PDF layout and the parent experience rely on.
 */

export interface ArtStyleOption {
  id: string;
  name: string;
  prompt: string;
}

export const DEFAULT_ART_STYLE = "photo-realistic";

/**
 * Style descriptor that leads every image prompt. The scene description is
 * appended after it, so the model knows how to render both the character and
 * the environment in the chosen look.
 */
export const ART_STYLES: ArtStyleOption[] = [
  {
    id: "photo-realistic",
    name: "Photo Realistic",
    prompt:
      "photo realistic high fidelity photograph of a real child, natural skin texture, realistic lighting and shadows, life-like colors",
  },
  {
    id: "disney-pixar",
    name: "Disney Pixar Cartoon",
    prompt:
      "cartoon style 3D animated movie still inspired by Disney and Pixar, soft rounded shapes, expressive big eyes, warm vibrant colors, high quality render, child-friendly animated hero",
  },
  {
    id: "watercolor-whimsy",
    name: "Watercolor Whimsy",
    prompt:
      "watercolor children's book illustration, soft flowing washes, gentle pastel colors, whimsical and dreamy, hand-painted feel",
  },
  {
    id: "claymation",
    name: "Claymation",
    prompt:
      "claymation stop-motion animation style, plasticine texture, cute characters, cozy studio lighting, charming handmade look",
  },
  {
    id: "anime-cute",
    name: "Anime Adorable",
    prompt:
      "cute anime style illustration, big expressive eyes, smooth cel shading, colorful and joyful, child-friendly cartoon",
  },
  {
    id: "classic-storybook",
    name: "Classic Tale",
    prompt:
      "classic vintage storybook illustration, ink line work with watercolor tints, timeless fairytale feel, richly detailed",
  },
  {
    id: "3d-cartoon",
    name: "3D Cartoon",
    prompt:
      "3D rendered cartoon style, glossy Pixar-inspired render, vibrant colors, soft global illumination, adorable proportions",
  },
];

const STYLE_MAP: Record<string, ArtStyleOption> = Object.fromEntries(
  ART_STYLES.map((style) => [style.id, style])
);

/**
 * Shared negative/quality guarantees so no style regresses into text-filled,
 * cropped or anatomically broken images.
 */
export const STYLE_GUARANTEES =
  "EDGE-TO-EDGE COMPOSITION: the artwork must completely fill the entire 16:9 canvas from the extreme left edge to the extreme right edge and from the top edge to the bottom edge. No empty areas, no white space, no blank background, no side margins, no borders, no letterboxing, no pillarboxing. Extend the environment naturally all the way to every image edge; important subjects may extend close to or beyond the frame edges. Correct human anatomy, normal well-formed feet and shoes, properly proportioned limbs. Completely textless: absolutely no text, no words, no letters, no typography, no signs, no speech bubbles, no watermark. No deformed feet, no extra limbs, no mutated legs. The child must be fully clothed wearing long trousers and pants (never wearing shorts or short clothing).";

export function getArtStyleOption(artStyle?: string): ArtStyleOption {
  return STYLE_MAP[artStyle || DEFAULT_ART_STYLE] ?? STYLE_MAP[DEFAULT_ART_STYLE];
}

export function getArtStylePrompt(sceneDescription: string, artStyle?: string): string {
  const style = getArtStyleOption(artStyle);
  return `${style.prompt}: ${sceneDescription.trim()}. ${STYLE_GUARANTEES}`;
}

export default {
  DEFAULT_ART_STYLE,
  ART_STYLES,
  STYLE_GUARANTEES,
  getArtStyleOption,
  getArtStylePrompt,
};