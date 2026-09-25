/**
 * Image Style Service
 *
 * Resolves an art-style id into the prompt directives used for storybook
 * illustrations, and assembles the single storybook image prompt template.
 * The template uses the supplied photo ONLY as a facial-identity reference:
 * it preserves the child's face while always generating a completely new
 * environment, full-body child, full-bleed canvas and textless artwork.
 */

export interface ArtStyleOption {
  id: string;
  name: string;
  prompt: string;
}

export const DEFAULT_ART_STYLE = "photo-realistic";

/**
 * Visual descriptor appended to the scene description. The photo-realistic
 * style adds nothing (the template itself describes the realistic result).
 */
export const ART_STYLES: ArtStyleOption[] = [
  {
    id: "photo-realistic",
    name: "Photo Realistic",
    prompt: "",
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

export function getArtStyleOption(artStyle?: string): ArtStyleOption {
  return STYLE_MAP[artStyle || DEFAULT_ART_STYLE] ?? STYLE_MAP[DEFAULT_ART_STYLE];
}

/**
 * Append the selected art-style descriptor to the scene description.
 */
export function applyArtStyle(sceneDescription: string, artStyle?: string): string {
  const style = getArtStyleOption(artStyle);
  const scene = sceneDescription.trim();
  if (!style.prompt) return scene;
  return `${scene}, ${style.prompt}`;
}

/**
 * Placement rule for regular story pages: the child must be anchored to the
 * FAR LEFT or FAR RIGHT edge of the frame, never in the center/middle. The
 * cover and closing pages are excluded - they use their own square layout
 * with a smaller subject.
 */
export function getCharacterEdgeDirective(side: "left" | "right"): string {
  const farSide = side === "left" ? "FAR LEFT" : "FAR RIGHT";
  const otherSide = side === "left" ? "right" : "left";
  return `Position the child at the ${farSide} edge of the frame. He must never be in the center, middle, or ${otherSide} side of the image - anchor the child to the far ${side} edge of the canvas while the background scene fills the rest of the frame.`;
}

/**
 * The single storybook illustration prompt. `[SCENE]` is replaced with the
 * scene description, `[FILL_CANVAS]` with the canvas-ratio sentence and
 * `[EDGE_PLACEMENT]` with the per-page edge rule (middle pages only).
 */
export const STORYBOOK_IMAGE_TEMPLATE = `Use the supplied image ONLY as a facial identity reference for the child.

Preserve the child's recognizable facial identity accurately, including facial features, face shape, skin tone, eyes, eyebrows, nose, mouth, hair characteristics, and apparent age. The child must remain recognizable as the same child throughout the generated image.

The supplied image is a FACE REFERENCE ONLY. Do not preserve or reproduce its background, framing, crop, white areas, lighting setup, camera composition, or any other visual elements from the reference image. Do not place the face inside the original reference frame.

Generate the complete child naturally within the scene, including the head, body, clothing, arms, hands, legs, and feet. Maintain age-appropriate anatomy and natural body proportions.

Create the following scene:

[SCENE]

[EDGE_PLACEMENT]Create a completely new, rich, immersive environment around the child. The environment must naturally surround and integrate the child with detailed foreground, middle-ground, and background elements.

The artwork must completely fill the entire [FILL_CANVAS] canvas from the extreme left edge to the extreme right edge and from the top edge to the bottom edge. Generate the environment continuously across the entire canvas. No empty areas, no white areas, no blank background, no inherited background, no side margins, no borders, no letterboxing, and no pillarboxing.

The child must be naturally integrated into the environment with appropriate scale, perspective, lighting, shadows, depth, and interaction with the surroundings. The result must look like one cohesive scene, not a face pasted onto a generated body or background.

Correct human anatomy, natural proportions, properly formed hands and feet, normal limbs, and age-appropriate clothing. The child must be fully clothed and wear full-length trousers and shoes.

Completely textless. No text, words, letters, numbers, typography, signs, logos, captions, speech bubbles, watermarks, or pseudo-text.`;

/**
 * Assemble the final storybook illustration prompt from the scene description.
 */
export function buildStorybookImagePrompt(input: {
  sceneDescription: string;
  artStyle?: string;
  aspectRatio?: string;
  edgePlacementSide?: "left" | "right";
}): string {
  const scene = applyArtStyle(input.sceneDescription, input.artStyle);
  const ratio = input.aspectRatio === "1:1" ? "1:1" : "16:9";
  const edge = input.edgePlacementSide
    ? `${getCharacterEdgeDirective(input.edgePlacementSide)}\n\n`
    : "";

  return STORYBOOK_IMAGE_TEMPLATE
    .replace("[SCENE]", scene)
    .replace("[EDGE_PLACEMENT]", edge)
    .replace("[FILL_CANVAS]", ratio);
}

export default {
  DEFAULT_ART_STYLE,
  ART_STYLES,
  getArtStyleOption,
  applyArtStyle,
  getCharacterEdgeDirective,
  buildStorybookImagePrompt,
};