/**
 * Custom Story API
 * Client for the template-free story generation endpoint.
 */

import axios from "axios";
import { BACKEND_URL } from "../../../app/config";

export interface CustomStoryRequest {
  childName: string;
  childAge: number;
  childImage?: string;
  storyIdea: string;
  extraDetails?: string;
  setting?: string;
  moralLesson?: string;
  storyLength: "short" | "medium" | "long";
  language: "english" | "french" | "arabic";
}

export interface CustomPreviewPage {
  pageNumber: number;
  content: string;
  imagePrompt?: string;
  imageUrl?: string | null;
}

export interface CustomStoryResponse {
  success: boolean;
  storyId: string;
  title: string;
  childName: string;
  pages: CustomPreviewPage[];
  trialsRemaining: number;
}

export const CUSTOM_STORY_LANGUAGES: {
  value: "english" | "french" | "arabic";
  label: string;
}[] = [
  { value: "english", label: "English" },
  { value: "french", label: "French" },
  { value: "arabic", label: "Arabic" },
];

export const CUSTOM_STORY_LENGTHS: {
  value: "short" | "medium" | "long";
  label: string;
}[] = [
  { value: "short", label: "Picture Book • 5 pages" },
  { value: "medium", label: "Bedtime Story • 8 pages" },
  { value: "long", label: "Mini Chapter Book • 12 pages" },
];

export async function generateCustomStory(
  token: string,
  input: CustomStoryRequest
): Promise<CustomStoryResponse> {
  const response = await axios.post(
    `${BACKEND_URL}/custom-story/generate`,
    input,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
}