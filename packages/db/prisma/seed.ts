import { PrismaClient } from "@prisma/client";
import { seedStoryTemplates } from "./seed-templates";

const prisma = new PrismaClient();

/**
 * Database Seed Script
 * Seeds predefined StoryTemplates for the storefront and story generator.
 */
async function main() {
  console.log("🌱 Starting database seed...\n");

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

