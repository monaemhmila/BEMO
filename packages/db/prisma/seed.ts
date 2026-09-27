import { PrismaClient } from "@prisma/client";

import { seedStoryTemplates } from "./seed-templates";

const prisma = new PrismaClient();

/**
 * Database Seed Script
 * 
 * This script sets up default data for the application:
 * 1. Creates a system user for public models
 * 2. Sets up the default "Hero Lily" model as public
 * 3. Seeds the predefined StoryTemplates
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
  console.log("Seeding/updating predefined StoryTemplates...");
  const templateCount = await seedStoryTemplates(prisma);
  console.log(`   ✅ Seeded/updated ${templateCount} template(s)\n`);

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

