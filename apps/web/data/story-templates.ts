export type StoryCategory = "adventure" | "sentimental" | "educative";
export type StoryAudience = "girl" | "boy" | "any";

export interface StoryReview {
  rating: number;
  count: number;
  quote: string;
  author: string;
}

export interface StoryMedia {
  type: "image" | "video";
  src: string;
  mimeType?: string;
  placeholder?: boolean;
}

/** Neutral stand-in slides used until a book has its own photos or preview video. */
export function fillerSlides(count = 9): StoryMedia[] {
  return Array.from({ length: count }, () => ({
    type: "image" as const,
    src: "",
    placeholder: true,
  }));
}

export interface StoryTemplate {
  slug: string;
  title: string;
  audience: StoryAudience;
  category: StoryCategory;
  categoryLabel: string;
  emoji: string;
  tagline: string;
  description: string;
  excerpt: string;
  coverImage: string;
  media?: StoryMedia[];
  ageRange: string;
  theme: string;
  artStyle: string;
  review?: StoryReview;
  moral?: string;
  learning?: string;
}

export const CATEGORY_META: Record<
  StoryCategory,
  { label: string; chip: string; accent: string; description: string }
> = {
  adventure: {
    label: "Adventure",
    chip: "bg-sky-100 text-sky-700",
    accent: "from-sky-500 to-indigo-600",
    description: "Big journeys, brave hearts, and endless curiosity.",
  },
  sentimental: {
    label: "Sentimental",
    chip: "bg-rose-100 text-rose-700",
    accent: "from-rose-500 to-pink-600",
    description: "Warm feelings, family love, and gentle hearts.",
  },
  educative: {
    label: "Educative",
    chip: "bg-emerald-100 text-emerald-700",
    accent: "from-emerald-500 to-teal-600",
    description: "Stories that teach while they delight.",
  },
};

export const STORY_TEMPLATES: StoryTemplate[] = [
  {
    slug: "birthday-adventure-and-the-greedy-goblin",
    title: "Birthday Adventure and the Greedy Goblin",
    audience: "any",
    category: "sentimental",
    categoryLabel: "Sentimental",
    emoji: "🎁",
    tagline: "Every present is empty — until the biggest box starts moving.",
    description:
      "It is the hero's birthday, and the living room is buried under ribbons. But box after box opens to nothing at all — not one toy, not one sweet, just tissue paper and a curled ribbon. Then the neighbours' children burst in, and every single one of their boxes is empty too. Behind the sofa the hero finds green crumbs, a torn corner of wrapping paper, and tiny green footprints leading straight to the biggest box of all. Inside, curled on a mountain of every toy in the world, sleeps a goblin no bigger than a teacup. A tale about the magic of giving, the loneliness of always taking, and the friend who was never invited to anybody's birthday — until now.",
    excerpt:
      "The box was far deeper than any box has a right to be. I put in one hand, then one knee, and then I was falling — landing with a squeak. In the dark, two yellow eyes blinked open. On a mountain of every toy in the world, curled up no bigger than a teacup, was a goblin. And in his hand was a wand.",
    coverImage:
      "https://images.unsplash.com/photo-1512909006721-3d6018887383?q=80&w=1200&auto=format&fit=crop",
    ageRange: "4-8",
    theme:
      "opens a mountain of birthday presents to find every single box empty, falls into the very last one, discovers a greedy tiny goblin hiding inside who has stolen every gift in the whole world, confronts him and gets them all back magicly, then shares one of their own gifts with the lonely goblin nobody ever invited",
    artStyle: "cosy magical birthday storybook illustration",
    moral: "Taking what belongs to others leaves you alone; the best gift is the one you give away.",
    learning:
      "Counting and comparing how many gifts there are, and how sharing makes everyone happier.",
    review: {
      rating: 5,
      count: 1467,
      quote:
        "My son read the part where the goblin admits nobody ever invited him twice, then asked if we could invite him to his party. I nearly cried.",
      author: "Dalia H.",
    },
  },
];

export function getStoryTemplate(slug: string): StoryTemplate | undefined {
  return STORY_TEMPLATES.find((story) => story.slug === slug);
}

/**
 * Where a catalogue card sends the visitor: straight into the create wizard
 * with this story already selected, so the shelf and the wizard never disagree
 * about which story is being personalised.
 */
export function createStoryHref(template: StoryTemplate): string {
  return `/storybook/create?templateId=${template.slug}`;
}

/** Most-reviewed stories first - the “bestsellers” shelf. */
export function bestsellerTemplates(limit = 8): StoryTemplate[] {
  return [...STORY_TEMPLATES]
    .sort((a, b) => (b.review?.count ?? 0) - (a.review?.count ?? 0))
    .slice(0, limit);
}

/** Newest catalogue entries, newest first - the “new releases” shelf. */
export function newReleaseTemplates(limit = 8): StoryTemplate[] {
  return STORY_TEMPLATES.slice(-limit).reverse();
}

/**
 * Stories written for girls or boys. Gender-neutral stories ("any") suit both
 * shelves, so they appear on each.
 */
export function templatesForAudience(
  audience: Exclude<StoryAudience, "any">,
  limit = 8
): StoryTemplate[] {
  return STORY_TEMPLATES.filter(
    (template) => template.audience === audience || template.audience === "any"
  ).slice(0, limit);
}
