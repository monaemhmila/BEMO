/**
 * Image Generation Service
 * Handles comic-style storybook illustration generation with face consistency
 */

import axios from "axios";
import { BACKEND_URL } from "../../app/config";

export interface ImageGenerationRequest {
  storyId: string;
  pageNumber: number;
  sceneDescription: string;
  characterName: string;
  emotion?: string;
  artStyle?: string;
}

export interface ImageGenerationResponse {
  imageUrl: string;
  pageId: string;
  status: "pending" | "generating" | "completed" | "failed";
}

/**
 * Build comic-style illustration prompt
 */
export function buildImagePrompt(params: {
  characterName: string;
  sceneDescription: string;
  emotion?: string;
  artStyle?: string;
}): string {
  const { characterName, sceneDescription, emotion, artStyle } = params;
  
  const baseStyle = artStyle || "Comic-style children's storybook illustration";
  const emotionContext = emotion ? `, character emotion: ${emotion}` : "";
  
  return `${baseStyle}. 
Character: ${characterName} (match face reference exactly)${emotionContext}.
Scene: ${sceneDescription}.
Style: Vibrant, Disney/Pixar-inspired, child-friendly, high quality, 4k, soft lighting, warm colors.
Do not include any text or watermarks.`;
}

/**
 * Request face-consistent image generation
 */
export async function requestImageGeneration(
  token: string,
  request: ImageGenerationRequest
): Promise<{ pageId: string }> {
  const prompt = buildImagePrompt({
    characterName: request.characterName,
    sceneDescription: request.sceneDescription,
    emotion: request.emotion,
    artStyle: request.artStyle,
  });

  const response = await axios.post(
    `${BACKEND_URL}/story/generate-page-image`,
    {
      storyId: request.storyId,
      pageNumber: request.pageNumber,
      prompt,
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.data;
}

/**
 * Poll for image generation status
 */
export async function pollImageStatus(
  token: string,
  pageId: string
): Promise<ImageGenerationResponse> {
  const response = await axios.get(`${BACKEND_URL}/story/page/${pageId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return response.data;
}

/**
 * Art style options for storybook generation
 */
export const ART_STYLES = [
  {
    id: "comic-disney",
    name: "Disney Magic",
    prompt: "Comic-style children's storybook illustration, Disney/Pixar-inspired, vibrant colors",
    preview: "🏰",
  },
  {
    id: "watercolor-whimsy",
    name: "Watercolor Whimsy",
    prompt: "Watercolor children's book illustration, soft colors, whimsical, dreamy",
    preview: "🎨",
  },
  {
    id: "claymation",
    name: "Claymation",
    prompt: "Claymation style, stop motion aesthetic, cute characters, plasticine texture",
    preview: "🧸",
  },
  {
    id: "anime-cute",
    name: "Anime Adorable",
    prompt: "Cute anime style illustration, child-friendly, big expressive eyes, colorful",
    preview: "✨",
  },
  {
    id: "classic-storybook",
    name: "Classic Tale",
    prompt: "Classic storybook illustration, vintage style, ink and watercolor, detailed",
    preview: "📖",
  },
  {
    id: "3d-render",
    name: "3D Cartoon",
    prompt: "3D rendered cartoon style, Pixar quality, vibrant, high detail, soft lighting",
    preview: "🎬",
  },
];

export default {
  buildImagePrompt,
  requestImageGeneration,
  pollImageStatus,
  ART_STYLES,
};

