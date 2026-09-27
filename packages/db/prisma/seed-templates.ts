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
    id: "the-princess-magical-garden",
    name: "The Princess's Magical Garden",
    description:
      "A little princess discovers that her flowers need more than magic to grow. With water, sunlight, patience, and love, she helps her sleepy garden bloom.",
    ageRange: "2-3",
    category: "educative",
    difficulty: 1,
    tags: ["princess", "garden", "flowers", "nature", "learning", "kindness"],
    tagline: "With a little water, sunshine, and love, beautiful things can grow.",
    excerpt:
      "The little princess had a beautiful garden, but something was wrong. Her flowers were tiny, sleepy, and closed. She tried her biggest magic spell, but nothing happened. Then she discovered that the flowers did not need a magic spell at all — they needed water, sunlight, patience, and lots of love.",
    emoji: "🌸",
    audience: "any",
    artStyle: "soft colorful 3D animated princess storybook illustration",
    coverImage:
      "https://images.unsplash.com/photo-1490750967868-88aa4486c946?q=80&w=1200&auto=format&fit=crop",
    previews: [
      {
        src: "/templates/princess-garden/preview-1.jpg",
        type: "image",
        mimeType: "image/jpeg",
        caption: "The little princess discovers a garden full of sleepy flowers.",
      },
      {
        src: "/templates/princess-garden/preview-2.jpg",
        type: "image",
        mimeType: "image/jpeg",
        caption: "The princess carefully gives her flowers water and sunlight.",
      },
      {
        src: "/templates/princess-garden/preview-3.jpg",
        type: "image",
        mimeType: "image/jpeg",
        caption: "The magical garden finally bursts into beautiful colorful flowers.",
      },
    ],
    review: {
      rating: 5,
      count: 864,
      quote:
        "My little girl loved watering the flowers after reading this story. Now she checks our garden every morning!",
      author: "Sophie L.",
    },
    prompts: {
      theme:
        "a sweet little princess discovering that her sleepy garden flowers need water, sunlight, time, care, and love to grow, learning to patiently care for them every day until the entire magical garden blooms",
      moralLesson:
        "Beautiful things take time and care to grow, and patience, kindness, and responsibility help us make things better.",
      educationalFocus:
        "Learning the basic needs of plants: water, sunlight, healthy soil, time, and care.",
      worldContext:
        "A beautiful magical castle garden filled with colorful flowers, butterflies, ladybugs, small birds, green leaves, soft grass, a little stone fountain, flower pots, and warm golden sunlight.",
      beats: [
        "One sunny morning, the little princess wakes up and runs to her magical garden to say hello to her flowers.",
        "But the flowers are tiny and sleepy, with their little petals closed tightly instead of showing their beautiful colors.",
        "The princess waves her magic wand and says a big magic word, but nothing happens, so she looks at her flowers with a curious little smile.",
        "A friendly butterfly lands beside her, and the princess notices that the soil is dry and the flowers look very thirsty.",
        "The princess picks up a little blue watering can and gently gives each flower some fresh water.",
        "Then she moves the flower pots into the warm sunshine, where the flowers can feel the bright golden light.",
        "The princess visits the garden again the next morning, but the flowers are still small, so she learns that growing takes time and decides not to give up.",
        "Every day, the princess gives the flowers water, makes sure they get sunlight, gently removes little weeds, and talks to them with a happy smile.",
        "Slowly, tiny green leaves appear, and one little pink flower opens its first petal while a butterfly dances beside it.",
        "More flowers begin to open in red, yellow, pink, purple, and blue, filling the garden with color and sweet little scents.",
        "The princess dances happily through her blooming garden as butterflies, bees, birds, and ladybugs arrive to enjoy the flowers.",
        "But one very hot day the sun beats down all afternoon, and when the princess comes back she finds the flowers drooping sadly and wonders if she has done something wrong.",
        "So the princess moves the pots into the shade of a little tree, keeps a careful note of the days she waters them, and waits as patiently as she can for them to lift their heads again.",
        "The next morning she sits quietly in the garden and watches a bee visit every single flower, marvelling at how much has changed since the day she first found them asleep.",
        "The princess learns that her garden did not grow because of a magic spell — it grew because she gave it water, sunlight, patience, and love, and she promises to care for it every day.",
      ],
    },
  },

  {
    id: "the-princess-birthday-surprise",
    name: "The Princess's Birthday Surprise",
    description:
      "A little princess thinks everyone has forgotten her birthday, but a trail of ribbons and balloons leads her to a magical secret garden filled with friends and a wonderful surprise.",
    ageRange: "2-3",
    category: "birthday",
    difficulty: 1,
    tags: ["birthday", "princess", "surprise", "friends", "animals", "kindness"],
    tagline: "Sometimes the biggest surprises are hiding where we least expect them.",
    excerpt:
      "It was the little princess's birthday. She woke up and looked around. No balloons. No cake. No singing. Had everyone forgotten? Then she spotted something strange — one tiny pink ribbon on the floor. She followed it through the castle, past a red balloon and a golden bow, until she discovered a secret garden full of friends waiting just for her.",
    emoji: "🎂",
    audience: "any",
    artStyle: "warm colorful 3D animated princess birthday storybook illustration",
    coverImage:
      "https://images.unsplash.com/photo-1464349153735-7db50ed83c84?q=80&w=1200&auto=format&fit=crop",
    previews: [
      {
        src: "/templates/princess-birthday/preview-1.jpg",
        type: "image",
        mimeType: "image/jpeg",
        caption: "The little princess wakes up on her birthday and finds the castle strangely quiet.",
      },
      {
        src: "/templates/princess-birthday/preview-2.jpg",
        type: "image",
        mimeType: "image/jpeg",
        caption: "A trail of colorful ribbons and balloons leads the princess through the castle.",
      },
      {
        src: "/templates/princess-birthday/preview-3.jpg",
        type: "image",
        mimeType: "image/jpeg",
        caption: "The princess discovers her animal friends waiting in a magical birthday garden.",
      },
    ],
    review: {
      rating: 5,
      count: 1107,
      quote:
        "The secret garden reveal made my daughter smile from beginning to end. She now thinks every birthday needs a treasure hunt!",
      author: "Emma R.",
    },
    prompts: {
      theme:
        "a sweet little princess celebrating her birthday, waking up to a mysteriously quiet castle, following a magical trail of ribbons, bows, balloons, and tiny clues through the castle and garden, finally discovering all her animal friends preparing a beautiful surprise birthday party",
      moralLesson:
        "Love and friendship are more important than presents, and a thoughtful surprise can make someone feel very special.",
      educationalFocus:
        "Learning simple colors, following a sequence of clues, identifying birthday objects, recognizing emotions, and understanding friendship and gratitude.",
      worldContext:
        "A beautiful fairytale castle with soft pastel rooms, colorful balloons, ribbons, flowers, a sunny garden, friendly rabbits, birds, butterflies, bunnies, a tiny deer, and a magical secret garden decorated for a birthday celebration.",
      beats: [
        "It is the little princess's birthday, and she wakes up in her cozy castle bedroom expecting balloons, cake, and happy birthday songs.",
        "But the castle is strangely quiet, with no balloons, no cake, and nobody waiting at her door, so the princess feels a little sad.",
        "Then she notices a tiny pink ribbon on the floor and wonders where it came from.",
        "The princess follows the ribbon through the castle and discovers a bright red balloon waiting at the end of the hallway.",
        "The red balloon leads her to a golden bow beside the castle door, and the princess begins to wonder if she is following a secret birthday trail.",
        "Outside, she finds another ribbon beside a little blue balloon, and a friendly butterfly flutters ahead as if it wants her to follow.",
        "The princess walks through the garden and finds tiny paw prints leading toward a little wooden gate covered with flowers.",
        "Behind the gate is a beautiful secret garden, but it is completely quiet, and the princess wonders if she has reached the end of the trail.",
        "Suddenly, the flowers begin to wiggle, the bushes move, and a little rabbit pops out wearing a tiny birthday bow.",
        "One by one, all the princess's animal friends appear — birds, butterflies, bunnies, a little deer, and a friendly puppy — and they all shout a happy birthday.",
        "The princess discovers a beautiful birthday cake, colorful balloons, flowers, music, and a special table filled with treats, and she smiles because her friends planned everything just for her.",
        "The princess runs to her nearest friend and hugs them tightly, and soon every animal friend is dancing and playing games all around her birthday cake.",
        "They play until the sun is low, sharing out the treats, and the princess laughs more than she has all year because sharing a birthday is better than any present.",
        "As the sky turns pink, the princess looks around at all her friends and realises she had never been forgotten at all — she had a whole surprise waiting for her.",
        "The princess realizes that everyone had not forgotten her at all — they were secretly preparing a special surprise, and she learns that being loved and surrounded by friends is the most wonderful birthday gift of all.",
      ],
    },
  },
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
