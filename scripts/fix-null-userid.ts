/**
 * Fix NULL userId in Model table
 * This script will:
 * 1. Create a system user if needed
 * 2. Assign any models with NULL userId to the system user
 * 3. Then you can run prisma db push
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});

async function main() {
  console.log("🔧 Fixing NULL userId in Model table...\n");

  try {
    await prisma.$connect();
    console.log("✅ Connected to database\n");

    // Check for models with NULL userId
    const modelsWithNullUser = await prisma.$queryRaw<any[]>`
      SELECT id, name, "tensorPath", "trainingStatus", open 
      FROM "Model" 
      WHERE "userId" IS NULL
    `;

    console.log(`Found ${modelsWithNullUser.length} model(s) with NULL userId\n`);

    if (modelsWithNullUser.length === 0) {
      console.log("✅ No models with NULL userId. You're good to go!");
      console.log("Run: cd packages/db && npx prisma db push\n");
      return;
    }

    // Show what we found
    modelsWithNullUser.forEach((model) => {
      console.log(`   - ${model.name} (${model.trainingStatus}, public: ${model.open})`);
    });
    console.log();

    // Create or find system user
    console.log("Creating/finding system user...");
    const systemUser = await prisma.user.upsert({
      where: { email: "system@portrait-ai.local" },
      update: {},
      create: {
        clerkId: "system_user_public_models",
        email: "system@portrait-ai.local",
        name: "System",
      },
    });

    console.log(`✅ System user ready: ${systemUser.id}\n`);

    // Update all models with NULL userId
    console.log("Assigning models to system user...");
    
    for (const model of modelsWithNullUser) {
      await prisma.$executeRaw`
        UPDATE "Model" 
        SET "userId" = ${systemUser.id}
        WHERE id = ${model.id}
      `;
      console.log(`   ✅ Updated ${model.name}`);
    }

    console.log("\n🎉 All models now have a valid userId!\n");
    console.log("Now run:");
    console.log("   cd packages/db");
    console.log("   npx prisma db push\n");

  } catch (error) {
    console.error("❌ Error:", error);
    
    if (error instanceof Error) {
      console.error("\nDetails:", error.message);
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

