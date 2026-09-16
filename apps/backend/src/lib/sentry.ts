import * as Sentry from "@sentry/node";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { env } from "../config/env";

let initialized = false;

export function initSentry() {
  if (!env.SENTRY_DSN || initialized) {
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,
  });

  initialized = true;
}

export const sentryRequestHandler = (): RequestHandler => (_req, _res, next) =>
  next();

export const sentryErrorHandler = (): ErrorRequestHandler => (err, _req, _res, next) =>
  next(err);

