import fs from "fs";
import path from "path";
import crypto from "crypto";

import sharp from "sharp";

import { env } from "../config/env";
import { getAssetsPath } from "./storage";
import { logger } from "./logger";

/**
 * Where uploaded catalogue images are kept under `assets/`. Each folder is
 * mounted as its own static route in app.ts, so a value here is also the public
 * URL segment - keep the two lists in sync.
 */
export const TEMPLATE_IMAGE_FOLDERS = ["previews", "covers"] as const;

export type TemplateImageFolder = (typeof TEMPLATE_IMAGE_FOLDERS)[number];

export function isTemplateImageFolder(value: unknown): value is TemplateImageFolder {
  return (
    typeof value === "string" &&
    (TEMPLATE_IMAGE_FOLDERS as readonly string[]).includes(value)
  );
}

/** Longest edge of a stored image. Cards render at 390px, the gallery at 526px. */
const MAX_EDGE = 1600;
const QUALITY = 82;

/** Refuse anything larger than this before spending memory on a decode. */
export const MAX_TEMPLATE_IMAGE_BYTES = 10 * 1024 * 1024;

/** Enough previews to fill the gallery; the UI stops offering more past this. */
export const MAX_PREVIEWS = 12;

/**
 * Public base for locally served assets. Mirrors the existing
 * `http://localhost:8080/assets/...` convention in storage.ts, but overridable
 * so a deployment behind a different host does not bake localhost into the
 * database.
 */
function publicAssetBase(): string {
  const configured = process.env.PUBLIC_ASSET_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return `http://localhost:${env.PORT}`;
}

/** Strip anything that could escape the assets directory or confuse a browser. */
function safeStem(filename: string): string {
  const stem = path
    .basename(filename || "image")
    .replace(/\.[a-z0-9]+$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return stem || "image";
}

export interface SavedTemplateImage {
  url: string;
  width: number;
  height: number;
  bytes: number;
}

/**
 * Optimise and store one uploaded catalogue image (a cover or a gallery
 * preview).
 *
 * Images are re-encoded rather than written as-is so an admin cannot upload a
 * 12MB phone photo straight into the storefront, and are renamed to a random
 * token so a crafted filename can never pick its own path.
 */
export async function saveTemplateImage(
  buffer: Buffer,
  filename: string,
  folder: TemplateImageFolder
): Promise<SavedTemplateImage> {
  if (!buffer?.length) {
    throw new Error("The uploaded file was empty");
  }
  if (buffer.length > MAX_TEMPLATE_IMAGE_BYTES) {
    throw new Error(
      `Image is ${(buffer.length / 1024 / 1024).toFixed(1)}MB - the limit is ${
        MAX_TEMPLATE_IMAGE_BYTES / 1024 / 1024
      }MB`
    );
  }

  // Throws for anything that is not a real image, which also rejects a
  // disguised file (an .html or .svg renamed to .jpg).
  const image = sharp(buffer, { failOn: "error" });
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("That file is not a readable image");
  }

  const optimised = await image
    .rotate() // honour EXIF orientation before resizing
    .resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: QUALITY, progressive: true, mozjpeg: true })
    .toBuffer();

  const name = `${safeStem(filename)}_${crypto.randomBytes(8).toString("hex")}.jpg`;
  fs.writeFileSync(path.join(getAssetsPath(folder), name), optimised);

  const written = await sharp(optimised).metadata();

  logger.info(
    { folder, name, bytes: optimised.length, from: `${metadata.width}x${metadata.height}` },
    "Saved catalogue image"
  );

  return {
    url: `${publicAssetBase()}/assets/${folder}/${name}`,
    width: written.width ?? metadata.width,
    height: written.height ?? metadata.height,
    bytes: optimised.length,
  };
}

/**
 * Remove a previously uploaded image. Safe to call with an external URL: only
 * paths that resolve inside a known catalogue folder are deleted, so this can
 * never unlink a generated PDF or a file outside assets/.
 */
export function deleteTemplateImage(url: string): void {
  try {
    const marker = "/assets/";
    const index = url.indexOf(marker);
    if (index === -1) return; // not served from assets (e.g. a hotlinked CDN image)

    const rest = url.slice(index + marker.length);
    const slash = rest.indexOf("/");
    if (slash === -1) return;

    const folder = rest.slice(0, slash);
    if (!isTemplateImageFolder(folder)) return; // e.g. /assets/pdfs/... is not ours

    const name = path.basename(rest.slice(slash + 1));
    if (!name) return;

    const target = path.join(getAssetsPath(folder), name);
    if (fs.existsSync(target)) fs.unlinkSync(target);
  } catch (error) {
    logger.warn({ error }, "Could not delete catalogue image");
  }
}
