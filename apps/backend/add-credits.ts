// Quick script to add credits for testing
// Run with: npx ts-node add-credits.ts <userId> <amount>

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function addCredits() {
  const userId = process.argv[2];
  const amount = parseInt(process.argv[3] || "100", 10);

  if (!userId) {
    // If no userId provided, list all users with their credits
    const users = await prisma.userCredit.findMany();
    console.log("\n📋 Current user credits:");
    console.table(users.map(u => ({ userId: u.userId, credits: u.amount })));
    
    if (users.length > 0) {
      console.log(`\n💡 To add credits, run: npx ts-node add-credits.ts <userId> <amount>`);
      console.log(`   Example: npx ts-node add-credits.ts ${users[0].userId} 100`);
    }
    return;
  }

  const result = await prisma.userCredit.upsert({
    where: { userId },
    update: { amount: { increment: amount } },
    create: { userId, amount },
  });

  console.log(`✅ Added ${amount} credits to user ${userId}`);
  console.log(`   New balance: ${result.amount} credits`);
}

addCredits()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

