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
    prompt:
      "photorealistic live-action photograph of a real child, natural skin texture, realistic facial proportions, natural eyes, real fabric and hair, authentic photographic lighting, no cartoon or animation styling",
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
  const farSide = side === "left" ? "LEFT" : " RIGHT";
  const textSide = side === "left" ? "RIGHT" : "LEFT";
  return `Position the child at the ${farSide} of the composition, naturally integrated into the scene.`;
}

/**
 * The single storybook illustration prompt. `[SCENE]` is replaced with the
 * scene description, `[FILL_CANVAS]` with the canvas-ratio sentence and
 * `[EDGE_PLACEMENT]` with the per-page edge rule (middle pages only).
 */
export const STORYBOOK_IMAGE_TEMPLATE = `Use the supplied image ONLY as a facial identity reference.

Generate the complete child naturally within the scene, including the head, body, clothing, arms, hands, legs, and feet. The child must be actively doing something specific in every scene: running, jumping, climbing, reaching, carrying, dancing, exploring, helping, or physically interacting with a story object. Use an energetic but natural action pose with visible movement, not a passive standing portrait. Use normal camera perspective and uniform natural scale: realistic head-to-body ratio, shoulder width, torso width, limb length, and face shape. Preserve the exact story-role costume described in the scene prompt on every page: the same role, clothing items, colors, accessories, equipment, and footwear. If the role is a princess, visibly dress the child in the complete princess costume described by the prompt; do not replace it with ordinary clothes.

Create the following scene:

[SCENE]

[EDGE_PLACEMENT][FILL_CANVAS] Create a completely new, rich, immersive environment around the child. The environment must naturally surround and integrate the child with detailed foreground, middle-ground, and background elements.

[CANVAS_GUIDANCE] [SUBJECT_SCALE] The child must be naturally integrated into the environment with appropriate scale, perspective, lighting, shadows, depth, and interaction with the surroundings.

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
  const ratio = input.aspectRatio === "1:1"
    ? "Use a square 1:1 portrait composition with the child prominently framed in the complete square canvas."
    : "Use a landscape 16:9 canvas for the environment; do not resize or reshape the child to match the canvas.";
  const edge = input.edgePlacementSide
    ? `${getCharacterEdgeDirective(input.edgePlacementSide)}\n\n`
    : "";

  return STORYBOOK_IMAGE_TEMPLATE
    .replace("[SCENE]", scene)
    .replace("[EDGE_PLACEMENT]", edge)
    .replace("[FILL_CANVAS]", ratio)
    .replace("[CANVAS_GUIDANCE]", input.aspectRatio === "1:1"
      ? "Use the complete square canvas with natural portrait camera framing and no empty margins."
      : "The output canvas is landscape, but the landscape layout applies only to the environment and camera framing. Keep the child's geometry unchanged and use the environment to occupy the extra horizontal space.")
    .replace("[SUBJECT_SCALE]", input.aspectRatio === "1:1"
      ? "Frame the child as a prominent full-body portrait, approximately 45-60% of the frame height."
      : "Keep the child at approximately 12-20% of the frame height, with generous natural space around them.");
}

export default {
  DEFAULT_ART_STYLE,
  ART_STYLES,
  getArtStyleOption,
  applyArtStyle,
  getCharacterEdgeDirective,
  buildStorybookImagePrompt,
};
