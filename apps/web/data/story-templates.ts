export type StoryCategory = "adventure" | "sentimental" | "educative";
export type StoryAudience = "girl" | "boy" | "any";

export interface StoryReview {
  rating: number;
  count: number;
  quote: string;
  author: string;
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
  // ── Adventure ─────────────────────────────────────────────
  {
    slug: "rocket-to-the-stars",
    title: "Rocket to the Stars",
    audience: "boy",
    category: "adventure",
    categoryLabel: "Adventure",
    emoji: "🚀",
    tagline: "Blast off to the moon and befriend a tiny alien named Fizz.",
    description:
      "One night, our hero spies a glowing light in the garden shed — an out-of-this-world rocket waiting for a brave pilot. Buckle up for a journey past the clouds, around the rings of Saturn, and straight to the moon, where a friendly little alien needs help finding the way back to his star. A classic mission of courage, curiosity, and making friends across the galaxy.",
    excerpt:
      "Three. Two. One. With a puff of purple smoke, the little rocket lifted off the grass — up, up past the birds, past the clouds, and into the velvet sky. Up there, right at the edge of the moon, a tiny green light was blinking… and it was waving at us.",
    coverImage:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop",
    ageRange: "4-8",
    theme:
      "builds a rocket with tools from the shed, blasts off to the moon and befriends a tiny alien named Fizz who needs help finding his way back to his star",
    artStyle: "vibrant storybook illustration",
    review: {
      rating: 5,
      count: 1284,
      quote:
        "My son asked for a second copy because he wanted to keep the first one safe. The moon pictures are still on our bedside shelf.",
      author: "Yara M.",
    },
  },

  {
    slug: "the-ocean-kingdom",
    title: "The Ocean Kingdom",
    audience: "girl",
    category: "adventure",
    categoryLabel: "Adventure",
    emoji: "🐠",
    tagline: "Dive into a sparkling world under the sea and solve a royal riddle.",
    description:
      "A seashell that hums, a diving helmet that fits perfectly, and a school of guiding fish — our hero is swept into the deep blue of the Ocean Kingdom. There, Princess Coral has lost her pearl-that-holds-the-sunset, and only a brave visitor from above can help find it before the tide goes out forever. Splash through jellyfish gardens, ride a friendly whale, and save the glow of the entire reef.",
    excerpt:
      "The helmet was warm in my hands. The moment I slipped it over my head, the world went hush-hush, and the sea quietly opened a path… straight down, where the light turned turquoise and the coral glowed like lanterns.",
    coverImage:
      "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?q=80&w=1200&auto=format&fit=crop",
    ageRange: "4-8",
    theme:
      "puts on a magic diving helmet, explores the deep sea and helps princess coral find her lost pearl-that-holds-the-sunset before the tide goes out",
    artStyle: "colorful underwater storybook illustration",
    review: {
      rating: 5,
      count: 946,
      quote:
        "She pointed at the diving helmet on every page. We read it three times in one sitting and she now introduces it to all her friends.",
      author: "Nadia B.",
    },
  },

  {
    slug: "the-enchanted-forest",
    title: "The Enchanted Forest",
    audience: "any",
    category: "adventure",
    categoryLabel: "Adventure",
    emoji: "🦊",
    tagline: "Step into a glowing forest where every animal can talk.",
    description:
      "Behind the old wooden gate, the trees begin to whisper. The fox wears a tiny scarf, the owl keeps a pocket watch, and the waterfall has been frozen asleep for a hundred years. Only our hero can solve the riddle of the sleeping waterfall and wake the magic back into the woods. A heart-racing quest full of talking animals, secret paths, and one very important giggle.",
    excerpt:
      "The gate creaked open all by itself. ‘Shhh,’ said a small voice. A fox in a tiny scarf stood on a stump, one paw to its lips. ‘You’re late — the waterfall has been asleep for a hundred years, and only a giggle can wake her.’",
    coverImage:
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1200&auto=format&fit=crop",
    ageRange: "4-8",
    theme:
      "steps into a glowing forest where animals can talk and solves the riddle of the sleeping waterfall to bring the magic back to the woods",
    artStyle: "whimsical fairy-tale storybook illustration",
    review: {
      rating: 5,
      count: 2310,
      quote:
        "The giggle at the waterfall gets my daughter every single time. She now tells the story herself, word for word.",
      author: "Salma R.",
    },
  },

  // ── Sentimental ───────────────────────────────────────────
  {
    slug: "the-lost-puppy",
    title: "The Lost Puppy",
    audience: "girl",
    category: "sentimental",
    categoryLabel: "Sentimental",
    emoji: "🐶",
    tagline: "A rainy day, a scared little dog, and a heart full of kindness.",
    description:
      "On the way home from school, a sad whimper hides behind the bushes. A tiny, shivering puppy with big worried eyes has lost his family. Filled with empathy, our hero shares a coat, learns to be gentle and patient, and sets off on a quiet mission: to help the puppy find his home and bring his family back together. A gentle, touching story about kindness, courage, and the warmth of helping someone in need.",
    excerpt:
      "Under the wet bush, something shivered. Two round eyes blinked up at me, and a tail gave one nervous wag. ‘Hey there, little one,’ I whispered, wrapping my coat around him. ‘Don’t worry. We’ll find your home together.’",
    coverImage:
      "https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=1200&auto=format&fit=crop",
    ageRange: "3-7",
    theme:
      "finds a scared lost puppy in the rain, comforts it with patience and gentleness, and helps it find its way back to its family",
    artStyle: "soft warm watercolor storybook illustration",
    moral: "Empathy, kindness, and looking after those who are lost.",
    review: {
      rating: 5,
      count: 1876,
      quote:
        "My daughter was the one comforting her puppy in real life a week later. This book somehow taught her what to do.",
      author: "Mariam K.",
    },
  },

  {
    slug: "the-bravest-hug",
    title: "The Bravest Hug",
    audience: "girl",
    category: "sentimental",
    categoryLabel: "Sentimental",
    emoji: "🤗",
    tagline: "New places feel scary — until you discover the bravest thing of all.",
    description:
      "Tomorrow is the first day at a brand-new school, and a million butterflies are having a party in our hero's tummy. What if nobody plays with me? What if I get lost? Through soft, reassuring moments with the people who love them most, our hero learns that feelings are nothing to be ashamed of — and that the bravest thing a child can do is ask for a hug and share what's in their heart. A tender bedtime story for big feelings.",
    excerpt:
      "‘What if nobody wants to be my friend?’ I asked, my voice very small. My grown-up knelt down and opened their arms wide. ‘Then we’ll practice a brave hug right now — because brave doesn’t mean not scared. Brave means scared, and doing it anyway.’",
    coverImage:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200&auto=format&fit=crop",
    ageRange: "3-7",
    theme:
      "has butterflies before the first day of a new school and learns from the people who love them that the bravest thing is to share their feelings and ask for a hug",
    artStyle: "calm comforting storybook illustration",
    moral: "Courage to share feelings; it is okay to be scared.",
    review: {
      rating: 5,
      count: 3549,
      quote:
        "He was nervous about his first day and would not talk about it. After reading this twice he told us everything. Worth it.",
      author: "Omar S.",
    },
  },

  {
    slug: "grandmas-moonlight-garden",
    title: "Grandma's Moonlight Garden",
    audience: "girl",
    category: "sentimental",
    categoryLabel: "Sentimental",
    emoji: "🌙",
    tagline: "A quiet evening under the stars, where stories bloom forever.",
    description:
      "Some memories are like seeds: you plant them, and long after, they bloom. On a quiet evening, our hero sits with grandma in the garden as the moon rises. Grandma tells stories about how each flower came to be — the rose she planted on the day the family moved in, the tiny seedling that grew into a tree. A heartfelt, multi-generational tale about family love, gratitude, and the gentle truth that the people we love stay with us forever.",
    excerpt:
      "‘Every flower has a story, treasure,’ Grandma said, patting the bench beside her. ‘This rose? We planted it the summer your mother took her first steps. And this little tree… this one was planted for you, the day you were born.’",
    coverImage:
      "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=1200&auto=format&fit=crop",
    ageRange: "4-9",
    theme:
      "spends a quiet evening with grandma in the moonlight garden, hears the story of every flower and learns that family love stays with us forever",
    artStyle: "nostalgic warm storybook illustration",
    moral: "Family love, gratitude, and remembering the ones we love.",
    review: {
      rating: 5,
      count: 1602,
      quote:
        "I cried at the part about the rose planted the day I came home. My mother read it with my daughter on Facetime.",
      author: "Lina A.",
    },
  },

  // ── Educative ─────────────────────────────────────────────
  {
    slug: "the-planet-hop",
    title: "The Planet Hop",
    audience: "boy",
    category: "educative",
    categoryLabel: "Educative",
    emoji: "🪐",
    tagline: "A solar-system scavenger hunt with a very bossy teacher alien.",
    description:
      "Professor Zuzu from planet Quiz has lost her teaching marbles on eight different worlds, and only the best little astronaut can help her collect them. Hop from Mercury to Neptune, meet a smiling ringed giant, dodge a very bouncy rock, and learn the order of the planets while you play. A joyful, fact-filled adventure where every jump teaches something new about our amazing solar system.",
    excerpt:
      "‘Attention, little astronaut!’ Professor Zuzu declared, polishing her goggles. ‘I have misplaced exactly eight marbles, one on each planet of this solar system. First stop — Mercury, the tiny, speedy, sun-snuggling planet!’",
    coverImage:
      "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=1200&auto=format&fit=crop",
    ageRange: "5-9",
    theme:
      "joins professor Zuzu the teacher alien on a solar-system scavenger hunt and learns the order of the planets by visiting every one",
    artStyle: "bright playful educational storybook illustration",
    learning: "Astronomy: the order of the planets and counting.",
    review: {
      rating: 5,
      count: 2043,
      quote:
        "He can now name all eight planets in order because of this book. His teacher asked where he learned it.",
      author: "Karim T.",
    },
  },

  {
    slug: "a-world-of-words",
    title: "A World of Words",
    audience: "any",
    category: "educative",
    categoryLabel: "Educative",
    emoji: "📚",
    tagline: "In a magic library, the letters come alive and teach us to read.",
    description:
      "The old library at the end of the street is more magical than it looks. When our hero opens the big red book, the letters hop off the page — curly little twenty-six friends who love to play hide and seek. To return them home, we must learn to recognize them, sound them out, and build our very first words. A charming, confidence-building story that turns reading into an exciting game and shows that every story begins with one small letter.",
    excerpt:
      "I opened the big red book — and the letters hopped out! A curly little ‘a’ winked at me, a tall ‘t’ tipped its hat, and a giggling ‘m’ hid behind the bookmark. ‘You have to put us back in our words,’ they laughed, ‘and we’ll show you a secret!’",
    coverImage:
      "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=1200&auto=format&fit=crop",
    ageRange: "4-7",
    theme:
      "discovers a magic library where letters come alive, learns to recognize them and sound out first words to help them get back into their books",
    artStyle: "whimsical educational storybook illustration",
    learning: "Early reading: letters, phonics, and building first words.",
    review: {
      rating: 5,
      count: 1420,
      quote:
        "The letters hopping off the page is now her favourite way to learn new sounds. She asks for the book before bedtime.",
      author: "Hana D.",
    },
  },

  {
    slug: "the-tiny-gardeners",
    title: "The Tiny Gardeners",
    audience: "boy",
    category: "educative",
    categoryLabel: "Educative",
    emoji: "🌱",
    tagline: "Plant a seed, wait, and watch a tiny miracle grow.",
    description:
      "With a tiny spade, a packet of seeds, and one very big, very patient grandmother, our hero learns the secret of growing things. Dig the soil, drop the seed, water, sunshine, and — the hardest lesson of all — waiting. Day by day, a little green sprout appears, then another, then a garden full of wonder. A hands-on story about botany, patience, and the joy of watching the things we care for grow.",
    excerpt:
      "‘The hardest part of gardening,’ Grandma said, tapping her trowel, ‘is the waiting. Seeds are patient little things — they only grow when they’re ready. Give them soil, water, and sunlight… and a little of your love.’",
    coverImage:
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1200&auto=format&fit=crop",
    ageRange: "4-8",
    theme:
      "plants seeds in the family garden with grandma, learns what plants need to grow - soil, water, sunlight and patience - and watches a tiny garden come to life",
    artStyle: "fresh green educational storybook illustration",
    learning: "Botany: plant life cycles, what plants need to grow, responsibility.",
    review: {
      rating: 5,
      count: 1188,
      quote:
        "We planted the seeds the week we received it and she checks on them every morning. Real patience, real pride.",
      author: "Amel F.",
    },
  },
];

export function getStoryTemplate(slug: string): StoryTemplate | undefined {
  return STORY_TEMPLATES.find((story) => story.slug === slug);
}