import {
  imageGenerationService,
  STORYBOOK_IMAGE_CONFIG,
} from "./image-generation.service";

interface FaceConsistentImageRequest {
  prompt: string;
  referenceImageUrl?: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "3:2" | "2:3";
  childName?: string;
  /** Anchor the child to the far edge (left/right) in the final image
   *  (middle pages only). */
  edgePlacementSide?: "left" | "right";
  artStyle?: string;
}

/**
 * Identity-preserving image generation using xAI Grok Imagine
 * (xai/grok-imagine-image/edit).
 * A supplied portrait is passed to the edit endpoint for every page.
 */
export class FaceConsistencyService {
  private static instance: FaceConsistencyService;

  static getInstance(): FaceConsistencyService {
    if (!FaceConsistencyService.instance) {
      FaceConsistencyService.instance = new FaceConsistencyService();
    }
    return FaceConsistencyService.instance;
  }

  async generateFaceConsistentImage(
    request: FaceConsistentImageRequest,
    webhookUrl?: string
  ): Promise<{ requestId: string; responseUrl: string }> {
    const result = await imageGenerationService.generateStorybookImage(
      {
        prompt: request.prompt,
        imageUrl: request.referenceImageUrl,
        aspectRatio: request.aspectRatio || STORYBOOK_IMAGE_CONFIG.aspectRatio,
        childName: request.childName,
        artStyle: request.artStyle,
        edgePlacementSide: request.edgePlacementSide,
      },
      webhookUrl
    );
    if (!result.success || !result.requestId) {
      throw new Error(result.error || "Grok Imagine image generation could not be queued");
    }
    return { requestId: result.requestId, responseUrl: "" };
  }

  async generateFaceConsistentImageSync(
    request: FaceConsistentImageRequest
  ): Promise<string> {
    return imageGenerationService.generateImageSync({
      prompt: request.prompt,
      imageUrl: request.referenceImageUrl,
      aspectRatio: request.aspectRatio || STORYBOOK_IMAGE_CONFIG.aspectRatio,
      childName: request.childName,
      artStyle: request.artStyle,
      edgePlacementSide: request.edgePlacementSide,
    });
  }
}

export const faceConsistencyService = FaceConsistencyService.getInstance();
