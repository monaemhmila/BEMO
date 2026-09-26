/**
 * Languages the story text can be written in. The image generation prompts
 * stay in English so illustrations are unaffected; only the written story
 * text is localized.
 */
export const STORY_LANGUAGES: {
  value: "english" | "french" | "arabic";
  label: string;
}[] = [
  { value: "english", label: "English" },
  { value: "french", label: "French" },
  { value: "arabic", label: "Arabic" },
];
