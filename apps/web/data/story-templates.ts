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
  /** Optional label under the slide, e.g. "Page 3". */
  caption?: string;
}

export type StoryCopy = {
  title: string | null;
  description: string | null;
  tagline: string | null;
  excerpt: string | null;
};

export type StoryTranslations = {
  fr: StoryCopy;
  ar: StoryCopy;
};

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
  translations?: StoryTranslations;
  coverImage: string;
  /**
   * Gallery slides from the catalogue. Empty/absent means the detail page falls
   * back to `fillerSlides()`.
   */
  previews?: StoryMedia[];
  ageRange: string;
  theme: string;
  artStyle: string;
  review?: StoryReview;
  moral?: string;
  learning?: string;
}

/**
 * A template exactly as the backend serves it from
 * `GET /storybook/templates` — one entry per `StoryTemplate` row. The database is
 * the only catalogue; this type just describes its shape.
 */
export interface StorefrontTemplate {
  /** Primary key. Also the storefront slug: /books/<id>. */
  id: string;
  title: string;
  description: string;
  tagline: string | null;
  excerpt: string | null;
  translations?: StoryTranslations;
  emoji: string | null;
  audience: string;
  ageRange: string;
  category: string;
  difficulty: number;
  tags: string[];
  coverImage: string | null;
  previews: StoryMedia[];
  theme: string;
  moral: string | null;
  learning: string | null;
  artStyle: string | null;
  review: StoryReview | null;
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

/**
 * Categories are free text in the database, so an added template may carry one
 * the design system has no styling for. Fall back rather than rendering
 * `undefined` into a class name.
 */
const FALLBACK_CATEGORY: StoryCategory = "adventure";

export function toStoryCategory(raw: string): StoryCategory {
  return raw in CATEGORY_META ? (raw as StoryCategory) : FALLBACK_CATEGORY;
}

export function getCategoryMeta(raw: string) {
  return CATEGORY_META[toStoryCategory(raw)];
}

function toAudience(raw: string): StoryAudience {
  return raw === "girl" || raw === "boy" ? raw : "any";
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
export function bestsellers(templates: StoryTemplate[], limit = 8): StoryTemplate[] {
  return [...templates]
    .sort((a, b) => (b.review?.count ?? 0) - (a.review?.count ?? 0))
    .slice(0, limit);
}

/** Newest catalogue entries, newest first - the “new releases” shelf. */
export function newReleases(templates: StoryTemplate[], limit = 8): StoryTemplate[] {
  return templates.slice(-limit).reverse();
}

/**
 * Stories written for girls or boys. Gender-neutral stories ("any") suit both
 * shelves, so they appear on each.
 */
export function forAudience(
  templates: StoryTemplate[],
  audience: Exclude<StoryAudience, "any">,
  limit = 8
): StoryTemplate[] {
  return templates
    .filter((template) => template.audience === audience || template.audience === "any")
    .slice(0, limit);
}
