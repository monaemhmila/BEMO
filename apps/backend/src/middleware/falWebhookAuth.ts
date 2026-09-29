import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";
import {
  extractFalHeaders,
  verifyFalWebhook,
  type VerificationResult,
} from "../lib/fal-webhook-verify";

/**
 * Express middleware that authenticates fal.ai webhook requests.
 *
 * Prerequisites:
 *   1. The route MUST be mounted BEFORE the global `express.json()` parser.
 *   2. The route-level `express.raw({ type: "application/json" })` middleware
 *      must run first so `req.body` is a raw Buffer.
 *
 * This middleware:
 *   - Extracts the four fal.ai webhook headers
 *   - Verifies the Ed25519 signature over the canonical message
 *   - Rejects timestamps outside a 5-minute window
 *   - Rejects duplicate request IDs (replay protection)
 *   - Returns generic 401/403 errors without leaking implementation details
 *   - Parses the raw body to JSON and re-assigns it to `req.body`
 *
 * After this middleware succeeds, `req.body` is the parsed JSON object and
 * `(req as any).falWebhookRequestId` contains the authenticated request ID.
 */
export function falWebhookAuth(operationType: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Ensure raw body is available
      const rawBody = Buffer.isBuffer(req.body) ? req.body : null;
      if (!rawBody) {
        logger.warn("Fal webhook auth: body is not a raw Buffer – is express.raw() configured?");
        res.status(400).json({ message: "Invalid request" });
        return;
      }

      // Extract headers
      const headers = extractFalHeaders(req.headers);
      if (!headers) {
        logger.warn("Fal webhook auth: missing required fal.ai headers");
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      // Verify signature, timestamp, and dedup
      const result: VerificationResult = await verifyFalWebhook(
        headers,
        rawBody,
        operationType
      );

      if (!result.valid) {
        const status = result.reason === "duplicate_request" ? 200 : 401;
        if (result.reason === "duplicate_request") {
          // Silently acknowledge duplicates (fal.ai retries are expected)
          res.status(200).json({ message: "Acknowledged" });
        } else {
          res.status(status).json({ message: "Unauthorized" });
        }
        return;
      }

      // Parse the raw body into JSON for downstream handlers
      try {
        req.body = JSON.parse(rawBody.toString("utf-8"));
      } catch {
        res.status(400).json({ message: "Invalid request" });
        return;
      }

      // Attach the authenticated request ID for downstream use
      (req as any).falWebhookRequestId = headers.requestId;

      next();
    } catch (err) {
      logger.error({ err }, "Fal webhook auth: unexpected error during verification");
      res.status(500).json({ message: "Internal error" });
    }
  };
}
