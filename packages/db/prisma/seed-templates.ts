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
  nameFr?: string;
  nameAr?: string;
  descriptionFr?: string;
  descriptionAr?: string;
  taglineFr?: string;
  taglineAr?: string;
  excerptFr?: string;
  excerptAr?: string;
  emoji?: string;
  audience?: string;
  artStyle?: string;
  review?: TemplateReview;
  coverImage?: string;
  previews?: TemplatePreview[];
  prompts: TemplatePrompts;
}

type AdditionalTemplateStory = {
  id: string;
  name: string;
  description: string;
  ageRange: string;
  category: string;
  tags: string[];
  theme: string;
  moralLesson: string;
  educationalFocus: string;
  worldContext: string;
  beats: [string, string, string, string];
  coverImage: string;
  emoji: string;
};

function expandStoryArc(story: AdditionalTemplateStory): TemplatePrompts {
  const [opening, journey, turningPoint, resolution] = story.beats;
  return {
    theme: story.theme,
    moralLesson: story.moralLesson,
    educationalFocus: story.educationalFocus,
    worldContext: story.worldContext,
    beats: [
      opening,
      `The child discovers a special friend and learns what is wrong: ${journey}`,
      "Together they make a gentle plan and take their first brave step.",
      "The first attempt is difficult, but the child listens and keeps trying.",
      "A small act of kindness gives their friend fresh hope.",
      "They travel deeper into this magical world and meet someone who needs help.",
      "The child notices that every person and creature has feelings worth respecting.",
      "A new clue appears, showing the child what must be done next.",
      "A setback makes the goal feel far away, but the friends encourage one another.",
      "The child uses patience, teamwork, and imagination instead of giving up.",
      "The magical world grows brighter as everyone shares a little courage.",
      `At the turning point, the child chooses what matters most: ${turningPoint}`,
      resolution,
      `The child celebrates with their new friends and understands that ${story.moralLesson.toLowerCase()}`,
      "The adventure ends peacefully, with love and hope carried home.",
    ],
  };
}

function makeAdditionalTemplate(story: AdditionalTemplateStory): TemplateSeed {
  return {
    id: story.id,
    name: story.name,
    description: story.description,
    ageRange: story.ageRange,
    category: story.category,
    difficulty: 1,
    tags: story.tags,
    emoji: story.emoji,
    audience: "any",
    artStyle: "photorealistic children's storybook photography",
    coverImage: story.coverImage,
    prompts: expandStoryArc(story),
  };
}

const ADDITIONAL_TEMPLATE_STORIES: TemplateSeed[] = [
  makeAdditionalTemplate({
    id: "my-little-dragon-friend", name: "My Little Dragon Friend",
    description: "A brave child helps Ember, a tiny dragon who has forgotten how to fly, and discovers the power of patient friendship.",
    ageRange: "3-6", category: "friendship", tags: ["friendship", "empathy", "courage", "dragons"],
    theme: "A child and a little dragon help each other find courage.", moralLesson: "True friendship believes in someone when they stop believing in themselves.", educationalFocus: "Empathy, patience, encouragement, and emotional resilience.", worldContext: "Whispering Woods, Crystal River, Mountain of Clouds, glowing valleys, and rainbow waterfalls.",
    beats: ["In a peaceful forest, the child finds Ember, a tiny dragon hiding and crying because their wings are too small.", "The child and Ember cross the Whispering Woods and Crystal River to reach the Mountain of Clouds where dragons learn to fly.", "After several failed attempts, the child hugs Ember and promises never to leave; Ember finally spreads their wings and flies.", "They soar over glowing valleys and rainbow waterfalls, then return to Ember's family, who give the child a glowing scale."],
    coverImage: "/templates/my-little-dragon-friend/cover.png", emoji: "🐉",
  }),
  makeAdditionalTemplate({
    id: "the-castle-above-the-clouds", name: "The Castle Above the Clouds",
    description: "A kind child helps Princess Luna restore a fading Heart Crystal by bringing comfort and hope to the cloud kingdom.",
    ageRange: "4-7", category: "kindness", tags: ["kindness", "generosity", "happiness", "princess"],
    theme: "Kindness brings light back to a floating kingdom.", moralLesson: "Happiness grows when we bring joy, comfort, and hope to others.", educationalFocus: "Generosity, emotional awareness, compassion, and sharing.", worldContext: "A golden staircase, floating castle, Garden of Forgotten Wishes, and Bridge of Rainbows.",
    beats: ["A golden staircase carries the child to a castle above the clouds, where Princess Luna's Heart Crystal has stopped glowing.", "The child helps a lonely cloud creature, comforts a frightened bird, and listens to a star who feels forgotten.", "In the Garden of Forgotten Wishes, the child discovers that every caring act makes the Heart Crystal brighter.", "The Guardian of Clouds welcomes the child, and the kingdom celebrates a happiness created through kindness."],
    coverImage: "/templates/the-castle-above-the-clouds/cover.png", emoji: "☁️",
  }),
  makeAdditionalTemplate({
    id: "my-dinosaur-adventure", name: "My Dinosaur Adventure",
    description: "A child helps Tiko the baby Triceratops find his mother and learns that teamwork can protect every small creature.",
    ageRange: "3-6", category: "adventure", tags: ["dinosaurs", "compassion", "teamwork", "nature"],
    theme: "Helping a lost friend brings a prehistoric valley together.", moralLesson: "Compassion and teamwork help us protect one another.", educationalFocus: "Problem-solving, cooperation, caring for animals, and environmental awareness.", worldContext: "A glowing dinosaur doorway, Fern Forest, Great Dinosaur Lake, and a rumbling volcano.",
    beats: ["A glowing dinosaur egg becomes a doorway, and the child meets Tiko, a baby Triceratops who cannot find his mother.", "They follow giant footprints through Fern Forest to the Great Dinosaur Lake while helping smaller creatures along the way.", "When a volcano rumbles, the child and the dinosaurs work together to guide everyone to safety.", "Tiko reunites with his mother and gives the child a smooth leaf-shaped stone as a reminder of their teamwork."],
    coverImage: "/templates/my-dinosaur-adventure/cover.png", emoji: "🦕",
  }),
  makeAdditionalTemplate({
    id: "the-secret-door-to-fairyland", name: "The Secret Door to Fairyland",
    description: "A child enters Fairyland and helps Lila rediscover her wings by choosing a selfless act over a personal wish.",
    ageRange: "4-7", category: "fantasy", tags: ["fairies", "self-confidence", "belonging", "inner-beauty"],
    theme: "Belonging and inner beauty shine through selfless choices.", moralLesson: "Our inner beauty grows when we help others without asking for a reward.", educationalFocus: "Self-confidence, belonging, selflessness, and positive self-image.", worldContext: "Grandma's garden, a golden tree door, Moonflower Meadow, Valley of Fireflies, and a Wishing Flower.",
    beats: ["In Grandma's garden, the child discovers a golden door in an old tree and steps into Fairyland.", "Lila the fairy has lost the sparkle in her wings, so the child joins her through Moonflower Meadow and the Valley of Fireflies.", "The Wishing Flower can restore Lila's wings, but it blooms only after a truly selfless act.", "The child gives up their own wish to help Lila, and the fairy's wings glow brighter than ever."],
    coverImage: "/templates/the-secret-door-to-fairyland/cover.png", emoji: "🧚",
  }),
  makeAdditionalTemplate({
    id: "the-little-wizards-first-spell", name: "The Little Wizard's First Spell",
    description: "After a string of silly mistakes, a young wizard discovers that confidence grows through practice, courage, and asking for help.",
    ageRange: "4-7", category: "adventure", tags: ["magic", "perseverance", "mistakes", "confidence"],
    theme: "Mistakes can become steps toward courage and confidence.", moralLesson: "Perseverance turns mistakes into learning and courage.", educationalFocus: "Growth mindset, persistence, confidence, and learning from mistakes.", worldContext: "A magical academy, Professor Hoot's classroom, enchanted shoes, pumpkins, and a lantern-lit night.",
    beats: ["An invitation brings the child to a magical academy, where Professor Hoot teaches the first spell.", "The spell goes wrong: shoes hop like frogs and pumpkins roll through the classroom.", "The child nearly quits, but when the academy lantern goes dark, they remember the lessons and ask trusted friends for help.", "The child guides everyone safely with a careful spell and is celebrated as the Bravest Little Wizard."],
    coverImage: "/templates/the-little-wizards-first-spell/cover.png", emoji: "🪄",
  }),
  makeAdditionalTemplate({
    id: "the-rainbow-that-lost-its-colors", name: "The Rainbow That Lost Its Colors",
    description: "A child helps Puffy the cloud remember the small beautiful moments that bring color back to the sky.",
    ageRange: "3-5", category: "discovery", tags: ["gratitude", "emotions", "differences", "nature"],
    theme: "Wonder and gratitude can brighten difficult feelings.", moralLesson: "Noticing small beautiful things helps us understand our feelings and appreciate differences.", educationalFocus: "Gratitude, emotional vocabulary, observation, and acceptance.", worldContext: "A gray sky, Strawberry Fields, Golden Sunflower Meadow, Emerald Forest, and a friendly cloud.",
    beats: ["The child wakes to find the rainbow gray and meets Puffy, a cloud who says the colors have been forgotten.", "Together they visit Strawberry Fields, a Golden Sunflower, and the Emerald Forest, noticing kindness, warmth, and wonder.", "Each grateful memory returns one rainbow color, and Puffy learns that sadness can be shared instead of hidden.", "The child thanks Puffy for the journey, and the rainbow returns brighter because every color is different and needed."],
    coverImage: "/templates/the-rainbow-that-lost-its-colors/cover.png", emoji: "🌈",
  }),
  makeAdditionalTemplate({
    id: "the-unicorns-missing-star", name: "The Unicorn's Missing Star",
    description: "A child helps Stella the unicorn return a fallen star to the night sky and learns that hope sometimes means letting go.",
    ageRange: "3-6", category: "fantasy", tags: ["unicorns", "hope", "selflessness", "letting-go"],
    theme: "Hope shines brightest when we help something precious find its way home.", moralLesson: "Selfless love can mean letting go so someone else can shine.", educationalFocus: "Hope, empathy, selflessness, coping with change, and emotional strength.", worldContext: "Moonlight Lake, Sleeping Forest, Silver River, and a cave filled with gentle echoes.",
    beats: ["At Moonlight Lake, the child meets Stella, a white unicorn whose special star has fallen from the sky.", "They follow a trail of stardust through the Sleeping Forest, across the Silver River, and into the Cave of Echoes.", "The child comforts the frightened star and understands that it belongs in the sky, even though they want to keep it close.", "With a brave goodbye, they return the star to the heavens, where it shines brighter and fills the valley with hope."],
    coverImage: "/templates/the-unicorns-missing-star/cover.png", emoji: "🦄",
  }),
  makeAdditionalTemplate({
    id: "the-magic-toy-shop", name: "The Magic Toy Shop",
    description: "A child discovers that every toy has a story and chooses to love Benny, an old teddy bear, just as he is.",
    ageRange: "3-6", category: "friendship", tags: ["acceptance", "compassion", "toys", "belonging"],
    theme: "Being loved and accepted matters more than looking new.", moralLesson: "The things we love are valuable because of their stories, not because they are perfect.", educationalFocus: "Acceptance, compassion, gratitude, and valuing relationships over appearances.", worldContext: "A rainy toy shop at midnight, Toy Train City, Dollhouse Palace, and Music Box Garden.",
    beats: ["On a rainy night, the child enters a toy shop and discovers that the toys come alive after midnight.", "Captain Button leads a tour through Toy Train City, Dollhouse Palace, and Music Box Garden.", "Benny, an old teddy bear, hides because he is missing a button and worries that nobody will choose him.", "The child repairs Benny's button and chooses him with love, showing that a well-loved toy is never less special."],
    coverImage: "/templates/the-magic-toy-shop/cover.png", emoji: "🧸",
  }),
  makeAdditionalTemplate({
    id: "my-magical-shapes-adventure", name: "My Magical Shapes Adventure",
    description: "A child helps Coco, Sammy, and Tina restore the shapes of Shape Village and learns that differences make the world beautiful.",
    ageRange: "2-4", category: "educative", tags: ["shapes", "problem-solving", "friendship", "early-learning"],
    theme: "Different shapes and talents work together to build something wonderful.", moralLesson: "Everyone has a different purpose, and our differences make the world more beautiful when we work together.", educationalFocus: "Recognizing circles, squares, and triangles; matching shapes to everyday objects; early problem-solving.", worldContext: "Shape Village, Rainbow Playground, Cookie Bakery, and Castle of Shapes.",
    beats: ["On a sunny morning, the child finds Coco, a tiny talking circle, crying because Shape Village has lost all its shapes.", "The child meets Sammy the Square and Tina the Triangle and searches the Rainbow Playground, Cookie Bakery, and Castle of Shapes.", "They match round wheels, square windows, and triangular roofs, making the village colorful again.", "The friends build a little house together, celebrate with a shape parade, and give the child a golden Shape Explorer medal."],
    coverImage: "/templates/my-magical-shapes-adventure/cover.png", emoji: "🔺",
  }),
  makeAdditionalTemplate({
    id: "the-wonderful-world-of-colors", name: "The Wonderful World of Colors",
    description: "A child and a rainbow butterfly restore the colors of a gray world through kindness and gratitude.",
    ageRange: "2-4", category: "educative", tags: ["colors", "gratitude", "differences", "kindness"],
    theme: "Every color and every act of kindness adds beauty to the world.", moralLesson: "Every person brings something unique, and even the smallest kindness can brighten someone's day.", educationalFocus: "Recognizing primary and secondary colors, matching colors to familiar objects and animals, and visual recognition.", worldContext: "Strawberry Garden, Sunshine Meadow, Blueberry Lake, Emerald Forest, and a rainbow sky.",
    beats: ["The child wakes to discover that the flowers, sky, sun, and trees have all turned gray.", "Lili the rainbow butterfly leads the child through gardens, meadow, lake, and forest to collect the missing colors.", "The child helps a red ladybug, a yellow duckling, and a blue butterfly, and each kind act restores a color.", "When every color returns, Lili reveals a magnificent rainbow and the child celebrates how beautifully differences shine together."],
    coverImage: "/templates/the-wonderful-world-of-colors/cover.png", emoji: "🎨",
  }),
  makeAdditionalTemplate({
    id: "my-first-trip-to-space", name: "My First Trip to Space",
    description: "A curious child travels through space with Astro the robot and helps a tiny star believe in its own light.",
    ageRange: "4-7", category: "discovery", tags: ["space", "curiosity", "courage", "science"],
    theme: "Curiosity and encouragement help even the smallest light shine.", moralLesson: "You do not have to be the biggest or brightest to make a difference; keep exploring and believe in your special light.", educationalFocus: "The Moon, planets, stars, space travel, curiosity, imagination, and early scientific thinking.", worldContext: "A garden telescope, silver spaceship, Moon craters, Mars, Saturn's rings, and a quiet asteroid field.",
    beats: ["While looking through a telescope, the child sees a blinking star and meets Astro, a friendly robot in a tiny silver spaceship.", "They fly past the Moon, visit Mars, and glide beside Saturn while collecting clues about the missing light.", "Near an asteroid field, they meet Nova, a lonely little star who feels too small to matter.", "The child encourages Nova until she shines again, lights the way home, and gives the child a glowing star badge."],
    coverImage: "/templates/my-first-trip-to-space/cover.png", emoji: "🚀",
  }),
  makeAdditionalTemplate({
    id: "my-first-day-at-school", name: "My First Day at School",
    description: "A nervous child makes a new friend at Sunshine School and discovers that small acts of kindness can make new places feel safe.",
    ageRange: "3-6", category: "friendship", tags: ["school", "friendship", "confidence", "emotions"],
    theme: "Courage grows through small steps, kindness, and new friendships.", moralLesson: "It is okay to feel nervous when trying something new; helping someone else can help us feel brave too.", educationalFocus: "Separation confidence, naming nervous feelings, classroom routines, and making friends through kindness.", worldContext: "Sunshine School, a welcoming classroom, painting tables, reading corner, and colorful playground.",
    beats: ["On the first school morning, the child holds a parent's hand tightly while feeling excited and nervous.", "Miss Lily welcomes the child to Sunshine School and introduces Sami, a shy classmate who feels nervous too.", "When Sami spills his crayons, the child helps gather them and invites him to paint together.", "The children laugh and explore the classroom, and the child proudly hugs their parent at the end of a wonderful first day."],
    coverImage: "/templates/my-first-day-at-school/cover.png", emoji: "🎒",
  }),
];

// ── Storefront templates (/books) ─────────────────────────────────────────
// These ids are linked from the book detail pages, so they must exist in the
// database or "Personalise my book" has nothing to generate from.

export const STOREFRONT_TEMPLATES: TemplateSeed[] = [
  {
    id: "lets-count-1-10",
    name: "Let's Count! 1–10",
    description:
      "A playful counting adventure where the child counts animals from one to five and then discovers colorful fruits while counting from six to ten.",
    nameFr: "Comptons ! De 1 à 10",
    nameAr: "هيا نعدّ! من 1 إلى 10",
    descriptionFr:
      "Une aventure ludique où l'enfant compte des animaux de un à cinq, puis découvre des fruits colorés en comptant de six à dix.",
    descriptionAr:
      "مغامرة مرحة يعدّ فيها الطفل الحيوانات من واحد إلى خمسة، ثم يكتشف الفواكه الملونة وهو يعدّ من ستة إلى عشرة.",
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
    taglineFr: "Compte les animaux, compte les fruits et découvre les nombres de 1 à 10 !",
    taglineAr: "عدّ الحيوانات والفواكه واكتشف الأرقام من 1 إلى 10!",
    excerpt:
      "The child begins a counting adventure with friendly animals. First there is one, then two, three, four, and five. After that, a colorful fruit garden appears, bringing six, seven, eight, nine, and ten into the adventure. Every number is shown clearly with exactly the right number of objects.",
    excerptFr:
      "L'enfant commence une aventure de comptage avec des animaux sympathiques. Puis un jardin de fruits colorés apparaît pour faire découvrir les nombres de six à dix.",
    excerptAr:
      "يبدأ الطفل مغامرة ممتعة في العد مع حيوانات لطيفة، ثم تظهر حديقة فواكه ملونة لتعرّفه إلى الأعداد من ستة إلى عشرة.",
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
    nameFr: "Mon aventure avec l'alphabet",
    nameAr: "مغامرتي مع الحروف",
    descriptionFr:
      "Une aventure d'apprentissage où l'enfant explore l'alphabet deux lettres à la fois et découvre un mot familier pour chaque lettre dans la langue choisie.",
    descriptionAr:
      "مغامرة تعليمية يستكشف فيها الطفل الحروف حرفين في كل مرة، ويكتشف كلمة مألوفة لكل حرف باللغة المختارة.",
    ageRange: "3-5",
    category: "adventure",
    difficulty: 1,
    tags: ["alphabet", "ABC", "letters", "words", "learning", "language"],
    tagline:
      "Every letter opens the door to a new word!",
    taglineFr: "Chaque lettre ouvre la porte vers un nouveau mot !",
    taglineAr: "كل حرف يفتح الباب أمام كلمة جديدة!",
    excerpt:
      "The child begins a colorful alphabet adventure, discovering two new letters at a time. Each letter is paired with a simple familiar word in the selected language, helping the child recognize the letter, learn its sound, and connect it with a real word.",
    excerptFr:
      "L'enfant commence une aventure colorée dans l'alphabet et découvre deux nouvelles lettres à la fois. Chaque lettre est associée à un mot simple et familier dans la langue choisie.",
    excerptAr:
      "يبدأ الطفل مغامرة ملونة في عالم الحروف، فيكتشف حرفين جديدين في كل مرة، ويربط كل حرف بكلمة بسيطة ومألوفة باللغة المختارة.",
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
  }, {
    id: "third-birthday-three-wishes",
    name: "Three Wishes on My Birthday",
    description:
      "On their third birthday, the child discovers three magical stars and makes three wishes: colorful balloons, a giant cake, and a joyful celebration with everyone they love.",
    ageRange: "2-4",
    category: "sentimental",
    difficulty: 1,
    tags: ["birthday", "wishes", "family", "love", "bunny", "animals", "3rd birthday"],
    tagline: "Three magical stars, three wishes, and a birthday full of love!",
    excerpt:
      "On their third birthday, the child discovers three glowing stars in a magical garden. With a talking bunny, they wish for balloons, a giant cake, and one wonderful surprise: a party with everyone they love.",
    emoji: "🎂",
    audience: "any",
    artStyle: "photorealistic children's storybook photography with gentle magical wonder",
    coverImage: "/templates/third-birthday-three-wishes/cover.png",
    previews: [
      { src: "/templates/third-birthday-three-wishes/preview-1.png", type: "image", mimeType: "image/png", caption: "Three glowing stars appear in the magical garden." },
      { src: "/templates/third-birthday-three-wishes/preview-2.png", type: "image", mimeType: "image/png", caption: "The child makes a wish with the friendly talking bunny." },
      { src: "/templates/third-birthday-three-wishes/preview-3.png", type: "image", mimeType: "image/png", caption: "Everyone gathers for a joyful birthday celebration." },
    ],
    review: {
      rating: 5,
      count: 0,
      quote: "A tender birthday keepsake about the people and moments that matter most.",
      author: "Mon Petit Hero",
    },
    prompts: {
      theme:
        "a magical third birthday adventure where the child discovers three glowing stars and makes three wishes with a friendly talking bunny",
      moralLesson:
        "The greatest gift is love, not presents. True happiness comes from sharing special moments, being kind, and celebrating with family and friends.",
      educationalFocus:
        "Recognizing the number three, practicing kindness, sharing joy, and understanding that loving relationships matter more than possessions.",
      worldContext:
        "A magical garden filled with colorful flowers, rainbows, floating balloons, sparkling stars, and friendly animals, ending in a surprise birthday party.",
      beats: [
        "On the child's third birthday, the family prepares a joyful celebration in a magical flower garden.",
        "The child meets a friendly talking bunny who reveals three glowing stars hidden among the flowers.",
        "The first star grants the first wish: colorful balloons float into the garden and fill the sky with joy.",
        "The child and bunny count the balloons together and laugh as the animals chase their dancing ribbons.",
        "The second star grants the second wish: a giant birthday cake appears with three bright candles.",
        "A baby elephant, teddy bear, and friendly animals help decorate the cake and prepare a beautiful table.",
        "The child learns that a wish feels even more special when it brings happiness to everyone nearby.",
        "The child and the bunny discover the third star glowing above a rainbow path.",
        "The child makes the final wish: to celebrate with everyone they love, not just to receive more presents.",
        "The magical garden transforms as family and friends arrive with hugs, music, flowers, and gentle laughter.",
        "The child welcomes every guest kindly and shares the balloons, cake, and garden treasures with the animals.",
        "Everyone gathers around the giant cake and sings while the child looks at the three glowing stars.",
        "The child blows out the three candles and realizes that love made the birthday wish come true.",
        "The family and friends celebrate together under the rainbow while the bunny reminds the child that shared moments are precious.",
        "The child falls asleep happy, knowing the greatest birthday gift is being surrounded by people and friends who love them.",
      ],
    },
  },
  ...ADDITIONAL_TEMPLATE_STORIES,

];

/**
 * Upserts every predefined template. Throws if a template is missing beats,
 * because the generation pipeline rejects any template that is not exactly
 * `BEAT_COUNT` long.
 */
export async function seedStoryTemplates(client: PrismaClient): Promise<number> {
  // The goblin template was retired from the catalogue. Keep generated books
  // readable by detaching only the template relation before removing the row.
  await client.story.updateMany({
    where: { templateId: "birthday-adventure-and-the-greedy-goblin" },
    data: { templateId: null },
  });
  await client.storyTemplate.deleteMany({
    where: { id: "birthday-adventure-and-the-greedy-goblin" },
  });

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
      nameFr: template.nameFr ?? null,
      nameAr: template.nameAr ?? null,
      descriptionFr: template.descriptionFr ?? null,
      descriptionAr: template.descriptionAr ?? null,
      taglineFr: template.taglineFr ?? null,
      taglineAr: template.taglineAr ?? null,
      excerptFr: template.excerptFr ?? null,
      excerptAr: template.excerptAr ?? null,
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
