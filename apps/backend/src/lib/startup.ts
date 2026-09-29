import { prismaClient } from "./prisma";
import { logger } from "./logger";

/**
 * Validate database connection and setup on startup
 */
export async function validateStartup(): Promise<boolean> {
  try {
    logger.info("🔍 Validating database connection...");

    // Test database connection
    await prismaClient.$queryRaw`SELECT 1`;
    logger.info("✅ Database connection successful");

    // Check critical tables exist
    const userCount = await prismaClient.user.count();
    const storyCount = await prismaClient.story.count();
    const templateCount = await prismaClient.storyTemplate.count();
    
    logger.info({ userCount, storyCount, templateCount }, "📊 Database stats");

    return true;
  } catch (error) {
    logger.error({ error }, "❌ Startup validation failed");
    
    if (error instanceof Error) {
      if (error.message.includes("connect")) {
        logger.error("💡 Database connection failed. Check DATABASE_URL in .env");
      } else if (error.message.includes("does not exist")) {
        logger.error("💡 Database schema not set up. Run: cd packages/db && npx prisma db push");
      }
    }

    return false;
  }
}

