/**
 * Story Generation Service
 * Generates personalized children's stories using LLM
 */

import axios from "axios";
import { BACKEND_URL } from "../../app/config";

export interface StorySettings {
  childName: string;
  childAge: number;
  theme: string;
  storyLength: "short" | "medium" | "long";
  category?: string;
  dedication?: string;
  artStyle?: string;
  modelId: string; // Reference to trained face model
  language?: string;
}

/**
 * Languages the story text can be written in. The image generation prompts
 * stay in English so illustrations are unaffected; only the written story
 * text is localized.
 */
export const STORY_LANGUAGES: { value: "english" | "french" | "arabic"; label: string }[] = [
  { value: "english", label: "English" },
  { value: "french", label: "French" },
  { value: "arabic", label: "Arabic" },
];

export interface StoryPage {
  pageNumber: number;
  text: string;
  sceneDescription: string;
  emotion?: string;
}

export interface GeneratedStory {
  title: string;
  pages: StoryPage[];
}

export interface StoryGenerationResponse {
  storyId: string;
  title: string;
  status: "generating" | "completed" | "failed";
  pages: {
    id: string;
    pageNumber: number;
    content: string;
    imageUrl?: string;
    audioUrl?: string;
    status: string;
  }[];
  estimatedTime?: string;
}

/**
 * Story length configurations
 */
export const STORY_LENGTH_CONFIG = {
  short: { pages: 5, label: "Picture Book • 5 pages", wordsPerPage: "20-30" },
  medium: { pages: 8, label: "Bedtime Story • 8 pages", wordsPerPage: "25-35" },
  long: { pages: 12, label: "Chapter Mini-Book • 12 pages", wordsPerPage: "30-40" },
};

/**
 * Story categories/themes
 */
export const STORY_CATEGORIES = [
  { id: "adventure", name: "Adventure", icon: "🏔️", description: "Exciting quests and discoveries" },
  { id: "space", name: "Space Explorer", icon: "🚀", description: "Planets, rockets, friendly aliens" },
  { id: "fairy", name: "Fairy Kingdom", icon: "🏰", description: "Castles, dragons, and magic" },
  { id: "animals", name: "Animal Friends", icon: "🦁", description: "Talking animals and nature" },
  { id: "superhero", name: "Superhero", icon: "🦸", description: "Powers and saving the day" },
  { id: "ocean", name: "Ocean Adventure", icon: "🌊", description: "Sea creatures and underwater worlds" },
  { id: "dinosaurs", name: "Dinosaur Time", icon: "🦕", description: "Prehistoric adventures" },
  { id: "bedtime", name: "Bedtime Dreams", icon: "🌙", description: "Calm, soothing stories" },
];

/**
 * Build the story generation prompt
 */
export function buildStoryPrompt(settings: StorySettings): string {
  const lengthConfig = STORY_LENGTH_CONFIG[settings.storyLength];
  
  return `You are a professional children's book author creating a personalized story.

Create a ${lengthConfig.pages}-page children's story for ${settings.childName}, age ${settings.childAge}.
Theme: ${settings.theme}
${settings.category ? `Category: ${settings.category}` : ""}
${settings.language ? `Write ALL story text in: ${settings.language}.` : ""}

Requirements:
- Age-appropriate vocabulary and concepts for a ${settings.childAge}-year-old
- ${settings.childName} is the hero of the story
- ${lengthConfig.wordsPerPage} words per page
- Comic-style dialogue and action
- Positive messages and gentle moral lessons
- Each page should have a clear visual scene
- The "sceneDescription" field must always be written in English (it is used for image generation); only the "text" and "title" are written in the selected language

${settings.dedication ? `Include dedication: "${settings.dedication}"` : ""}

Output ONLY valid JSON with this exact structure:
{
  "title": "Story title including ${settings.childName}",
  "pages": [
    {
      "pageNumber": 1,
      "text": "Story text for this page (the narration/dialogue)",
      "sceneDescription": "Detailed visual description of what's happening in this scene for illustration",
      "emotion": "primary emotion of the character (happy, excited, curious, brave, etc.)"
    }
  ]
}`;
}

/**
 * Start story generation
 */
export async function generateStory(
  token: string,
  settings: StorySettings
): Promise<StoryGenerationResponse> {
  const response = await axios.post(
    `${BACKEND_URL}/story/generate`,
    settings,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.data;
}

/**
 * Get story status and details
 */
export async function getStoryStatus(
  token: string,
  storyId: string
): Promise<StoryGenerationResponse> {
  const response = await axios.get(`${BACKEND_URL}/story/${storyId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return response.data.story;
}

/**
 * Get all user stories
 */
export async function getUserStories(
  token: string
): Promise<StoryGenerationResponse[]> {
  const response = await axios.get(`${BACKEND_URL}/story/mine`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return response.data.stories;
}

export default {
  STORY_LENGTH_CONFIG,
  STORY_CATEGORIES,
  buildStoryPrompt,
  generateStory,
  getStoryStatus,
  getUserStories,
};

