/**
 * Create Test User Script
 * This will create a test user in your database for debugging
 * 
 * Usage: npx ts-node scripts/create-test-user.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});

async function main() {
  console.log("🔧 Creating test user...\n");

  try {
    // Test connection
    await prisma.$connect();
    console.log("✅ Connected to database\n");

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        clerkId: `user_test_${Date.now()}`,
        email: `test${Date.now()}@example.com`,
        name: "Test User",
      },
    });

    console.log("✅ Created user:");
    console.log(`   ID: ${testUser.id}`);
    console.log(`   Clerk ID: ${testUser.clerkId}`);
    console.log(`   Email: ${testUser.email}\n`);

    // Create credits for user
    const credits = await prisma.userCredit.create({
      data: {
        userId: testUser.id,
        amount: 100,
      },
    });

    console.log("✅ Created credits:");
    console.log(`   Amount: ${credits.amount}\n`);

    console.log("🎉 Test user created successfully!");
    console.log("\nNow you can:");
    console.log("1. View in Prisma Studio: cd packages/db && npx prisma studio");
    console.log("2. Use this user by updating the clerkId to match your actual Clerk user\n");
    
  } catch (error) {
    console.error("❌ Error:", error);
    
    if (error instanceof Error) {
      console.error("\nDetails:", error.message);
      
      if (error.message.includes("Unique constraint")) {
        console.error("\n💡 User might already exist. Check Prisma Studio.");
      } else if (error.message.includes("connect")) {
        console.error("\n💡 Cannot connect to database.");
        console.error("   Check DATABASE_URL in your .env file");
      } else if (error.message.includes("does not exist")) {
        console.error("\n💡 Database schema not set up.");
        console.error("   Run: cd packages/db && npx prisma db push");
      }
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

