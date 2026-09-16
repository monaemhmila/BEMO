import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.string().optional(),
  CLERK_JWT_PUBLIC_KEY: z.string().min(1, "CLERK_JWT_PUBLIC_KEY is required"),
  FAL_KEY: z.string().min(1, "FAL_KEY is required"),
  OPENAI_API_KEY: z.string().optional(),  // used by story text generation (AI_API_KEY alias)
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  BUCKET_NAME: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  STORAGE_PUBLIC_URL: z.string().optional(),
  WEBHOOK_BASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  LOG_LEVEL: z.string().default("info"),
  BOOK_PRICE_DOLLARS: z.coerce.number().positive().default(34.99),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment configuration");
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

const env = parsed.data;

if (!env.DATABASE_URL) {
  if (env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is required in production");
  }

  env.DATABASE_URL = "file:./dev.db";
  console.warn(
    "⚠️ DATABASE_URL not set. Falling back to local SQLite database (file:./dev.db)"
  );
}

// Backwards compatibility for legacy ENDPOINT env var
if (!env.S3_ENDPOINT && process.env.ENDPOINT) {
  env.S3_ENDPOINT = process.env.ENDPOINT;
}

if (!env.STORAGE_PUBLIC_URL && process.env.CLOUDFLARE_URL) {
  env.STORAGE_PUBLIC_URL = process.env.CLOUDFLARE_URL;
}

// Support AI_API_KEY as alias for OPENAI_API_KEY
if (!env.OPENAI_API_KEY && process.env.AI_API_KEY) {
  env.OPENAI_API_KEY = process.env.AI_API_KEY;
}

export { env };

