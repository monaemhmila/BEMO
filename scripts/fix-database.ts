/**
 * Database Fix Script
 * Run this to manually create test user and check free trial data
 * 
 * Usage: npx ts-node scripts/fix-database.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});

async function main() {
  console.log("🔧 Starting database fix script...\n");

  try {
    // Test database connection
    console.log("1. Testing database connection...");
    await prisma.$connect();
    console.log("✅ Database connected successfully\n");

    // Check current state
    console.log("2. Checking current database state...");
    const userCount = await prisma.user.count();
    const modelCount = await prisma.model.count();

    console.log(`   Users: ${userCount}`);
    console.log(`   Models: ${modelCount}\n`);

    // Check if there are Clerk users that need to be synced
    console.log("3. Checking for missing data...");

    if (userCount === 0) {
      console.log("⚠️  No users found in database!");
      console.log("   Users are stored in Clerk but not synced to your DB.");
      console.log("   This will be auto-fixed when you sign in.\n");
      
      console.log("   To manually create a test user:");
      console.log('   Run this in Prisma Studio or SQL:');
      console.log(`
   INSERT INTO "User" (id, "clerkId", email, name, "createdAt", "updatedAt")
   VALUES (
     gen_random_uuid(),
     'user_test_12345',
     'test@example.com',
     'Test User',
     now(),
     now()
   );
      `);
    }

    // Try to list users with details
    const users = await prisma.user.findMany({
      select: {
        id: true,
        clerkId: true,
        email: true,
        name: true,
      },
      take: 10,
    });

    if (users.length > 0) {
      console.log("\n4. Found users:");
      users.forEach((user) => {
        console.log(`   - ${user.email} (clerkId: ${user.clerkId})`);
      });
    }

    // Check models
    console.log("\n5. Checking models...");
    const models = await prisma.model.findMany({
      select: {
        id: true,
        name: true,
        trainingStatus: true,
        open: true,
      },
    });

    if (models.length === 0) {
      console.log("⚠️  No models found in database!");
      console.log("   You need to add your 'Hero Lily' model.");
      console.log("   See seed script or manual SQL in TROUBLESHOOTING.md\n");
    } else {
      console.log(`   Found ${models.length} model(s):`);
      models.forEach((model) => {
        console.log(
          `   - ${model.name} (${model.trainingStatus}, public: ${model.open})`
        );
      });
    }

    // Check database schema
    console.log("\n6. Verifying database schema...");
    const tableQuery = await prisma.$queryRaw<any[]>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;

    console.log(`   Found ${tableQuery.length} tables:`);
    console.log(
      `   ${tableQuery.map((t) => t.table_name).join(", ")}\n`
    );

    const requiredTables = ["User", "Model", "Order"];
    const existingTables = tableQuery.map((t) => t.table_name);
    const missingTables = requiredTables.filter(
      (t) => !existingTables.includes(t)
    );

    if (missingTables.length > 0) {
      console.log(`❌ Missing tables: ${missingTables.join(", ")}`);
      console.log("   Run: cd packages/db && npx prisma db push\n");
    } else {
      console.log("✅ All required tables exist\n");
    }

    console.log("7. Summary:");
    console.log("   " + "=".repeat(50));
    
    if (userCount === 0) {
      console.log("   ⚠️  ACTION REQUIRED: No users in database");
      console.log("   👉 Sign in to the app to auto-create your user");
      console.log("   👉 Or run the seed script: cd packages/db && npm run db:seed");
    } else {
      console.log("   ✅ Users exist");
    }

    if (modelCount === 0) {
      console.log("   ⚠️  ACTION REQUIRED: No models in database");
      console.log("   👉 Add your Lily model via Prisma Studio");
      console.log("   👉 Or run: cd packages/db && npm run db:seed");
    } else {
      const publicModels = models.filter((m) => m.open);
      if (publicModels.length === 0) {
        console.log("   ⚠️  No public models found");
        console.log('   👉 Run: UPDATE "Model" SET open = true WHERE name ILIKE \'%lily%\';');
      } else {
        console.log(`   ✅ ${publicModels.length} public model(s) available`);
      }
    }

    console.log("\n✅ Database check complete!\n");
  } catch (error) {
    console.error("\n❌ Error:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("connect")) {
        console.error("\n💡 Database connection failed!");
        console.error("   Check your DATABASE_URL in .env");
        console.error("   Make sure PostgreSQL is running");
      } else if (error.message.includes("does not exist")) {
        console.error("\n💡 Database schema not set up!");
        console.error("   Run: cd packages/db && npx prisma db push");
      }
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

