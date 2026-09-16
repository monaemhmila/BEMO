import { fal } from "@fal-ai/client";
import { prismaClient } from "../lib/prisma";
import { logger } from "../lib/logger";
import { env } from "../config/env";

interface AudioGenerationRequest {
  text: string;
  voiceId?: string;
  model?: "eleven_monolingual_v1" | "eleven_multilingual_v2" | "eleven_turbo_v2_5";
}

interface VoiceConfig {
  id: string;
  name: string;
  description: string;
  voiceId: string;
  preview?: string;
}

const AUDIO_WEBHOOK = env.WEBHOOK_BASE_URL
  ? `${env.WEBHOOK_BASE_URL}/api/webhook/story/audio`
  : undefined;

/**
 * Audio Generation Service using ElevenLabs TTS via fal.ai
 * Generates high-quality narration for storybook pages
 */
export class AudioService {
  private static instance: AudioService;
  private maxRetries = 3;
  private retryDelays = [1000, 2000, 4000];

  // Child-friendly voice options from ElevenLabs
  private readonly voices: Record<string, VoiceConfig> = {
    "sarah": {
      id: "sarah",
      name: "Sarah",
      description: "Warm, friendly female voice perfect for bedtime stories",
      voiceId: "EXAVITQu4vr4xnSDxMaL", // Sarah
    },
    "josh": {
      id: "josh",
      name: "Josh",
      description: "Gentle male voice, great for adventure stories",
      voiceId: "TxGEqnHWrfWFTfGW9XjX", // Josh
    },
    "rachel": {
      id: "rachel",
      name: "Rachel",
      description: "Clear, engaging female voice for all ages",
      voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel
    },
    "adam": {
      id: "adam",
      name: "Adam",
      description: "Expressive male narrator, perfect for exciting tales",
      voiceId: "pNInz6obpgDQGcFmaJgB", // Adam
    },
    "bella": {
      id: "bella",
      name: "Bella",
      description: "Soft, nurturing voice for calming stories",
      voiceId: "EXAVITQu4vr4xnSDxMaL", // Bella
    },
  };

  static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  /**
   * Generate audio narration using ElevenLabs via fal.ai
   */
  async generateAudio(
    request: AudioGenerationRequest,
    retryCount: number = 0
  ): Promise<{ audioUrl: string; duration?: number }> {
    const { text, voiceId = "sarah" } = request;
    const voice = this.voices[voiceId] || this.voices["sarah"];

    // Prepare text for natural narration
    const preparedText = this.prepareTextForNarration(text);

    try {
      logger.info(
        { textLength: preparedText.length, voice: voice.name },
        "Generating audio with ElevenLabs"
      );

      const response = await fal.subscribe("fal-ai/elevenlabs/tts/eleven-v3", {
        input: {
          text: preparedText,
          voice: voice.voiceId,
          model_id: request.model || "eleven_turbo_v2_5",
          output_format: "mp3_44100_128",
          voice_settings: {
            stability: 0.75,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true,
          },
        },
      });

      const audioUrl = (response.data as any)?.audio?.url ?? 
                       (response.data as any)?.audio_url ?? "";

      if (!audioUrl && retryCount < this.maxRetries) {
        logger.warn({ retryCount }, "Empty audio URL, retrying...");
        await this.delay(this.retryDelays[retryCount] || 4000);
        return this.generateAudio(request, retryCount + 1);
      }

      // Estimate duration based on text length (avg 150 words/min)
      const words = preparedText.split(/\s+/).length;
      const estimatedDuration = Math.ceil((words / 150) * 60);

      logger.info(
        { audioUrl: !!audioUrl, estimatedDuration },
        "Audio generated successfully"
      );

      return { audioUrl, duration: estimatedDuration };
    } catch (error) {
      if (retryCount < this.maxRetries) {
        logger.warn({ error, retryCount }, "Audio generation failed, retrying...");
        await this.delay(this.retryDelays[retryCount] || 4000);
        return this.generateAudio(request, retryCount + 1);
      }

      logger.error({ error, text: text.substring(0, 50) }, "Audio generation failed after retries");
      return { audioUrl: "" };
    }
  }

  /**
   * Generate audio for a story page
   */
  async generatePageAudio(
    pageId: string,
    voiceId: string = "sarah"
  ): Promise<{ audioUrl: string; duration?: number }> {
    const page = await prismaClient.storyPage.findUnique({
      where: { id: pageId },
    });

    if (!page) {
      throw new Error("Page not found");
    }

    return this.generateAudio({
      text: page.content,
      voiceId,
    });
  }

  /**
   * Generate audio for entire story
   */
  async generateStoryAudio(
    storyId: string,
    voiceId: string = "sarah",
    onProgress?: (page: number, total: number) => void
  ): Promise<{
    totalPages: number;
    successCount: number;
    audioUrls: Array<{ pageNumber: number; audioUrl: string }>;
    totalDuration: number;
  }> {
    const story = await prismaClient.story.findUnique({
      where: { id: storyId },
      include: { pages: { orderBy: { pageNumber: "asc" } } },
    });

    if (!story) {
      throw new Error("Story not found");
    }

    let successCount = 0;
    let totalDuration = 0;
    const audioUrls: Array<{ pageNumber: number; audioUrl: string }> = [];

    for (let i = 0; i < story.pages.length; i++) {
      const page = story.pages[i];
      
      // Skip if audio already exists for this page
      if (page.audioUrl) {
        logger.info(
          { pageId: page.id, pageNumber: page.pageNumber },
          "Audio already exists for page, skipping"
        );
        successCount++;
        audioUrls.push({ pageNumber: page.pageNumber, audioUrl: page.audioUrl });
        
        if (onProgress) {
          onProgress(i + 1, story.pages.length);
        }
        continue;
      }
      
      try {
        const { audioUrl, duration } = await this.generateAudio({
          text: page.content,
          voiceId,
        });

        if (audioUrl) {
          // Save audio URL to database
          await prismaClient.storyPage.update({
            where: { id: page.id },
            data: { audioUrl },
          });

          successCount++;
          totalDuration += duration || 0;
          audioUrls.push({ pageNumber: page.pageNumber, audioUrl });

          logger.info(
            { pageId: page.id, pageNumber: page.pageNumber, audioUrl: !!audioUrl },
            "Audio generated and saved for page"
          );
        }

        // Report progress
        if (onProgress) {
          onProgress(i + 1, story.pages.length);
        }

        // Longer delay between requests to avoid rate limiting
        if (i < story.pages.length - 1) {
          await this.delay(2000);
        }
      } catch (error) {
        logger.error(
          { error, pageId: page.id, pageNumber: page.pageNumber },
          "Failed to generate audio for page"
        );
      }
    }

    logger.info(
      { storyId, totalPages: story.pages.length, successCount, totalDuration },
      "Story audio generation complete"
    );

    return {
      totalPages: story.pages.length,
      successCount,
      audioUrls,
      totalDuration,
    };
  }

  /**
   * Prepare text for natural narration
   */
  private prepareTextForNarration(text: string): string {
    // Add natural pauses
    let prepared = text
      .replace(/\./g, ". ")
      .replace(/!/g, "! ")
      .replace(/\?/g, "? ")
      .replace(/,/g, ", ")
      .replace(/\s+/g, " ")
      .trim();

    // Handle dialogue for expressiveness
    prepared = prepared.replace(/"([^"]+)"/g, '"$1"');

    return prepared;
  }

  /**
   * Get available voice options
   */
  getVoices(): VoiceConfig[] {
    return Object.values(this.voices);
  }

  /**
   * Estimate audio duration and cost
   */
  estimateAudioCost(
    text: string,
    creditPerPage: number = 5
  ): { estimatedDuration: number; creditCost: number } {
    const words = text.split(/\s+/).length;
    const estimatedDuration = Math.ceil((words / 150) * 60);

    return {
      estimatedDuration,
      creditCost: creditPerPage,
    };
  }

  /**
   * Estimate total audio cost for a story
   */
  estimateStoryCost(
    pageCount: number,
    creditPerPage: number = 5
  ): number {
    return pageCount * creditPerPage;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const audioService = AudioService.getInstance();
