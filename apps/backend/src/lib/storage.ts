import fs from "fs";
import path from "path";
import { safeFetchAndValidateImage } from "./safe-image-fetcher";
import { logger } from "./logger";

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
    const dir = getAssetsPath(subfolder);
    const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${validated.extension}`;
    const filePath = path.join(dir, filename);

    fs.writeFileSync(filePath, validated.buffer);
    const localUrl = `http://localhost:8080/assets/${subfolder}/${filename}`;
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
