import { prismaClient } from "../lib/prisma";
import {
  imageGenerationService,
  STORYBOOK_IMAGE_CONFIG,
} from "./image-generation.service";

interface FaceConsistentImageRequest {
  prompt: string;
  referenceImageUrl?: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "3:2" | "2:3";
  childName?: string;
  pageNumber?: number;
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

  async generateFaceConsistentImage(request: FaceConsistentImageRequest, webhookUrl?: string): Promise<{ requestId: string; responseUrl: string }> {
    const result = await imageGenerationService.generateStorybookImage(
      {
        prompt: request.prompt,
        imageUrl: request.referenceImageUrl,
        aspectRatio: request.aspectRatio || STORYBOOK_IMAGE_CONFIG.aspectRatio,
        childName: request.childName,
        pageNumber: request.pageNumber,
      },
      webhookUrl
    );
    if (!result.success || !result.requestId) {
      throw new Error(result.error || "Grok Imagine image generation could not be queued");
    }
    return { requestId: result.requestId, responseUrl: "" };
  }

  async generateFaceConsistentImageSync(request: FaceConsistentImageRequest): Promise<string> {
    return imageGenerationService.generateImageSync({
      prompt: request.prompt,
      imageUrl: request.referenceImageUrl,
      aspectRatio: request.aspectRatio || STORYBOOK_IMAGE_CONFIG.aspectRatio,
      childName: request.childName,
      pageNumber: request.pageNumber,
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
