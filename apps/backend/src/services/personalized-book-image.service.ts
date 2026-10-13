import sharp from "sharp";
import { saveBufferAsset, saveRemoteImageLocally } from "../lib/storage";
import { safeFetchAndValidateImage } from "../lib/safe-image-fetcher";
import { splitForBookPage } from "../utils/split16x9IntoTwoSquares";
import { ImageGenerationService } from "./image-generation.service";

const imageService = ImageGenerationService.getInstance();

const SCENE_FORBIDDEN_WORDS = /\b(child|children|kid|kids|boy|girl|person|people|human|humans|face|faces|portrait|portraits|character|characters|hero|heroes|he|she|him|her|his|their|they|them)\b/i;
const SAFE_ENVIRONMENT_FALLBACK = "A richly detailed environment with story-relevant objects, natural lighting, weather, textures, and atmosphere; an empty setting with no people present.";

/** Image operations for the new personalized 30-page layout only. */
export class PersonalizedBookImageService {
  async generateChildSquare(input: {
    childName: string;
    childAge?: number | null;
    referenceImageUrl: string;
    prompt: string;
    artStyle?: string | null;
  }): Promise<string> {
    const imageUrl = await imageService.generateImageSync({
      prompt: `${input.childName}, ${input.childAge ?? "young"} years old: ${input.prompt}. The child is the only human hero and is clearly visible.`,
      aspectRatio: "1:1",
      imageUrl: input.referenceImageUrl,
      childName: input.childName,
      artStyle: input.artStyle || undefined,
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
    const sourceUrl = await imageService.generateImageSync({
      prompt: `Create the following scene: ${environmentPrompt}`,
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
