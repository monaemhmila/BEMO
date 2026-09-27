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
 * same templates. It is therefore guarded with `require.main === module`.
 *
 * Idempotent: safe to run repeatedly (upsert by id).
 * Run with: npx ts-node prisma/seed-templates.ts
 */

export const BEAT_COUNT = 14;

export interface TemplatePrompts {
  theme: string;
  moralLesson: string;
  educationalFocus: string;
  worldContext: string;
  beats: string[];
}

export interface TemplateSeed {
  id: string;
  name: string;
  description: string;
  ageRange: string;
  category: string;
  difficulty: number;
  tags: string[];
  prompts: TemplatePrompts;
}

// ── Storefront templates (/books) ─────────────────────────────────────────
// These ids are linked from the book detail pages, so they must exist in the
// database or "Personalise my book" has nothing to generate from.

export const STOREFRONT_TEMPLATES: TemplateSeed[] = [
  {
    id: "birthday-adventure-and-the-greedy-goblin",
    name: "Birthday Adventure and the Greedy Goblin",
    description:
      "Every present is empty — until the biggest box turns out to be hiding a tiny goblin with a mountain of stolen toys.",
    ageRange: "4-8",
    category: "sentimental",
    difficulty: 1,
    tags: ["birthday", "kindness", "sharing", "magic"],
    prompts: {
      theme:
        "opens a mountain of birthday presents to find every single box empty, falls into the very last one, discovers a greedy tiny goblin hiding inside who has stolen every gift in the whole world, confronts him and gets them all back magicly, then shares one of their own gifts with the lonely goblin nobody ever invited",
      moralLesson:
        "Taking what belongs to others leaves you alone; the best gift is the one you give away.",
      educationalFocus:
        "Counting and comparing how many gifts there are, and how sharing makes everyone happier.",
      worldContext:
        "A birthday living room buried under ribbons and torn paper, a hill of empty cardboard boxes, a trail of green crumbs and tiny footprints, and a goblin no bigger than a teacup asleep on a mountain of stolen toys.",
      beats: [
        "It is the hero's birthday, and the living room is buried under ribbons — a whole hill of wrapped boxes, and everyone is singing.",
        "The first box is opened with a great tearing tug of paper, and out float nothing at all: one curled ribbon and a chocolate coin.",
        "The second box is empty. So is the third, and the fourth — just tissue paper, confetti, and a lid.",
        "Even the enormous round box with the golden ribbon weighs less than a feather, and the hero's smile slowly goes.",
        "The hero counts the boxes and checks them all over twice, but nineteen empty boxes stay exactly nineteen empty boxes.",
        "Then the door bursts open and all the neighbours' children tumble in — and every single one of them opens an empty box too.",
        "Behind the sofa the hero finds green crumbs, a torn corner of paper, and tiny green footprints leading straight to the biggest box.",
        "The hero goes in to look, tumbles, and lands on something that squeaks: a goblin no bigger than a teacup, asleep on a mountain of every toy in the world.",
        "The goblin wakes, giggles, and admits he took them all because nobody ever gave him a single thing, and waves his wand: 'Everything is mine.'",
        "The boxes slide away and the walls grow taller, and the hero backs into the corner, frightened and out of ideas.",
        "The hero tries reason and kindness, but the goblin only curls tighter around the biggest toys and laughs.",
        "Turning to run, the hero sees it — the goblin's long thin tail, curled right underfoot — and steps on it. Squeak! The wand clatters down.",
        "The hero tells him the children have been crying all morning, and the goblin's grin fades as he stands on an empty floor with nothing of his own — until he quietly taps his wand, and every gift in the world flies home to the child it belongs to.",
        "The hero climbs out to a house full of presents again, picks the smallest gift out of their own pile, ties a ribbon on it, and says: 'This one is for you. Will you come to my birthday?' The goblin's grin comes back bigger than before, and next year there are two names on the guest list.",
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

    const prompts = template.prompts as unknown as Prisma.InputJsonValue;

    await client.storyTemplate.upsert({
      where: { id: template.id },
      update: {
        name: template.name,
        description: template.description,
        ageRange: template.ageRange,
        category: template.category,
        difficulty: template.difficulty,
        tags: template.tags,
        prompts,
        isActive: true,
        source: "PREDEFINED",
        ownerUserId: null,
      },
      create: {
        id: template.id,
        name: template.name,
        description: template.description,
        ageRange: template.ageRange,
        category: template.category,
        difficulty: template.difficulty,
        tags: template.tags,
        prompts,
        sampleImage: null,
        coverImage: null,
        isActive: true,
        source: "PREDEFINED",
        ownerUserId: null,
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

if (require.main === module) {
  main().catch((error) => {
    console.error("Error seeding story templates:", error);
    process.exit(1);
  });
}
