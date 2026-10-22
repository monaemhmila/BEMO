import sharp from "sharp";
import { saveBufferAsset, saveRemoteImageLocally } from "../lib/storage";
import { safeFetchAndValidateImage } from "../lib/safe-image-fetcher";
import { splitForBookPage } from "../utils/split16x9IntoTwoSquares";
import { ImageGenerationService } from "./image-generation.service";

const imageService = ImageGenerationService.getInstance();

const SCENE_FORBIDDEN_WORDS = /\b(child|children|kid|kids|boy|girl|person|people|human|humans|face|faces|portrait|portraits|character|characters|hero|heroes|he|she|him|her|his|their|they|them)\b/i;
const SAFE_ENVIRONMENT_FALLBACK = "A richly detailed environment with story-relevant objects, natural lighting, weather, textures, and atmosphere; an empty setting with no people present.";

function genericChildScenePrompt(prompt: string, childName: string, gender?: "boy" | "girl" | null): string {
  const escapedName = childName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const withoutIdentity = prompt
    .replace(new RegExp(`\\b${escapedName}\\b`, "gi"), "")
    .replace(/\b(?:named|called)\s+[\p{L}][\p{L}'-]*/giu, "")
    .replace(/\b\d{1,2}(?:[- ]year[- ]old)?\b/gi, "")
    .replace(/\b(?:with|has|having)\s+[^,.!?;]*(?:hair|skin|eyes|face|complexion|ethnicity)[^,.!?;]*[,.;]?/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.!?;])/g, "$1")
    .trim();
  return `A ${gender || "child"} is ${withoutIdentity}`;
}

/** Image operations for personalized story pages. */
export class PersonalizedBookImageService {
  async generateChildSquare(input: {
    childName: string;
    childAge?: number | null;
    gender?: "boy" | "girl" | null;
    referenceImageUrl: string;
    prompt: string;
    artStyle?: string | null;
    aspectRatio?: "1:1" | "16:9";
    edgePlacementSide?: "left" | "right";
  }): Promise<string> {
    const imageUrl = await imageService.generateImageSync({
      prompt: `${genericChildScenePrompt(input.prompt, input.childName, input.gender)}. The child is happy, smiling, and clearly visible.`,
      aspectRatio: input.aspectRatio || "1:1",
      imageUrl: input.referenceImageUrl,
      artStyle: input.artStyle || undefined,
      edgePlacementSide: input.edgePlacementSide,
    });
    return saveRemoteImageLocally(imageUrl, "generated", `personalized_child_${Date.now()}`);
  }

  async generateSceneSpread(input: {
    prompt: string;
    childName?: string | null;
    artStyle?: string | null;
  }): Promise<{ leftUrl: string; rightUrl: string }> {
    // Deliberately omit imageUrl and never pass the child name to the model.
    // The optional name is only used locally to reject prompt leakage.
    const normalizedPrompt = ` ${input.prompt.toLocaleLowerCase().replace(/\s+/g, " ").trim()} `;
    const normalizedChildName = input.childName
      ? ` ${input.childName.toLocaleLowerCase().replace(/\s+/g, " ").trim()} `
      : "";
    const mentionsChildName = Boolean(normalizedChildName && normalizedPrompt.includes(normalizedChildName));
    const environmentPrompt = SCENE_FORBIDDEN_WORDS.test(input.prompt) || mentionsChildName
      ? SAFE_ENVIRONMENT_FALLBACK
      : input.prompt;
    const normalizedStyle = input.artStyle?.trim() || "";
    const styleSuffix = normalizedStyle && !/^photo\s*realistic$/i.test(normalizedStyle)
      ? `, ${normalizedStyle}`
      : "";
    const sourceUrl = await imageService.generateImageSync({
      prompt: `Create the following scene: ${environmentPrompt}${styleSuffix}`,
      rawPrompt: true,
      aspectRatio: "16:9",
    });
    const source = await safeFetchAndValidateImage(sourceUrl);
    // Providers can occasionally return a different size than requested. Crop
    // to a true 16:9 canvas before splitting so each printed page is reliable.
    const targetRatio = 16 / 9;
    const actualRatio = source.width / source.height;
    const normalized = Math.abs(actualRatio - targetRatio) > 0.02
      ? await sharp(source.buffer)
          .resize({ width: source.width, height: Math.max(1, Math.round(source.width / targetRatio)), fit: "cover" })
          .jpeg({ quality: 92, mozjpeg: true })
          .toBuffer()
      : source.buffer;
    const split = await splitForBookPage(normalized);
    if (!split.left || !split.right) throw new Error("SCENE_IMAGE_DID_NOT_SPLIT");

    const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const [leftUrl, rightUrl] = await Promise.all([
      saveBufferAsset(split.left, "generated", `personalized_scene_${stamp}_left.jpg`, "image/jpeg"),
      saveBufferAsset(split.right, "generated", `personalized_scene_${stamp}_right.jpg`, "image/jpeg"),
    ]);
    return { leftUrl, rightUrl };
  }
}

export const personalizedBookImageService = new PersonalizedBookImageService();
