/**
 * Story Prompt Templates
 * Reusable prompt templates for story generation
 */

export interface StoryPromptParams {
  childName: string;
  childAge: number;
  theme: string;
  pageCount: number;
  wordsPerPage: string;
  category?: string;
  moralLesson?: string;
  educationalFocus?: string;
  dedication?: string;
  characterDescription?: string;
}

/**
 * Age-appropriate language guidance
 */
export type AgeBand = "3-5" | "6-8" | "9-12";

export const AGE_GUIDANCE: Record<AgeBand, {
  language: string;
  themes: string;
  complexity: string;
}> = {
  "3-5": {
    language: "Very simple words, short sentences, lots of repetition, basic concepts like colors and numbers",
    themes: "Friendship, sharing, bedtime, animals, colors, counting, family love",
    complexity: "One main event per page, simple cause and effect",
  },
  "6-8": {
    language: "Simple but engaging vocabulary, complete sentences, gentle tension and resolution",
    themes: "Adventure, problem-solving, friendship, family, nature, being brave",
    complexity: "Simple plot with beginning, middle, end. One or two challenges to overcome",
  },
  "9-12": {
    language: "Rich vocabulary, complex sentence structures, character development, dialogue",
    themes: "Bravery, teamwork, moral lessons, discovery, mystery, growing up",
    complexity: "Multi-layered plot, character growth, meaningful challenges",
  },
};

/**
 * Get age range key from numeric age
 */
export function getAgeRange(age: number): AgeBand {
  if (age <= 5) return "3-5";
  if (age <= 8) return "6-8";
  return "9-12";
}

/**
 * Build the main story generation prompt
 */
export function buildMainStoryPrompt(params: StoryPromptParams): string {
  const ageRange = getAgeRange(params.childAge);
  const guidance = AGE_GUIDANCE[ageRange];

  return `You are a professional children's book author creating a personalized story with strong moral and educational values.

TARGET AUDIENCE: ${params.childAge}-year-old child named ${params.childName}
STORY LENGTH: ${params.pageCount} pages (${params.wordsPerPage} words per page)
THEME: ${params.theme}
${params.category ? `CATEGORY: ${params.category}` : ""}
${params.moralLesson ? `PRIMARY MORAL LESSON: ${params.moralLesson}` : "PRIMARY MORAL LESSON: Kindness, bravery, and empathy"}
${params.educationalFocus ? `EDUCATIONAL FOCUS: ${params.educationalFocus}` : "EDUCATIONAL FOCUS: Problem-solving and curiosity"}

LANGUAGE STYLE: ${guidance.language}
APPROPRIATE THEMES: ${guidance.themes}
STORY COMPLEXITY: ${guidance.complexity}

${params.characterDescription ? `CHARACTER APPEARANCE: ${params.characterDescription}` : ""}
${params.dedication ? `DEDICATION TO INCLUDE: "${params.dedication}"` : ""}

CRITICAL REQUIREMENTS:
1. ${params.childName} MUST be the hero of every page
2. Use age-appropriate vocabulary for a ${params.childAge}-year-old
3. Include comic-style dialogue and action
4. Each page needs a clear, illustratable scene
5. End with a positive, satisfying conclusion
6. Seamlessly weave the moral lesson ("${params.moralLesson || "kindness & teamwork"}") and educational focus ("${params.educationalFocus || "discovery & problem-solving"}") into the dialogue and narrative arc of the book.

OUTPUT FORMAT - Return ONLY valid JSON:
{
  "title": "Creative title featuring ${params.childName}",
  "pages": [
    {
      "pageNumber": 1,
      "text": "The story text that will be read aloud (${params.wordsPerPage} words)",
      "sceneDescription": "Detailed visual description for the illustrator: setting, character position, action, lighting, mood",
      "emotion": "The primary emotion ${params.childName} is feeling (happy, excited, curious, brave, surprised, etc.)"
    }
  ]
}`;
}

/**
 * Build image generation prompt for consistent character
 */
export function buildImageGenerationPrompt(params: {
  characterName: string;
  sceneDescription: string;
  emotion: string;
  artStyle: string;
  characterReference?: string;
}): string {
  return `${params.artStyle}

SCENE: ${params.sceneDescription}

CHARACTER: A child named ${params.characterName} who looks exactly like the reference image.
CHARACTER EMOTION: ${params.emotion}
${params.characterReference ? `REFERENCE: Use face from ${params.characterReference}` : ""}

STYLE REQUIREMENTS:
- Vibrant, child-friendly colors
- Disney/Pixar quality illustration
- Soft, warm lighting
- No text or watermarks
- High detail, 4K quality
- Comic book panel composition
- Expressive character faces
- Age-appropriate content only`;
}

/**
 * Pre-built story starters for quick generation
 */
export const STORY_STARTERS = [
  {
    id: "space-adventure",
    title: "Space Explorer",
    theme: "Blasts off to explore the stars and makes friends with a friendly alien",
    category: "space",
    icon: "🚀",
    moralLesson: "Inclusion & celebrating cultural differences",
    educationalFocus: "Basic astronomy, planets & gravity",
  },
  {
    id: "dragon-friend",
    title: "Dragon Friend",
    theme: "Discovers a lost baby dragon and helps it find its way home through patience and caring",
    category: "fantasy",
    icon: "🐉",
    moralLesson: "Patience, gentleness & empathy for lost creatures",
    educationalFocus: "Emotional intelligence & problem solving",
  },
  {
    id: "ocean-mystery",
    title: "Ocean Mystery",
    theme: "Dives underwater, discovers a sea kingdom, and helps clean up a coral reef",
    category: "ocean",
    icon: "🐠",
    moralLesson: "Ocean preservation & teamwork",
    educationalFocus: "Marine biology & environmental awareness",
  },
  {
    id: "superhero-day",
    title: "Superhero Day",
    theme: "Wakes up with superpowers and learns that true strength is helping neighbors and doing good deeds",
    category: "superhero",
    icon: "🦸",
    moralLesson: "Responsibility, integrity & community helping",
    educationalFocus: "Civic responsibility & cause-and-effect reasoning",
  },
  {
    id: "magic-garden",
    title: "Magic Garden",
    theme: "Finds a magical garden where plants grow when nurtured with kindness and curiosity",
    category: "fantasy",
    icon: "🌸",
    moralLesson: "Patience, care & nurturing life",
    educationalFocus: "Botany basics, plant life cycles & sunlight",
  },
  {
    id: "dinosaur-time",
    title: "Dinosaur Expedition",
    theme: "Travels back in time to explore prehistoric lands with gentle herbivores",
    category: "dinosaurs",
    icon: "🦕",
    moralLesson: "Respecting history & peaceful coexistence",
    educationalFocus: "Paleontology, herbivores vs carnivores & timelines",
  },
  {
    id: "sleepy-stars",
    title: "Sleepy Stars",
    theme: "Floats up to the night sky to practice calm breathing and gratitude with the moon",
    category: "bedtime",
    icon: "🌙",
    moralLesson: "Gratitude & emotional self-regulation",
    educationalFocus: "Mindfulness, sleep hygiene & constellation shapes",
  },
  {
    id: "forest-adventure",
    title: "Forest Guardians",
    theme: "Explores an ancient forest and works with woodland creatures to keep their habitat safe",
    category: "animals",
    icon: "🦊",
    moralLesson: "Environmental stewardship & protecting wildlife",
    educationalFocus: "Ecosystems, forest habitats & animal tracking",
  },
];

export default {
  AGE_GUIDANCE,
  getAgeRange,
  buildMainStoryPrompt,
  buildImageGenerationPrompt,
  STORY_STARTERS,
};

