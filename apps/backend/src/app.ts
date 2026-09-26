import express from "express";
import path from "path";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { prismaClient } from "./lib/prisma";
import { initSentry, sentryRequestHandler, sentryErrorHandler } from "./lib/sentry";
import { apiLimiter } from "./middleware/rateLimiter";
import { notFoundHandler, errorHandler } from "./middleware/error-handler";
import { aiRouter } from "./routes/ai.routes";
import { storyRouter } from "./routes/story.routes";
import { storybookRouter } from "./routes/storybook.routes";
import { webhookRouter } from "./routes/webhook.routes";
import { falAiWebhookRouter } from "./routes/fal-ai-webhook.routes";

import { adminRouter } from "./routes/admin.routes";
import { orderRouter } from "./routes/order.routes";
import { analyticsRouter } from "./routes/analytics.routes";

initSentry();

export function createApp() {
  const app = express();

  // Concise, clean request logger middleware (silences repetitive background polling)
  app.use((req, res, next) => {
        const isPolling =
      req.url === "/balance" ||
      req.url === "/healthz";
    const start = Date.now();

    res.on("finish", () => {
      const duration = Date.now() - start;
      const status = res.statusCode;

      // Skip logging successful routine polling calls to keep terminal output minimal & readable
      if (isPolling && status < 400) return;

      const emoji = status >= 400 ? "❌" : status >= 300 ? "🔀" : "✅";
      console.log(`${emoji} [${req.method}] ${req.originalUrl || req.url} -> ${status} (${duration}ms)`);
    });

    next();
  });
  const corsOptions: cors.CorsOptions = {
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "Cache-Control",
      "Pragma",
    ],
    optionsSuccessStatus: 200,
  };

  app.use(cors(corsOptions));
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      crossOriginOpenerPolicy: false,
    })
  );
  app.use(compression());
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(apiLimiter);

  app.get("/healthz", async (_req, res) => {
    try {
      // Test database connection
      await prismaClient.$queryRaw`SELECT 1`;
      res.json({
        status: "ok",
        env: env.NODE_ENV,
        database: "connected"
      });
    } catch (error) {
      logger.error({ error }, "Health check failed - database not connected");
      res.status(503).json({
        status: "error",
        env: env.NODE_ENV,
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.use("/api/webhook", webhookRouter);
  app.use("/fal-ai/webhook", falAiWebhookRouter);
  app.use(aiRouter);
  app.use("/story", storyRouter);
  app.use("/storybook", storybookRouter);
  app.use("/admin", adminRouter);
    app.use("/orders", orderRouter);

  app.use("/analytics", analyticsRouter);

  // Serve generated PDFs saved to assets/pdfs (e.g. /assets/pdfs/{storyId}.pdf)
  app.use("/assets/pdfs", express.static(path.join(process.cwd(), "assets", "pdfs")));

  app.use(notFoundHandler);
  app.use(sentryErrorHandler());
  app.use(errorHandler);

  return app;
}

