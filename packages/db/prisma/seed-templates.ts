import { Prisma, PrismaClient } from "@prisma/client";

/**
 * Story template seed script.
 *
 * A `StoryTemplate.prompts` document has this shape:
 *   { theme, moralLesson, educationalFocus, worldContext, beats: string[14] }
 *
 * The 14 beats are the canonical 14-page arc: page 1 hook, page 2 discovery,
 * pages 3-7 first attempts and setbacks, page 8 midpoint triumph, pages 9-11
 * growing trouble, page 12 turning point, page 13 resolution, page 14 closing.
 *
 * This module is also imported by `seed.ts` so a plain `db:seed` installs the
 * same templates, so it must not seed on import. This package compiles as an ES
 * module ("module": "ESNext"), which means `require` and `module` do not exist
 * here — the entry point is detected from argv instead.
 *
 * Idempotent: safe to run repeatedly (upsert by id).
 * Run with: npx ts-node prisma/seed-templates.ts
 */

export const BEAT_COUNT = 15;

/**
 * Mirrors MAX_PREVIEWS in apps/backend/src/lib/template-images.ts and the admin
 * zod schema. Duplicated rather than imported because this package must not
 * depend on the backend app; keep the three in step.
 */
export const MAX_TEMPLATE_PREVIEWS = 12;

/**
 * Mirrors SAFE_IMAGE_URL in apps/backend/src/routes/admin.routes.ts, so a
 * preview the seed writes is still accepted when the template is re-saved
 * through /admin. The negative lookahead keeps a protocol-relative "//host"
 * value out.
 */
const SAFE_IMAGE_URL = /^(https?:\/\/|\/(?!\/))/i;

export interface TemplatePrompts {
  theme: string;
  moralLesson: string;
  educationalFocus: string;
  worldContext: string;
  beats: string[];
}

export interface TemplateReview {
  rating: number;
  count: number;
  quote: string;
  author: string;
}

/**
 * One gallery slide on the storefront detail page. `src` must be an http(s) URL
 * or a root-relative path; a protocol-relative "//host" value is rejected by the
 * admin schema and must not be seeded. Predefined templates point at committed
 * art in the web app's public folder so a fresh clone renders the gallery with
 * no upload step.
 */

export interface TemplatePreview {
  src: string;
  type?: "image" | "video";
  mimeType?: string;
  caption?: string;
}

export interface TemplateSeed {
  id: string;
  name: string;
  description: string;
  ageRange: string;
  category: string;
  difficulty: number;
  tags: string[];
  /** Storefront copy rendered by /books. Null/omitted fields simply go unused. */
  tagline?: string;
  excerpt?: string;
  emoji?: string;
  audience?: string;
  artStyle?: string;
  review?: TemplateReview;
  coverImage?: string;
  previews?: TemplatePreview[];
  prompts: TemplatePrompts;
}

// ── Storefront templates (/books) ─────────────────────────────────────────
// These ids are linked from the book detail pages, so they must exist in the
// database or "Personalise my book" has nothing to generate from.

export const STOREFRONT_TEMPLATES: TemplateSeed[] = [
  {
    id: "lets-count-1-10",
    name: "Let's Count! 1–10",
    description:
      "A playful counting adventure where the child counts animals from one to five and then discovers colorful fruits while counting from six to ten.",
    ageRange: "2-4",
    category: "adventure",
    difficulty: 1,
    tags: [
      "numbers",
      "counting",
      "animals",
      "fruits",
      "1-10",
      "math",
      "learning"
    ],
    tagline:
      "Count the animals, count the fruits, and discover numbers 1 to 10!",
    excerpt:
      "The child begins a counting adventure with friendly animals. First there is one, then two, three, four, and five. After that, a colorful fruit garden appears, bringing six, seven, eight, nine, and ten into the adventure. Every number is shown clearly with exactly the right number of objects.",
    emoji: "🔢",
    audience: "any",
    artStyle:
      "soft colorful 3D animated educational children's storybook illustration",
    coverImage:
      "https://images.unsplash.com/photo-1551963831-b3b1ca40c98e?q=80&w=1200&auto=format&fit=crop",
    review: {
      rating: 5,
      count: 1047,
      quote:
        "The pictures make counting so easy for my little one. She loves pointing at every animal and fruit!",
      author: "Claire M.",
    },
    prompts: {
      theme:
        "a playful counting adventure where the child learns numbers one through ten by physically counting clearly visible animals and then fruits",
      moralLesson:
        "Learning numbers becomes easier and more fun when we practice by counting things we can see.",
      educationalFocus:
        "Number recognition, one-to-one counting, quantity recognition, and connecting spoken numbers with the correct number of visible objects.",
      worldContext:
        "A bright playful world containing a friendly animal meadow followed by a colorful fruit garden, with large clear spaces where groups of objects can be easily seen and counted.",
      beats: [
        "The child enters a cheerful meadow and discovers that the day's adventure is all about counting.",
        "The child finds exactly one friendly animal and learns that this quantity is called the first number.",
        "The child discovers exactly two animals together and carefully counts them one by one.",
        "The child finds exactly three animals and points to each animal while saying the numbers in order.",
        "The child discovers exactly four animals and practices making sure every animal is counted only once.",
        "The child reaches a sunny meadow with exactly five animals and proudly counts all five.",
        "The child leaves the meadow and enters a colorful fruit garden where a new part of the counting adventure begins.",
        "The child discovers exactly six pieces of fruit and counts each piece carefully from the beginning.",
        "The child finds exactly seven pieces of fruit and learns that seven means there are seven separate fruits to count.",
        "The child discovers exactly eight pieces of fruit and checks the group carefully to make sure none are missed.",
        "The child finds exactly nine pieces of fruit and counts them slowly and clearly.",
        "The child reaches a beautiful fruit table containing exactly ten pieces of fruit and counts all ten.",
        "The child mixes the animals and fruits in a playful review but is reminded to count each visible object carefully.",
        "The child practices recognizing several numbers again by matching each number with the correct quantity shown in the scene.",
        "The child celebrates reaching ten and learns that counting carefully helps us know exactly how many things we have.",
      ],
    },
  }, {
    id: "my-abc-adventure",
    name: "My ABC Adventure",
    description:
      "A playful learning adventure where the child explores the alphabet two letters at a time, discovering a familiar word for each letter in the selected language.",
    ageRange: "3-5",
    category: "adventure",
    difficulty: 1,
    tags: ["alphabet", "ABC", "letters", "words", "learning", "language"],
    tagline:
      "Every letter opens the door to a new word!",
    excerpt:
      "The child begins a colorful alphabet adventure, discovering two new letters at a time. Each letter is paired with a simple familiar word in the selected language, helping the child recognize the letter, learn its sound, and connect it with a real word.",
    emoji: "🔤",
    audience: "any",
    artStyle:
      "soft colorful 3D animated educational children's storybook illustration",
    coverImage:
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1200&auto=format&fit=crop",
    review: {
      rating: 5,
      count: 912,
      quote:
        "My child started recognizing letters and asking what words begin with them after just a few readings!",
      author: "Emma R.",
    },
    prompts: {
      theme:
        "a playful alphabet adventure where the child learns the letters of the selected language's alphabet two letters at a time, with each letter connected to one simple familiar word in that same language",
      moralLesson:
        "Learning can be fun, and practicing a little at a time helps us discover new things.",
      educationalFocus:
        "Letter recognition, alphabet order, and connecting every letter with one simple age-appropriate word in the selected language.",
      worldContext:
        "A colorful magical learning world containing playful paths, gardens, classrooms, toy houses, friendly animals, colorful objects, floating letters, books, and cheerful decorations.",
      beats: [
        "The child begins a magical alphabet adventure and learns that the adventure will reveal the letters of the selected language's alphabet two letters at a time.",

        "The child discovers LETTER 1 and LETTER 2 of the selected language's alphabet. The child learns to recognize both letters and discovers one simple, familiar, age-appropriate word for each letter.",

        "The child discovers LETTER 3 and LETTER 4 of the selected language's alphabet. The child learns to recognize both new letters and discovers one simple, familiar, age-appropriate word for each letter.",

        "The child discovers LETTER 5 and LETTER 6 of the selected language's alphabet. The child learns to recognize both new letters and discovers one simple, familiar, age-appropriate word for each letter.",

        "The child discovers LETTER 7 and LETTER 8 of the selected language's alphabet. The child learns to recognize both new letters and discovers one simple, familiar, age-appropriate word for each letter.",

        "The child discovers LETTER 9 and LETTER 10 of the selected language's alphabet. The child learns to recognize both new letters and discovers one simple, familiar, age-appropriate word for each letter.",

        "The child discovers LETTER 11 and LETTER 12 of the selected language's alphabet. The child learns to recognize both new letters and discovers one simple, familiar, age-appropriate word for each letter.",

        "The child discovers LETTER 13 and LETTER 14 of the selected language's alphabet. The child learns to recognize both new letters and discovers one simple, familiar, age-appropriate word for each letter.",

        "The child discovers LETTER 15 and LETTER 16 of the selected language's alphabet. The child learns to recognize both new letters and discovers one simple, familiar, age-appropriate word for each letter.",

        "The child discovers LETTER 17 and LETTER 18 of the selected language's alphabet. The child learns to recognize both new letters and discovers one simple, familiar, age-appropriate word for each letter.",

        "The child discovers LETTER 19 and LETTER 20 of the selected language's alphabet. The child learns to recognize both new letters and discovers one simple, familiar, age-appropriate word for each letter.",

        "The child discovers LETTER 21 and LETTER 22 of the selected language's alphabet. The child learns to recognize both new letters and discovers one simple, familiar, age-appropriate word for each letter.",

        "The child discovers LETTER 23 and LETTER 24 of the selected language's alphabet. The child learns to recognize both new letters and discovers one simple, familiar, age-appropriate word for each letter.",

        "The child discovers LETTER 25 and LETTER 26 of the selected language's alphabet. The child learns to recognize both new letters and discovers one simple, familiar, age-appropriate word for each letter.",

        "The child reaches the end of the alphabet adventure and discovers any remaining letters of the selected language's alphabet. If only one letter remains, the child learns that letter and its matching word. The child proudly reviews the letters and words discovered throughout the adventure.",
      ],
    },
  }


];

/**
 * Upserts every predefined template. Throws if a template is missing beats,
 * because the generation pipeline rejects any template that is not exactly
 * `BEAT_COUNT` long.
 */
export async function seedStoryTemplates(client: PrismaClient): Promise<number> {
  for (const template of STOREFRONT_TEMPLATES) {
    if (template.prompts.beats.length !== BEAT_COUNT) {
      throw new Error(
        `Template "${template.id}" has ${template.prompts.beats.length} beats, expected ${BEAT_COUNT}`,
      );
    }

    if ((template.previews?.length ?? 0) > MAX_TEMPLATE_PREVIEWS) {
      throw new Error(
        `Template "${template.id}" has ${template.previews!.length} previews, expected at most ${MAX_TEMPLATE_PREVIEWS}`,
      );
    }

    for (const preview of template.previews ?? []) {
      if (!SAFE_IMAGE_URL.test(preview.src)) {
        throw new Error(
          `Template "${template.id}" has an unusable preview src "${preview.src}". ` +
          `Use an http(s) URL or a root-relative path, never a protocol-relative one.`,
        );
      }
    }

    const prompts = template.prompts as unknown as Prisma.InputJsonValue;
    const review = (template.review ?? null) as unknown as Prisma.InputJsonValue;
    const previews = (template.previews ?? null) as unknown as Prisma.InputJsonValue;

    // Catalogue copy is part of the template's identity: a seed run refreshes it
    // rather than leaving stale marketing text behind.
    const catalogue = {
      name: template.name,
      description: template.description,
      ageRange: template.ageRange,
      category: template.category,
      difficulty: template.difficulty,
      tags: template.tags,
      prompts,
      isActive: true,
      source: "PREDEFINED" as const,
      ownerUserId: null,
      tagline: template.tagline ?? null,
      excerpt: template.excerpt ?? null,
      emoji: template.emoji ?? null,
      audience: template.audience ?? "any",
      artStyle: template.artStyle ?? null,
      coverImage: template.coverImage ?? null,
      previews,
      review,
    };

    await client.storyTemplate.upsert({
      where: { id: template.id },
      update: catalogue,
      create: {
        id: template.id,
        sampleImage: null,
        ...catalogue,
      },
    });

    console.log(`  ✓ ${template.id} (${template.prompts.beats.length} beats)`);
  }

  return STOREFRONT_TEMPLATES.length;
}

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log("Seeding story templates...\n");
    const count = await seedStoryTemplates(prisma);
    console.log(`\nDone. Seeded ${count} predefined templates.`);
  } finally {
    await prisma.$disconnect();
  }
}

// `seed.ts` imports this module, so only seed when this file is the script being
// run. argv is the portable signal here because the package is compiled as ESM.
const invokedDirectly = (process.argv[1] ?? "").includes("seed-templates");

if (invokedDirectly) {
  main().catch((error) => {
    console.error("Error seeding story templates:", error);
    process.exit(1);
  });
}
