import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
 * Idempotent: safe to run repeatedly (upsert by id).
 * Run with: npx ts-node prisma/seed-templates.ts
 */

const BEAT_COUNT = 14;

interface TemplatePrompts {
  theme: string;
  moralLesson: string;
  educationalFocus: string;
  worldContext: string;
  beats: string[];
}

interface TemplateSeed {
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
// These nine ids are linked from the book detail pages, so they must exist in
// the database or "Personalise my book" has nothing to generate from.

const STOREFRONT_TEMPLATES: TemplateSeed[] = [
  {
    id: "rocket-to-the-stars",
    name: "Rocket to the Stars",
    description:
      "Blast off to the moon with a hand-built rocket and help a tiny alien named Fizz find his way home.",
    ageRange: "4-8",
    category: "adventure",
    difficulty: 2,
    tags: ["space", "friendship", "courage", "science"],
    prompts: {
      theme:
        "builds a rocket with tools from the shed, blasts off to the moon and befriends a tiny alien named Fizz who needs help finding his way back to his star",
      moralLesson: "Courage, curiosity, and friendship across impossible distances.",
      educationalFocus: "Space travel, the Moon, and what a night sky looks like.",
      worldContext:
        "A garden shed on a summer evening, the curve of the Earth below, and a moonlit crater where a small green light blinks.",
      beats: [
        "In the garden shed, our hero finds a dusty rocket hidden under a tarp, and beside it a notebook of impossible instructions.",
        "Working by torchlight, the hero builds the little rocket from wood, tin and paint until it stands ready on the grass.",
        "At sunset the rocket sputters, coughs purple smoke, and lifts off past the birds and the rooftops of the sleeping town.",
        "Out past the clouds the hero spots a tiny green light blinking at the edge of the moon, waving a small purple hand.",
        "The light is Fizz, a little alien who has drifted far from his own star and cannot remember which way is home.",
        "A meteor shower knocks the rocket off course and spills the star map, so the two friends land soft and stranded on the moon.",
        "Fizz's comet-rocket toy still works, and the hero repairs it with a strip of foil, a spring and a brave idea.",
        "They ride the toy comet over the craters and find a whole sky of waiting lights, and Fizz spots one that twinkles differently.",
        "But the fuel runs dry, the moon is spinning them slowly away from home, and the radio on Earth has gone quiet.",
        "A giant shadow crosses the craters: a friendly ringed giant offers help, but only if they can answer his riddle about gravity.",
        "Home is far away, the little rocket is nearly empty, and Fizz begins to cry, certain they will never find his star.",
        "The hero remembers the notebook at home, where a stubborn line reads: 'when the engine fails, float.' The comet's tail catches the light.",
        "The tail of light becomes a glowing path all the way to Fizz's star, and the giant sends them home with a puff of warm starlight.",
        "Back on the grass the sun is rising; Fizz waves from the window of the sky, and a new star map is pinned above the bed.",
      ],
    },
  },
  {
    id: "the-ocean-kingdom",
    name: "The Ocean Kingdom",
    description:
      "Dive into a sparkling kingdom under the sea and solve a royal riddle before the tide goes out.",
    ageRange: "4-8",
    category: "adventure",
    difficulty: 2,
    tags: ["ocean", "royalty", "riddle", "kindness"],
    prompts: {
      theme:
        "puts on a magic diving helmet, explores the deep sea and helps princess coral find her lost pearl-that-holds-the-sunset before the tide goes out",
      moralLesson: "Brave help, patience, and never leaving a friend behind.",
      educationalFocus: "Sea creatures, coral reefs, and the rhythm of the tides.",
      worldContext:
        "A warm brass diving helmet on the shore, turquoise water, glowing coral gardens, and a reef palace lit by a pearl.",
      beats: [
        "At low tide the hero finds a heavy brass diving helmet in the sand, and it hums like a seashell when lifted.",
        "The moment it slips over their head, the sea quiets and opens a shimmering path straight down toward the reef.",
        "A school of silver guiding fish leads the way, then stops before a garden of jellyfish glowing like paper lanterns.",
        "Deep below, Princess Coral explains that the pearl-that-holds-the-sunset has rolled away, and without it the reef will go dark.",
        "The hero searches the wobbly jellyfish garden, but a cheeky octopus keeps tidying up the clues and hiding them again.",
        "A passing wave sweeps the search wide, and the hero's map of the reef washes away into the sand.",
        "An old sea turtle remembers the pearl 'rolled where the singing is loudest' — and the reef sings in the kelp forest.",
        "There it is, glowing in a clam, reached just in time: the sunset returns to the sky over the whole ocean.",
        "But the tide bell rings, the current turns, and the new current pulls the hero's helmet away from the palace.",
        "An enormous, gentle whale surfaces beside them, but it will only carry one small passenger across the current.",
        "The hero gives up their own safe ride and pushes the helmet toward the palace, floating alone as the water darkens.",
        "Fizz-style courage arrives in time: the guiding fish, the octopus, and the turtle all come back together to form a living raft.",
        "The whole reef escorts the hero up through the kelp and jellyfish, and the last of the sunset glows gold around them.",
        "Back on the sand the helmet rests quietly, the reef still shining at sunset, and a small voice says thank you from the waves.",
      ],
    },
  },
  {
    id: "the-enchanted-forest",
    name: "The Enchanted Forest",
    description:
      "Step into a glowing forest where every animal talks and wake the sleeping waterfall.",
    ageRange: "4-8",
    category: "adventure",
    difficulty: 2,
    tags: ["forest", "animals", "riddle", "magic"],
    prompts: {
      theme:
        "steps into a glowing forest where animals can talk and solves the riddle of the sleeping waterfall to bring the magic back to the woods",
      moralLesson: "Gentle humour, listening, and the magic that grows when you are kind.",
      educationalFocus: "Woodland animals, forest sounds, and how water shapes a landscape.",
      worldContext:
        "An old wooden gate, mossy trees strung with fireflies, a scarfed fox, an owl with a pocket watch, and a waterfall frozen mid-fall.",
      beats: [
        "Behind the old wooden gate the trees begin to whisper, and a fox in a tiny scarf steps out of the leaves.",
        "The fox explains that the waterfall has been asleep for a hundred years, and only a giggle can wake her.",
        "A pocket-watch owl insists a riddle must be solved first, and presents the question: what is louder than a shout?",
        "Off the hero goes past whispering ferns, collecting helpful things for the riddle along the way.",
        "A stream keeps hinting at an answer, and a family of hedgehogs giggles themselves into a heap at the mention of it.",
        "The hero answers confidently, but the owl's riddle has two meanings, and the forest laughs kindly at the wrong one.",
        "The hero sits to think, and discovers the answer was the simplest thing of all: a giggle, and being tickled.",
        "A tickling contest sets the whole clearing shrieking, and the giggle grows so big it shakes the sleeping waterfall loose.",
        "The water thunders down again — but too fast, roaring through the woods and flooding the fox's burrow path.",
        "The animals are scattered, the burrow is underwater, and the owl's watch has stopped at the hour of waking.",
        "With the woods in chaos, the hero admits they should have listened first, and wonders if the magic is already spoiled.",
        "Every animal, wet and muddy, works together to dam the flow and dig a new path home — a hundred small helpers at once.",
        "The burrow is dry, the owl's watch ticks again, and the fox realises the real riddle was: what helps most? Kindness.",
        "At the gate the woods hum with light, and the hero hears, very softly, the waterfall giggling as they wave goodbye.",
      ],
    },
  },
  {
    id: "the-lost-puppy",
    name: "The Lost Puppy",
    description:
      "A rainy day, a scared little puppy, and a heart full of quiet kindness.",
    ageRange: "3-7",
    category: "sentimental",
    difficulty: 1,
    tags: ["kindness", "patience", "rain", "family"],
    prompts: {
      theme:
        "finds a scared lost puppy in the rain, comforts it with patience and gentleness, and helps it find its way back to his family",
      moralLesson: "Empathy, kindness, and looking after those who are lost.",
      educationalFocus: "How to calm a frightened animal, and the way dogs find their way home by scent.",
      worldContext:
        "A rainy school walk, dripping hedges, a lamp-lit high street, and a small terrier with a red collar and no name tag.",
      beats: [
        "On the way home from school, a small whimper hides behind the wet bushes, and two round eyes blink up.",
        "A tiny terrier is soaked and shivering; when the hero reaches out a hand, he backs away in fright.",
        "The hero remembers how frightened they felt once, sits down slowly, and simply waits, letting the puppy choose.",
        "Patience works: one careful sniff, then a cold nose against the hero's fingertips, and the puppy creeps closer.",
        "Wrapped in a warm coat, the puppy finally whimpies his story — he slipped his lead chasing a squirrel near the park.",
        "A flash of thunder sends him hiding under a bus shelter, and he will not come out, trembling, for a long time.",
        "The hero sits in the rain with him, humming, until the shaking slows and the puppy pads out to stand beside them.",
        "Together they retrace the walk, and a scrap of blue fur snagged on a gate gives the first real clue to the route.",
        "The scent leads them to the park, but the streets there are confusing, and the puppy begins to circle anxiously.",
        "They reach the busy high street just as the shops close, and a stranger's dog barks and the puppy bolts in fright.",
        "The hero finds the puppy waiting, alone, in a bus shelter with a puddle at his feet, and feels their own eyes sting.",
        "The hero remembers the boy's red collar and calls out for help, and soon a familiar shout echoes down the street.",
        "The family gathers the little dog into a bundle of towels and blankets, and nobody lets go of him for a long time.",
        "At bedtime the puppy falls asleep on the hero's feet, warm and dry, and the rain outside sounds like applause.",
      ],
    },
  },
  {
    id: "the-bravest-hug",
    name: "The Bravest Hug",
    description:
      "New places feel scary — until you learn the bravest thing of all.",
    ageRange: "3-7",
    category: "sentimental",
    difficulty: 1,
    tags: ["feelings", "school", "courage", "family"],
    prompts: {
      theme:
        "has butterflies before the first day at a new school and learns from the people who love them that the bravest thing is to share their feelings and ask for a hug",
      moralLesson: "Courage to share feelings; it is okay to be scared.",
      educationalFocus: "Naming big feelings and simple ways of calming a worried body.",
      worldContext:
        "A hallway full of coat hooks and chatter, a warm family kitchen, and a thousand butterflies in a small tummy.",
      beats: [
        "A million butterflies are having a party in the hero's tummy, and tomorrow is the first day at a new school.",
        "At the kitchen table they ask their grown-up the big question: what if nobody wants to be my friend?",
        "The grown-up kneels down, opens their arms wide, and suggests practising a brave hug before anything else.",
        "They rehearse brave hugs: squeeze, three big breaths, and let go when the grown-up counts to three.",
        "Walking up the school path feels impossible, so the hero holds the grown-up's hand a little tighter than usual.",
        "At the classroom door everything looks enormous, and the hero remembers they are allowed to feel scared.",
        "The teacher offers a quiet corner with soft cushions, and the hero decides to sit there and breathe first.",
        "A classmate with a bright smile offers to share a sticker book, and the hero finds the words to say yes.",
        "Getting lost in the corridor on the way back is the next hard thing, until a friendly hand points the way.",
        "At home the hero is quiet and cross, because bravery does not feel good, and the grown-up listens without fixing it.",
        "The hero confesses that they were frightened all day and the grown-up says that is exactly what brave looks like.",
        "A sudden loud clap of thunder at bedtime brings all the feelings back, so they ask for the bravest hug of all.",
        "In the safe circle of arms the fear shrinks to something small and manageable, and the hero yawns.",
        "Morning comes, the hero walks back to that classroom on their own, and the brave hug is waiting whenever it is needed.",
      ],
    },
  },
  {
    id: "grandmas-moonlight-garden",
    name: "Grandma's Moonlight Garden",
    description:
      "A quiet evening under the stars, where every flower has a story.",
    ageRange: "4-9",
    category: "sentimental",
    difficulty: 1,
    tags: ["family", "memory", "garden", "gratitude"],
    prompts: {
      theme:
        "spends a quiet evening with grandma in the moonlight garden, hears the story of every flower and learns that family love stays with us forever",
      moralLesson: "Family love, gratitude, and remembering the ones we love.",
      educationalFocus: "How plants grow, and why family stories are worth keeping.",
      worldContext:
        "A quiet garden at dusk, a wooden bench, silver moonlight, and a rose, a jasmine and a young apple tree.",
      beats: [
        "Evening settles over the garden, and Grandma pats the bench beside her: 'Come, treasure. The moon is rising.'",
        "In the soft light she points to a red rose and begins: 'This one we planted the summer your mother took her first steps.'",
        "The rose story brings back a funny memory: a toddler covered in soil, waving a worm like a trophy.",
        "By the jasmine hedge, Grandma remembers a quiet rainy week and a tin of biscuits shared under the leaves.",
        "The small apple tree gets the biggest story of all, and the hero guesses correctly before Grandma says it.",
        "The hero reaches up and remembers the day they were born, and the tiny tree that was planted in their honour.",
        "They find a tin box of old photographs in the shed, and one photo is missing from the summer of the move.",
        "Laughing, they hunt the house for the missing picture, retracing the whole day of that long-ago move.",
        "The photograph turns up tucked inside a cookbook, and Grandma's eyes fill with tears she blinks away.",
        "A summer storm bends the jasmine and snaps a branch, and the two of them watch the damage they cannot undo.",
        "Grandma's voice is quiet: the garden will keep growing, but the person we miss is not coming back this year.",
        "Instead of looking away, the hero takes her hand, and together they mend the branch with soft garden twine.",
        "New growth is already showing at the cut, and Grandma says the strongest roots are the ones that had to mend.",
        "Under the same moon years later, the bench holds the hero and their own child, telling the rose story on.",
      ],
    },
  },
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
  {
    id: "the-planet-hop",
    name: "The Planet Hop",
    description:
      "A solar-system scavenger hunt with a very bossy teacher alien.",
    ageRange: "5-9",
    category: "educative",
    difficulty: 2,
    tags: ["space", "planets", "counting", "learning"],
    prompts: {
      theme:
        "joins professor Zuzu the teacher alien on a solar-system scavenger hunt and learns the order of the planets by visiting every one",
      moralLesson: "Curiosity, careful listening, and the joy of learning something new every day.",
      educationalFocus: "Astronomy: the order of the planets and counting.",
      worldContext:
        "A rickety star-skiff, a spaceship classroom with star charts, and eight rocky, cloudy, ringed and icy worlds in a row.",
      beats: [
        "'Attention, little astronaut!' Professor Zuzu polishes her goggles: 'I have misplaced exactly eight marbles, one on each planet.'",
        "The hero counts the planets out loud from the sun, and Zuzu claps: 'Correct. First stop, Mercury!'",
        "Mercury is tiny, speedy and scorchingly close, and the first marble is found spinning in a crater of hot dust.",
        "Venus is next, wrapped in golden cloud, where a heat-proof net and a careful hand earn the second marble.",
        "Earth glows blue below, and the hero waves at the tiny school they left behind before jumping on to Mars.",
        "A very bouncy rock knocks the star-skiff sideways and scatters the remaining marbles across Mars, red and rustling.",
        "Zuzu's lesson is simple and clear: on every world, count carefully and look where the light falls.",
        "Collecting marbles four and five from Mars and Jupiter, the hero is halfway and glowing with pride.",
        "Jupiter's Great Red Spot is a storm the size of a continent, and it spins the skiff right off course.",
        "Farther out, the rings of Saturn are so wide they look like a road, and the eighth marble hangs on a ring like a bead.",
        "Only one marble is left — Neptune, dark and windy — and fuel is low and Zuzu has misplaced her notes.",
        "Following the trail of crumbs Zuzu left behind in earlier lectures, the hero works out the order without the chart.",
        "The final marble is found beyond the wind, all eight are counted home, and Zuzu writes the hero's name in gold.",
        "Back in the classroom the hero teaches the class the order of the planets, and becomes Zuzu's best student.",
      ],
    },
  },
  {
    id: "a-world-of-words",
    name: "A World of Words",
    description:
      "In a magic library, the letters come alive and teach us to read.",
    ageRange: "4-7",
    category: "educative",
    difficulty: 1,
    tags: ["reading", "letters", "phonics", "confidence"],
    prompts: {
      theme:
        "discovers a magic library where letters come alive, learns to recognize them and sound out first words to help them get back into their books",
      moralLesson: "Every word starts as one small letter; mistakes are only letters finding their place.",
      educationalFocus: "Early reading: letters, phonics, and building first words.",
      worldContext:
        "A dusty library at the end of the street, a big red book, and twenty-six little letters with legs, hats and enormous grins.",
      beats: [
        "At the old library the hero opens a big red book, and the letters hop right off the page.",
        "A curly 'a' winks, a tall 't' tips its hat, and a giggling 'm' hides behind the bookmark.",
        "The letters explain: play hide-and-seek with us, and we will show you a secret on the last page.",
        "First comes finding single letters, and the hero hunts a shy 'i' under the desk until it squeaks out.",
        "A shelf-top stack of letters is sorted by sound instead of shape, which makes everything much harder.",
        "The letters scatter in a gust from the window, and the hero is left holding only three.",
        "The trick: sound the letters out loud as they go, and the words start to build themselves one sound at a time.",
        "Three sounds become a word, the word fits into the red book, and a whole page lights up: 'cat', 'hat', 'mat'.",
        "A shelf of word-puzzle boxes wobbles, and the letters inside tumble loose, mixed in one enormous jumble.",
        "The hero tries to sort them all, gets tired and cross, and a tiny 'e' says the secret is to slow down.",
        "Sitting on the floor with the letters, the hero builds one careful word, and then another, and then ten.",
        "The letters reward patience by showing the secret: the first page of the red book is a name, written in gold.",
        "Every missing letter climbs back into place, and the big red book sighs shut with a sound like a thank you.",
        "The hero reads their first whole sentence aloud, and the library hums, proud, as the letters spell out well done.",
      ],
    },
  },
  {
    id: "the-tiny-gardeners",
    name: "The Tiny Gardeners",
    description: "Plant a seed, wait, and watch a tiny miracle grow.",
    ageRange: "4-8",
    category: "educative",
    difficulty: 1,
    tags: ["garden", "patience", "science", "family"],
    prompts: {
      theme:
        "plants seeds in the family garden with grandma, learns what plants need to grow - soil, water, sunlight and patience - and watches a tiny garden come to life",
      moralLesson: "Patience and daily care: things we love grow slowly, and that is fine.",
      educationalFocus: "Botany: plant life cycles, what plants need to grow, responsibility.",
      worldContext:
        "A family back garden with a raised bed, a tin of seeds, a tiny spade, and a very patient grandmother.",
      beats: [
        "Grandma hands over a tin of seeds and a tiny spade: 'The hardest part of gardening is the waiting.'",
        "Together they dig a row of little holes, drop in a seed each, and cover them with soft dark soil.",
        "The hero waters generously, then immediately waters again, and again, until Grandma laughs and shows restraint.",
        "Day one, nothing. The hero checks six times before bed and is disappointed by the quiet soil.",
        "The watering can runs dry and the bed looks dry and dull, so the hero learns that roots need air, not a swamp.",
        "A heavy rain arrives and knocks the young sprouts flat, and the hero is certain the whole garden has been ruined.",
        "Grandma shows the bend-in-the-stem trick, and the hero gently guides each sprout upright with a bent cardboard collar.",
        "Two weeks later the first green leaves uncurl, and the hero runs for Grandma to see the first real garden day.",
        "A hot week dries the bed, and the hero has to choose between the wilting seedlings and an afternoon of football.",
        "It is the hardest choice of the summer, and the hero chooses the garden, watering at noon with a hat on.",
        "The seedlings hold on, but the tomato plant is still small, and the hero wonders whether it will ever be a plant at all.",
        "Grandma gives one tiny piece of advice: keep showing up, even when nothing seems to be happening.",
        "By late summer the bed is a jungle of beans, tomatoes and a runaway pumpkin, and the helper who found them is praised.",
        "A labelled row of new seed pots is prepared for next spring, and the hero writes the date on the first one carefully.",
      ],
    },
  },
];

// ── Legacy predefined templates (former GET /storybook/templates payload) ──

const LEGACY_TEMPLATES: TemplateSeed[] = [
  {
    id: "magical-adventure",
    name: "The Magical Adventure",
    description: "A whimsical journey through enchanted lands.",
    ageRange: "3-5",
    category: "adventure",
    difficulty: 1,
    tags: ["magic", "journey", "wonder", "courage"],
    prompts: {
      theme: "discovers a magical portal and goes on an amazing adventure",
      moralLesson: "Being curious and kind opens doors nobody expected.",
      educationalFocus: "Asking questions, describing a journey, and being brave when you are unsure.",
      worldContext:
        "A meadow behind the house, a shimmering doorway in the hedge, and a gentle parallel land of talking birds and floating lanterns.",
      beats: [
        "In the meadow behind the house the hero finds a shimmering doorway standing in the hedge, humming like a teacup.",
        "A paper bird from the other side invites them in, and one brave step carries them through to a land of floating lanterns.",
        "The lantern-keeper needs a helper: a missing moon-lamp must be found before night, up the Hill of Whispering Wind.",
        "On the way, a shy fox asks for help lifting a fallen tree, and helping it costs valuable time.",
        "The hill is steeper than it looks, and halfway up, the hero has to find a way for the little fox to keep going too.",
        "A gust of wind blows the hero's hat down the slope, and the paper bird is now on the wrong side of the hill.",
        "Instead of chasing the hat, the hero remembers the birds' advice: hold the lamp high, and the wind will follow the light.",
        "The moon-lamp is found in a nest at the very top, and the paper bird circles overhead, cheering the hero on.",
        "Coming down is harder than going up, and the slippery steps turn into a sliding, squeaking slide into a haystack.",
        "The lantern-keeper is waiting, but the lamp is cracked and the night is already falling fast over the meadow.",
        "The hero almost gives up, wondering how a cracked lamp can possibly be enough to light a whole evening.",
        "The paper bird leads them to the river of wishes, and a wish for a light is granted, shared by everyone watching.",
        "The lamp shines again, brighter than before, and every light in the valley answers, one by one.",
        "Back home the doorway is just a doorway again, but the hero carries a lantern that never quite goes out.",
      ],
    },
  },
  {
    id: "brave-explorer",
    name: "The Brave Explorer",
    description: "Discovering new worlds and making friends.",
    ageRange: "6-8",
    category: "adventure",
    difficulty: 2,
    tags: ["exploration", "map", "friendship", "perseverance"],
    prompts: {
      theme: "becomes a brave explorer and discovers hidden treasures",
      moralLesson: "Real treasure is the friends and the courage you gain along the way.",
      educationalFocus: "Reading a map, tracking a trail, and estimating distances.",
      worldContext:
        "A tall house with a round attic window, a hand-drawn map, a compass that points at people, and a jungle of enormous ferns.",
      beats: [
        "In the attic, behind a round window, the hero finds a rolled map signed by an explorer who never came back.",
        "The map shows nine landmarks and one X, and the compass in the drawer spins, then points straight at the hero's heart.",
        "Journey begins through the garden gate and down a long green hill where the first landmark, a leaning cairn, waits.",
        "Beyond the hill, the jungle swallows the path, and a shy cloud bird named Pip agrees to guide from the treetops.",
        "The second landmark, the singing waterfall, is loud enough to shake the boots loose, and a careful plan saves the day.",
        "On the fourth day the map is soggy and unreadable, so the hero has to re-draw it from memory and careful noticing.",
        "The wise old bird suggests noting three things each day: sun, sound, and shape, and the map is rebuilt perfectly.",
        "The halfway landmark, the upside-down tree, marks the end of the easy path and the start of the real jungle.",
        "Night falls early in the deep trees, and a sudden storm washes out the trail the hero has just drawn.",
        "Pip is caught in a net strung by mischievous monkeys, and rescuing the guide costs the last of their dry food.",
        "Alone and tired at the camp, the hero begins to believe the X is just a joke and the explorer never found anything.",
        "Pip taps the map and chirps insistently toward the north, where the last landmark, a sunlit waterfall pool, waits.",
        "At the X there is no gold at all, only a stone bench, a journal, and a turtle named Moss who waits for the next explorer.",
        "The hero adds a line to the map for Moss, carries the journal home, and starts planning the second expedition.",
      ],
    },
  },
  {
    id: "kind-friend",
    name: "The Kind Friend",
    description: "Learning the value of friendship and kindness.",
    ageRange: "3-5",
    category: "friendship",
    difficulty: 1,
    tags: ["friendship", "kindness", "animals", "empathy"],
    prompts: {
      theme: "helps a lost animal find its way home and makes a new friend",
      moralLesson: "Friendship grows when you give without keeping score.",
      educationalFocus: "Looking after animals, and how to comfort something frightened.",
      worldContext:
        "A quiet park with a hedge maze, a bench under an oak, and a small grey fox kit with a ribbon on its collar.",
      beats: [
        "Under the oak bench, a small grey fox kit is curled up tight, with a blue ribbon tied neatly on its collar.",
        "The fox kit is lost and far from home, and it growls when the hero comes close, so they sit down and wait.",
        "Sharing half a sandwich works: two careful steps back, a gentle hand, and the fox kit eats from the ground.",
        "A game of hide-and-seek around the park helps, and the fox kit finally agrees to be led by the ribbon.",
        "They cross the duck pond, the picnic tables, and the swings, while the fox kit stops at every single noise.",
        "A loud lawnmower sends the fox kit bolting under a car, and the hero has to earn back every bit of trust.",
        "Instead of chasing, the hero sits still and lets the fox kit choose, and that is exactly what finally works.",
        "The hedge maze is next, and the fox kit's own pawprints lead in, but the same path leads out again and again.",
        "A robin lands on the hero's hand, pecks the fox kit's ear, and leads them both to a gap in the hedge.",
        "Past the hedge is a quiet street of garden fences, and every garden looks exactly the same from the road.",
        "A smell of warm toast drifts from one gate, and the fox kit stops dead, ears up, trembling with hope.",
        "The blue ribbon matches a little coat hanging on the line, and the fox kit pulls the whole way to the door.",
        "A child called Ana opens the door, and the fox kit is home, safe, and completely beside itself with joy.",
        "The hero walks away with an empty hand and a full heart, and a new friend at the gate waving goodbye.",
      ],
    },
  },
  {
    id: "bedtime-dream",
    name: "The Bedtime Dream",
    description: "A peaceful journey through dreamland.",
    ageRange: "3-5",
    category: "bedtime",
    difficulty: 1,
    tags: ["bedtime", "dreams", "calm", "stars"],
    prompts: {
      theme: "floats up to the clouds and has a magical dream adventure",
      moralLesson: "Rest is its own kind of adventure, and slow breathing brings you home.",
      educationalFocus: "Winding down, breathing calmly, and the comfort of a familiar night routine.",
      worldContext:
        "A warm bed, a curtain lifting in a night breeze, a ladder of cloud steps, and a quiet sky full of soft lanterns.",
      beats: [
        "The hero cannot sleep, so they close their eyes and breathe three slow breaths, just as taught.",
        "A ladder of soft cloud steps appears at the window, and the hero climbs it in bare feet, nightgown fluttering.",
        "Up in the sky, a sleepy moon-lantern keeper has dropped the light from the very first star, and the sky is dimming.",
        "A friendly cloud cat named Puff offers help, but the wind is sleepy too, and it insists on stopping for naps.",
        "Puff's napping is interrupted by a sneeze that blows the hero clean off the ladder, and the sky tumbles around them.",
        "Falling is not scary while Puff's fluffy belly is underneath, and the hero discovers how to steer by wriggling.",
        "Together they steer the falling lantern back onto the first star by aiming for its warm yellow glow.",
        "The star relights, and every other star comes on in sequence, like a string of lights being switched on.",
        "But the last star in the whole sky stays dark, and the keeper has never been that far out before.",
        "Puff is getting sleepy, and the wind is dropping, and the journey suddenly feels much too big for one night.",
        "The hero is nearly out of puff, and wonders whether some lights are simply not meant to be fixed tonight.",
        "A memory floats past: a grown-up's voice singing, and the steady rhythm of it, and the whole sky leans closer to listen.",
        "Following the rhythm, the hero hums the last star awake, and the sky fills up so bright the moon smiles.",
        "Landing back in bed with warm pyjamas and a cool pillow, the hero opens one eye at the window, smiling.",
      ],
    },
  },
  {
    id: "animal-friends",
    name: "Forest Friends",
    description: "Making friends with woodland creatures.",
    ageRange: "6-8",
    category: "animals",
    difficulty: 2,
    tags: ["animals", "forest", "friendship", "teamwork"],
    prompts: {
      theme: "visits a magical forest and befriends talking animals",
      moralLesson: "Different voices make a strong team.",
      educationalFocus: "Woodland animals, their diets and homes, and how a team solves a problem.",
      worldContext:
        "A gateway of two old oaks, a mossy clearing, a burrow village, and a forest where every animal speaks in riddles.",
      beats: [
        "Two old oaks part like a curtain, and the hero steps into a clearing where a squirrel in a waistcoat says 'welcome'.",
        "The squirrel, Nib, explains that the forest's friendship bridge has fallen and nobody can reach the burrow village.",
        "An owl, a badger, a hedgehog and a very small mouse all want to help, and each one offers a different idea.",
        "A wide log should work, but the badger's roll of dry leaves is a better bridge, and pride gets in the way.",
        "The log slides into the mud, and the leaves blow away, leaving the whole group embarrassed and silent.",
        "A storm arrives and fills the hollow, and Nib is carried off the path while calling for the others to wait.",
        "The hero notices the mice can hear the faintest sounds, so the whole team goes quiet and listens together.",
        "Following the mice, they find Nib wedged in a hollow, safe but stuck, and the owl plans a careful rescue.",
        "The rescue needs a rope of ivy, a leaf ladder and someone very small, and teamwork finally does the job.",
        "The bridge is rebuilt in a different style, and a storm tests it while the whole village holds its breath.",
        "It holds, though the hedgehog ends up upside down, and the friendship bridge is suddenly the least of it.",
        "The animals decide the bridge needs a name and a keeper, and the hero is asked to stay for the naming feast.",
        "The bridge is named for the hero, and the celebration runs long into the evening as the moon comes up.",
        "Walking home at dawn, the hero hears the oaks creaking behind, and the forest sounds like a friend calling goodnight.",
      ],
    },
  },
];

const ALL_TEMPLATES = [...STOREFRONT_TEMPLATES, ...LEGACY_TEMPLATES];

async function main() {
  console.log("Seeding story templates...\n");

  for (const template of ALL_TEMPLATES) {
    if (template.prompts.beats.length !== BEAT_COUNT) {
      throw new Error(
        `Template "${template.id}" has ${template.prompts.beats.length} beats, expected ${BEAT_COUNT}`,
      );
    }

    const prompts = template.prompts as unknown as Prisma.InputJsonValue;

    await prisma.storyTemplate.upsert({
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

  console.log(`\nDone. Seeded ${ALL_TEMPLATES.length} predefined templates.`);
}

main()
  .catch((error) => {
    console.error("Error seeding story templates:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
