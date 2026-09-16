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
    const modelCount = await prismaClient.model.count();
    
    logger.info({ userCount, modelCount }, "📊 Database stats");

    if (modelCount === 0) {
      logger.warn("⚠️  No models found in database. Users won't be able to generate images until models are added.");
    }

    // Check for public models
    const publicModels = await prismaClient.model.count({
      where: { open: true, trainingStatus: "Generated" },
    });

    if (publicModels === 0) {
      logger.warn("⚠️  No public models available. Consider running: cd packages/db && npm run db:seed");
    } else {
      logger.info({ publicModels }, "✅ Public models available");
    }

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

