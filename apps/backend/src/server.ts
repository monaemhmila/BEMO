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
  let preferredPort = env.PORT;

  const listenOnPort = (portToTry: number) => {
    const server = app.listen(portToTry, () => {
      logger.info(`✅ Server running on port ${portToTry}`);
      logger.info(`📍 Health check: http://localhost:${portToTry}/healthz`);
    });

    server.on("error", (error: any) => {
      if (error.code === "EADDRINUSE" && portToTry === preferredPort) {
        logger.warn(`Port ${portToTry} is in use (EADDRINUSE). Retrying on port ${portToTry + 1}...`);
        listenOnPort(portToTry + 1);
      } else {
        logger.error({ error }, "Failed to start server");
        process.exit(1);
      }
    });
  };

  listenOnPort(preferredPort);
}

