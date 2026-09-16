import fs from "fs";
import path from "path";

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
    const dir = getAssetsPath(subfolder);
    const ext = remoteUrl.toLowerCase().includes(".png") ? "png" : "jpg";
    const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const filePath = path.join(dir, filename);

    const response = await fetch(remoteUrl);
    if (!response.ok) {
      console.warn(`⚠️ [Storage] Could not download image from ${remoteUrl} (${response.status})`);
      return remoteUrl;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    const localUrl = `http://localhost:8080/assets/${subfolder}/${filename}`;
    console.log(`💾 [Storage] Saved generated image locally: assets/${subfolder}/${filename}`);
    return localUrl;
  } catch (error) {
    console.error("⚠️ [Storage] Error saving image locally:", error);
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
