import fs from "fs";
import path from "path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { safeFetchAndValidateImage } from "./safe-image-fetcher";
import { logger } from "./logger";
import { env } from "../config/env";

/**
 * Ensure directory exists inside backend assets folder
 */
export function getAssetsPath(subfolder = "generated"): string {
  const dir = path.join(process.cwd(), "assets", subfolder);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

const objectStorageEnabled = Boolean(env.BUCKET_NAME && env.S3_ACCESS_KEY && env.S3_SECRET_KEY);
const objectStorage = objectStorageEnabled
  ? new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT || undefined,
    forcePathStyle: Boolean(env.S3_ENDPOINT),
    credentials: { accessKeyId: env.S3_ACCESS_KEY!, secretAccessKey: env.S3_SECRET_KEY! },
  })
  : null;

function publicObjectUrl(key: string): string {
  if (!env.STORAGE_PUBLIC_URL) throw new Error("STORAGE_PUBLIC_URL is required for object storage");
  return `${env.STORAGE_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
}

async function putObject(key: string, body: Buffer, contentType: string): Promise<string> {
  if (!objectStorage || !env.BUCKET_NAME) throw new Error("Object storage is not configured");
  await objectStorage.send(new PutObjectCommand({
    Bucket: env.BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  }));
  return publicObjectUrl(key);
}

export async function saveBufferAsset(
  body: Buffer,
  subfolder: string,
  filename: string,
  contentType: string,
): Promise<string> {
  const key = `${subfolder}/${filename}`;
  if (objectStorage) return putObject(key, body, contentType);
  const dir = getAssetsPath(subfolder);
  fs.writeFileSync(path.join(dir, filename), body);
  const baseUrl = env.PUBLIC_ASSET_BASE_URL || `http://localhost:${env.PORT}`;
  return `${baseUrl.replace(/\/$/, "")}/assets/${key}`;
}

/**
 * Download a remote image (e.g., from fal.media) and save it locally in assets/<subfolder>
 * Uses safeFetchAndValidateImage to protect against SSRF, decompression bombs, and malformed files.
 * Returns the local URL: http://localhost:8080/assets/<subfolder>/<filename>
 */
export async function saveRemoteImageLocally(
  remoteUrl: string,
  subfolder = "generated",
  prefix = "img"
): Promise<string> {
  if (!remoteUrl) return remoteUrl;
  // If already saved locally or starts with http://localhost
  if (remoteUrl.includes("/assets/")) return remoteUrl;

  try {
    const validated = await safeFetchAndValidateImage(remoteUrl);
    const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${validated.extension}`;
    const key = `${subfolder}/${filename}`;
    if (objectStorage) {
      const contentType = `image/${validated.extension === "jpg" ? "jpeg" : validated.extension}`;
      return await putObject(key, validated.buffer, contentType);
    }

    const dir = getAssetsPath(subfolder);
    fs.writeFileSync(path.join(dir, filename), validated.buffer);
    const baseUrl = env.PUBLIC_ASSET_BASE_URL || `http://localhost:${env.PORT}`;
    const localUrl = `${baseUrl.replace(/\/$/, "")}/assets/${subfolder}/${filename}`;
    logger.info({ localUrl, bytes: validated.sizeBytes, format: validated.format }, "Saved generated image locally");
    return localUrl;
  } catch (error) {
    logger.warn({ error: (error as Error).message, remoteUrl }, "Failed to securely download and save remote image");
    return remoteUrl;
  }
}

/**
 * Save JSON data locally into assets/stories
 */
export function saveJsonLocally(data: any, filename: string, subfolder = "stories"): string {
  try {
    const dir = getAssetsPath(subfolder);
    const safeName = filename.endsWith(".json") ? filename : `${filename}.json`;
    const filePath = path.join(dir, safeName);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    console.log(`💾 [Storage] Saved story JSON locally: assets/${subfolder}/${safeName}`);
    return filePath;
  } catch (error) {
    console.error("⚠️ [Storage] Error saving JSON locally:", error);
    return "";
  }
}
