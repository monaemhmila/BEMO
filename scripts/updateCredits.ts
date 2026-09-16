const { PrismaClient } = require('@prisma/client');

async function updateCredits() {
  const prisma = new PrismaClient();
  
  try {
    const targetClerkUserId = "user_2xokzIuNpd7YfnFmbsfBxlXmdxn"; // Replace with actual Clerk ID
    const creditAmount = 50;

    const result = await prisma.userCredit.upsert({
      where: { userId: targetClerkUserId },
      create: { userId: targetClerkUserId, amount: creditAmount },
      update: { amount: creditAmount },
    });

    console.log(`✅ Granted ${creditAmount} credits to user ${targetClerkUserId}`);
    console.log('Updated record:', result);
  } catch (error) {
    console.error('Error updating credits:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateCredits();