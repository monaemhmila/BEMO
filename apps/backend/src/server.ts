import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { validateStartup } from "./lib/startup";

export async function startServer() {
  // Validate database before starting server
  const isValid = await validateStartup();
  
  if (!isValid) {
    logger.warn("⚠️  Server starting with validation warnings. Check logs above.");
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`✅ Server running on port ${env.PORT}`);
    logger.info(`📍 Health check: http://localhost:${env.PORT}/healthz`);
  });

  server.on("error", (error) => {
    logger.error({ error }, "Failed to start server");
    process.exit(1);
  });
}

