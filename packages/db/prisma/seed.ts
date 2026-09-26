import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Database Seed Script
 * 
 * This script sets up default data for the application:
 * 1. Creates a system user for public models
 * 2. Sets up the default "Hero Lily" model as public
 * 
 * Run with: npx prisma db seed
 */

// Default public model configuration
// Update these values with your actual fal.ai training results
const DEFAULT_PUBLIC_MODEL = {
  name: "Hero Lily",
  triggerWord: "Lily",
  // Replace with your actual LoRA URL from fal.ai
  tensorPath: process.env.DEFAULT_MODEL_TENSOR_PATH || "",
  // Replace with your actual thumbnail URL
  thumbnail: process.env.DEFAULT_MODEL_THUMBNAIL || "",
  type: "Woman" as const,
  age: 7,
  ethinicity: "South_Asian" as const,
  eyeColor: "Brown" as const,
  bald: false,
};

async function main() {
  console.log("🌱 Starting database seed...\n");

  // 1. Create or find system user for public models
  const systemEmail = "system@portrait-ai.local";
  let systemUser = await prisma.user.findUnique({
    where: { email: systemEmail },
  });

  if (!systemUser) {
    console.log("Creating system user for public models...");
    systemUser = await prisma.user.create({
      data: {
        clerkId: "system_user_public_models",
        email: systemEmail,
        name: "System",
      },
    });
    console.log(`✅ System user created: ${systemUser.id}\n`);
  } else {
    console.log(`✅ System user exists: ${systemUser.id}\n`);
  }

  // 2. Check if default model already exists
  const existingModel = await prisma.model.findFirst({
    where: {
      name: DEFAULT_PUBLIC_MODEL.name,
      open: true,
    },
  });

  if (existingModel) {
    console.log(`✅ Default public model already exists: ${existingModel.id}`);
    console.log(`   Name: ${existingModel.name}`);
    console.log(`   Status: ${existingModel.trainingStatus}`);
    console.log(`   Public: ${existingModel.open}`);
    
    // Update to ensure it's public and has latest config
    if (!existingModel.open || existingModel.trainingStatus !== "Generated") {
      await prisma.model.update({
        where: { id: existingModel.id },
        data: {
          open: true,
          trainingStatus: "Generated",
          tensorPath: DEFAULT_PUBLIC_MODEL.tensorPath || existingModel.tensorPath,
          thumbnail: DEFAULT_PUBLIC_MODEL.thumbnail || existingModel.thumbnail,
        },
      });
      console.log("   Updated model to ensure it's public and generated.\n");
    }
  } else if (DEFAULT_PUBLIC_MODEL.tensorPath) {
    // Create the default public model
    console.log("Creating default public model...");
    const model = await prisma.model.create({
      data: {
        name: DEFAULT_PUBLIC_MODEL.name,
        type: DEFAULT_PUBLIC_MODEL.type,
        age: DEFAULT_PUBLIC_MODEL.age,
        ethinicity: DEFAULT_PUBLIC_MODEL.ethinicity,
        eyeColor: DEFAULT_PUBLIC_MODEL.eyeColor,
        bald: DEFAULT_PUBLIC_MODEL.bald,
        userId: systemUser.id,
        triggerWord: DEFAULT_PUBLIC_MODEL.triggerWord,
        tensorPath: DEFAULT_PUBLIC_MODEL.tensorPath,
        thumbnail: DEFAULT_PUBLIC_MODEL.thumbnail,
        trainingStatus: "Generated",
        zipUrl: "system-default",
        open: true,
      },
    });
    console.log(`✅ Default public model created: ${model.id}`);
    console.log(`   Name: ${model.name}`);
    console.log(`   Trigger: ${model.triggerWord}\n`);
  } else {
    console.log("⚠️  Skipping default model creation - no tensorPath configured.");
    console.log("   Set DEFAULT_MODEL_TENSOR_PATH environment variable to create it.\n");
  }

  // 3. Mark any existing "Hero Lily" or "Lily" models as public
  const lilyModels = await prisma.model.findMany({
    where: {
      OR: [
        { name: { contains: "Lily", mode: "insensitive" } },
        { triggerWord: { contains: "Lily", mode: "insensitive" } },
      ],
      trainingStatus: "Generated",
    },
  });

  if (lilyModels.length > 0) {
    console.log(`Found ${lilyModels.length} Lily model(s) to make public:`);
    for (const model of lilyModels) {
      if (!model.open) {
        await prisma.model.update({
          where: { id: model.id },
          data: { open: true },
        });
        console.log(`   ✅ Made public: ${model.name} (${model.id})`);
      } else {
        console.log(`   ✓ Already public: ${model.name} (${model.id})`);
      }
    }
    console.log();
  }

  // 4. Seed/Update StoryTemplates
  console.log("Seeding/updating default StoryTemplates...");
  const DEFAULT_TEMPLATES = [
      {
        id: "magical-adventure",
        name: "The Magical Adventure",
        description: "A whimsical journey teaching courage, problem-solving, and nature conservation.",
        ageRange: "3-5",
        category: "adventure" as const,
        prompts: {
          theme: "discovers a magical portal and goes on an amazing adventure",
          moralLesson: "Courage, honesty, and working together to solve challenges",
          educationalFocus: "Nature conservation, shapes, counting & spatial awareness",
        },
        tags: ["magic", "portal", "adventure", "courage", "nature"],
        isActive: true,
      },
      {
        id: "brave-explorer",
        name: "The Brave Explorer",
        description: "Discovering new worlds while learning perseverance and geography.",
        ageRange: "6-8",
        category: "adventure" as const,
        prompts: {
          theme: "becomes a brave explorer and discovers hidden treasures",
          moralLesson: "Perseverance, empathy, and helping others in need",
          educationalFocus: "Geography, map reading & historical curiosity",
        },
        tags: ["treasure", "explorer", "brave", "geography", "perseverance"],
        isActive: true,
      },
      {
        id: "kind-friend",
        name: "The Kind Friend",
        description: "Learning the value of empathy, animal care, and emotional growth.",
        ageRange: "3-5",
        category: "friendship" as const,
        prompts: {
          theme: "helps a lost animal find its way home and makes a new friend",
          moralLesson: "Empathy, active listening, and gentle kindness to animals",
          educationalFocus: "Animal welfare, emotion recognition & social skills",
        },
        tags: ["animals", "kindness", "friendship", "empathy"],
        isActive: true,
      },
      {
        id: "bedtime-dream",
        name: "The Bedtime Dream",
        description: "A peaceful journey teaching mindfulness, gratitude, and restful sleep.",
        ageRange: "3-5",
        category: "bedtime" as const,
        prompts: {
          theme: "floats up to the clouds and has a magical dream adventure",
          moralLesson: "Gratitude, mindfulness & peaceful emotional self-soothing",
          educationalFocus: "Mindfulness breathing, sleep routines & constellation shapes",
        },
        tags: ["bedtime", "clouds", "dreams", "mindfulness", "gratitude"],
        isActive: true,
      },
      {
        id: "animal-friends",
        name: "Forest Guardians",
        description: "Exploring an ancient forest and learning habitat conservation.",
        ageRange: "6-8",
        category: "animals" as const,
        prompts: {
          theme: "visits a magical forest and befriends talking animals",
          moralLesson: "Environmental responsibility & caring for wildlife",
          educationalFocus: "Ecosystems, forest habitats & biodiversity",
        },
        tags: ["forest", "animals", "creatures", "ecosystem", "environment"],
        isActive: true,
      },
    ];

  for (const tmpl of DEFAULT_TEMPLATES) {
    await prisma.storyTemplate.upsert({
      where: { id: tmpl.id },
      update: tmpl,
      create: tmpl,
    });
    console.log(`   ✅ Seeded/updated template: ${tmpl.name}`);
  }
  console.log();

  console.log("🎉 Database seed completed!\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

