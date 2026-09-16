/**
 * Audio Generation Service
 * Generates narration audio for story pages using ElevenLabs via fal.ai
 */

import axios from "axios";
import { BACKEND_URL } from "../../app/config";

export interface AudioGenerationRequest {
  storyId: string;
  pageId: string;
  text: string;
  emotion?: string;
  voiceStyle?: VoiceStyle;
}

export interface AudioGenerationResponse {
  audioUrl: string;
  pageId: string;
  status: "pending" | "generating" | "completed" | "failed";
  duration?: number;
}

export type VoiceStyle = "child-friendly" | "warm-narrator" | "gentle-parent" | "storyteller";

/**
 * Voice configuration options
 */
export const VOICE_STYLES: Record<VoiceStyle, {
  name: string;
  description: string;
  stability: number;
  speakingRate: number;
}> = {
  "child-friendly": {
    name: "Child Friendly",
    description: "Bright, engaging voice perfect for young listeners",
    stability: 0.75,
    speakingRate: 0.9,
  },
  "warm-narrator": {
    name: "Warm Narrator",
    description: "Soothing, professional storytelling voice",
    stability: 0.8,
    speakingRate: 0.85,
  },
  "gentle-parent": {
    name: "Gentle Parent",
    description: "Soft, nurturing bedtime story voice",
    stability: 0.85,
    speakingRate: 0.8,
  },
  "storyteller": {
    name: "Classic Storyteller",
    description: "Expressive, theatrical narration",
    stability: 0.7,
    speakingRate: 0.95,
  },
};

/**
 * Request audio generation for a page
 */
export async function requestAudioGeneration(
  token: string,
  request: AudioGenerationRequest
): Promise<{ pageId: string; status: string }> {
  const voiceConfig = VOICE_STYLES[request.voiceStyle || "child-friendly"];
  
  const response = await axios.post(
    `${BACKEND_URL}/story/generate-page-audio`,
    {
      storyId: request.storyId,
      pageId: request.pageId,
      text: request.text,
      emotion: request.emotion,
      voiceSettings: {
        stability: voiceConfig.stability,
        speakingRate: voiceConfig.speakingRate,
      },
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.data;
}

/**
 * Request audio generation for all pages in a story
 */
export async function generateStoryAudio(
  token: string,
  storyId: string,
  voiceStyle: VoiceStyle = "child-friendly"
): Promise<{ status: string; totalPages: number }> {
  const response = await axios.post(
    `${BACKEND_URL}/story/${storyId}/generate-audio`,
    { voiceStyle },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.data;
}

/**
 * Get audio status for a page
 */
export async function getAudioStatus(
  token: string,
  pageId: string
): Promise<AudioGenerationResponse> {
  const response = await axios.get(`${BACKEND_URL}/story/page/${pageId}/audio`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return response.data;
}

/**
 * Combine multiple audio files into one for full story playback
 */
export async function combineStoryAudio(
  token: string,
  storyId: string
): Promise<{ combinedAudioUrl: string }> {
  const response = await axios.post(
    `${BACKEND_URL}/story/${storyId}/combine-audio`,
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.data;
}

export default {
  VOICE_STYLES,
  requestAudioGeneration,
  generateStoryAudio,
  getAudioStatus,
  combineStoryAudio,
};

