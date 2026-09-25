import { prismaClient } from "../lib/prisma";
import {
  imageGenerationService,
  STORYBOOK_IMAGE_CONFIG,
} from "./image-generation.service";
import {
  faceCanvasService,
  FaceReferences,
} from "./face-canvas.service";

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
  private referenceCache: Map<string, FaceReferences> = new Map();

  static getInstance(): FaceConsistencyService {
    if (!FaceConsistencyService.instance) {
      FaceConsistencyService.instance = new FaceConsistencyService();
    }
    return FaceConsistencyService.instance;
  }

  /**
   * Crop the uploaded photo to the child's face (cached per source URL).
   */
  async getOrGenerateFaceCrop(referenceImageUrl: string): Promise<FaceReferences> {
    if (this.referenceCache.has(referenceImageUrl)) {
      return this.referenceCache.get(referenceImageUrl)!;
    }
    const refs = await faceCanvasService.generateFaceReferences(referenceImageUrl);
    this.referenceCache.set(referenceImageUrl, refs);
    return refs;
  }

  async generateFaceConsistentImage(
    request: FaceConsistentImageRequest,
    webhookUrl?: string
  ): Promise<{ requestId: string; responseUrl: string }> {
    let processedReferenceUrl = request.referenceImageUrl;

    if (request.referenceImageUrl) {
      try {
        const refs = await this.getOrGenerateFaceCrop(request.referenceImageUrl);
        processedReferenceUrl = refs.face || processedReferenceUrl;
      } catch (err) {
        processedReferenceUrl = request.referenceImageUrl;
      }
    }

    const result = await imageGenerationService.generateStorybookImage(
      {
        prompt: request.prompt,
        imageUrl: processedReferenceUrl,
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
    let processedReferenceUrl = request.referenceImageUrl;

    if (request.referenceImageUrl) {
      try {
        const refs = await this.getOrGenerateFaceCrop(request.referenceImageUrl);
        processedReferenceUrl = refs.face || processedReferenceUrl;
      } catch (err) {
        processedReferenceUrl = request.referenceImageUrl;
      }
    }

    return imageGenerationService.generateImageSync({
      prompt: request.prompt,
      imageUrl: processedReferenceUrl,
      aspectRatio: request.aspectRatio || STORYBOOK_IMAGE_CONFIG.aspectRatio,
      childName: request.childName,
      artStyle: request.artStyle,
      edgePlacementSide: request.edgePlacementSide,
    });
  }

  async storeReferenceImage(modelId: string, imageUrl: string): Promise<void> {
    await prismaClient.model.update({ where: { id: modelId }, data: { thumbnail: imageUrl } });
  }

  async getReferenceImage(modelId: string): Promise<string | null> {
    const model = await prismaClient.model.findUnique({ where: { id: modelId }, select: { thumbnail: true } });
    return model?.thumbnail ?? null;
  }
}

export const faceConsistencyService = FaceConsistencyService.getInstance();
