import crypto from "crypto";
import { logger } from "./logger";
import { prismaClient } from "./prisma";

// ─── JWKS cache ───────────────────────────────────────────────────────
const FAL_JWKS_URL = "https://rest.fal.ai/.well-known/jwks.json";
const JWKS_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours

interface JwksKey {
  kty: string;
  crv: string;
  x: string; // base64url-encoded Ed25519 public key
  kid?: string;
}

interface JwksCache {
  keys: JwksKey[];
  fetchedAt: number;
}

let jwksCache: JwksCache | null = null;

async function fetchJwks(): Promise<JwksKey[]> {
  const res = await fetch(FAL_JWKS_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch fal.ai JWKS: HTTP ${res.status}`);
  }
  const data = (await res.json()) as { keys: JwksKey[] };
  return data.keys;
}

/**
 * Return cached JWKS keys. Re-fetches when stale or when `forceRefresh` is set
 * (e.g. after a key-miss during verification).
 */
async function getJwksKeys(forceRefresh = false): Promise<JwksKey[]> {
  const now = Date.now();
  if (
    !forceRefresh &&
    jwksCache &&
    now - jwksCache.fetchedAt < JWKS_MAX_AGE_MS
  ) {
    return jwksCache.keys;
  }

  try {
    const keys = await fetchJwks();
    jwksCache = { keys, fetchedAt: now };
    logger.info(
      { keyCount: keys.length },
      "Refreshed fal.ai JWKS key cache"
    );
    return keys;
  } catch (err) {
    // If we have a stale cache, prefer it over a hard failure
    if (jwksCache) {
      logger.warn(
        { err },
        "Failed to refresh fal.ai JWKS – using stale cache"
      );
      return jwksCache.keys;
    }
    throw err;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────

/** Convert a base64url string to a Buffer */
function base64urlToBuffer(b64url: string): Buffer {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(b64, "base64");
}

/** SHA-256 hex digest of raw bytes */
function sha256Hex(data: Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

// ─── Timestamp validation ─────────────────────────────────────────────
const TIMESTAMP_TOLERANCE_S = 300; // 5 minutes

function isTimestampValid(timestampStr: string): boolean {
  const ts = parseInt(timestampStr, 10);
  if (isNaN(ts)) return false;
  const nowS = Math.floor(Date.now() / 1000);
  return Math.abs(nowS - ts) <= TIMESTAMP_TOLERANCE_S;
}

// ─── Ed25519 signature verification ───────────────────────────────────

/**
 * Build the canonical message that fal.ai signs:
 *   requestId\nuserId\ntimestamp\nsha256(rawBody)
 */
function buildSignedMessage(
  requestId: string,
  userId: string,
  timestamp: string,
  rawBody: Buffer
): string {
  const bodyHash = sha256Hex(rawBody);
  return [requestId, userId, timestamp, bodyHash].join("\n");
}

/**
 * Verify an Ed25519 signature using a set of JWKS keys.
 * Returns `true` if **any** key successfully verifies the signature.
 */
function verifyEd25519(
  message: string,
  signatureHex: string,
  keys: JwksKey[]
): boolean {
  const signatureBytes = Buffer.from(signatureHex, "hex");
  const messageBytes = Buffer.from(message, "utf8");

  for (const key of keys) {
    if (key.kty !== "OKP" || key.crv !== "Ed25519") continue;

    try {
      const publicKeyDer = base64urlToBuffer(key.x);
      const keyObject = crypto.createPublicKey({
        key: Buffer.concat([
          // Ed25519 SubjectPublicKeyInfo DER prefix (RFC 8410)
          Buffer.from("302a300506032b6570032100", "hex"),
          publicKeyDer,
        ]),
        format: "der",
        type: "spki",
      });

      const valid = crypto.verify(null, messageBytes, keyObject, signatureBytes);
      if (valid) return true;
    } catch {
      // Key didn't match – try next
    }
  }
  return false;
}

// ─── Request-ID deduplication ─────────────────────────────────────────

/**
 * Attempt to record a webhook delivery. Returns `false` if the requestId has
 * already been recorded (duplicate/replay).
 */
async function recordDelivery(
  requestId: string,
  operationType: string,
  ownerId?: string
): Promise<boolean> {
  try {
    await prismaClient.webhookDelivery.create({
      data: {
        falRequestId: requestId,
        operationType,
        ownerId: ownerId ?? null,
        receivedAt: new Date(),
      },
    });
    return true;
  } catch (err: any) {
    // Unique-constraint violation ⇒ duplicate
    if (err?.code === "P2002") {
      return false;
    }
    throw err;
  }
}

// ─── Public API ───────────────────────────────────────────────────────

export interface FalWebhookHeaders {
  requestId: string;
  userId: string;
  timestamp: string;
  signature: string;
}

/**
 * Extract the four required fal.ai webhook headers.
 * Returns `null` if any are missing.
 */
export function extractFalHeaders(
  headers: Record<string, string | string[] | undefined>
): FalWebhookHeaders | null {
  const requestId = headers["x-fal-webhook-request-id"] as string | undefined;
  const userId = headers["x-fal-webhook-user-id"] as string | undefined;
  const timestamp = headers["x-fal-webhook-timestamp"] as string | undefined;
  const signature = headers["x-fal-webhook-signature"] as string | undefined;

  if (!requestId || !userId || !timestamp || !signature) return null;

  return { requestId, userId, timestamp, signature };
}

export interface VerificationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Full verification pipeline:
 * 1. Timestamp freshness (5-minute window)
 * 2. Ed25519 signature over canonical message (with JWKS key-miss refresh)
 * 3. Request-ID deduplication via database unique constraint
 */
export async function verifyFalWebhook(
  headers: FalWebhookHeaders,
  rawBody: Buffer,
  operationType: string,
  ownerId?: string
): Promise<VerificationResult> {
  // 1. Timestamp check
  if (!isTimestampValid(headers.timestamp)) {
    logger.warn(
      { timestamp: headers.timestamp },
      "Fal.ai webhook rejected: timestamp outside window"
    );
    return { valid: false, reason: "timestamp_expired" };
  }

  // 2. Signature verification
  const message = buildSignedMessage(
    headers.requestId,
    headers.userId,
    headers.timestamp,
    rawBody
  );

  let keys = await getJwksKeys();
  let sigValid = verifyEd25519(message, headers.signature, keys);

  // Key-miss: try once with a forced refresh
  if (!sigValid) {
    keys = await getJwksKeys(true);
    sigValid = verifyEd25519(message, headers.signature, keys);
  }

  if (!sigValid) {
    logger.warn(
      { requestId: headers.requestId },
      "Fal.ai webhook rejected: invalid signature"
    );
    return { valid: false, reason: "invalid_signature" };
  }

  // 3. Replay / duplicate check
  const isNew = await recordDelivery(headers.requestId, operationType, ownerId);
  if (!isNew) {
    logger.warn(
      { requestId: headers.requestId },
      "Fal.ai webhook rejected: duplicate request ID"
    );
    return { valid: false, reason: "duplicate_request" };
  }

  return { valid: true };
}
