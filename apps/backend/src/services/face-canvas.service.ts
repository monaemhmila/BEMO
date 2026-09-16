import * as faceapi from "@vladmandic/face-api/dist/face-api.node-wasm.js";
import { Canvas, Image, ImageData, loadImage } from "canvas";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { logger } from "../lib/logger";
import { getPageComposition } from "../contracts/storybook";

// Monkeypatch face-api env for Node canvas environment
faceapi.env.monkeyPatch({ Canvas: Canvas as any, Image: Image as any, ImageData: ImageData as any });

/**
 * The weights are static local files (no API, no key). The backend runs with
 * cwd = apps/backend (turbo / `npm run start`), but also resolve a
 * file-relative path so the service works when started from the repo root.
 */
function resolveModelsPath(): string {
  const candidates = [
    path.join(process.cwd(), "models"),
    path.resolve(__dirname, "../../models"), // src/services -> apps/backend/models
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? candidates[0];
}

let modelsLoaded = false;
let ensureModelsPromise: Promise<void> | null = null;
async function ensureModels(): Promise<void> {
  if (modelsLoaded) return;
  // Memoize the load so parallel generateFaceReferences calls never race.
  if (!ensureModelsPromise) {
    const modelsPath = resolveModelsPath();
    if (!fs.existsSync(modelsPath)) {
      fs.mkdirSync(modelsPath, { recursive: true });
    }
    ensureModelsPromise = (async () => {
      // Weight decoding requires an initialized tfjs backend; the wasm build
      // registers the backend but it must be activated explicitly. The shipped
      // type stubs only cover a subset of the bundled tfjs API at runtime.
      const tf = faceapi.tf as any;
      await tf.ready();
      await faceapi.nets.tinyFaceDetector.loadFromDisk(modelsPath);
      modelsLoaded = true;
    })().catch((err) => {
      ensureModelsPromise = null; // allow a retry on the next call
      throw err;
    });
  }
  return ensureModelsPromise;
}

/**
 * Public detection report used by the admin face lab.
 */
export interface FaceDetectionResult {
  found: boolean;
  box?: { x: number; y: number; width: number; height: number };
  score?: number;
  imageSize?: { width: number; height: number };
}

interface DetectedFace {
  x: number;
  y: number;
  width: number;
  height: number;
  imgW: number;
  imgH: number;
  score: number;
}

async function detectFaceWithScore(imageBuffer: Buffer): Promise<DetectedFace | null> {
  try {
    await ensureModels();
    const img = await loadImage(imageBuffer);
    const detection = await faceapi.detectSingleFace(
      img as any,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.3 })
    );

    if (!detection) {
      logger.warn("No face detected in uploaded image, using full image framing");
      return null;
    }

    const { x, y, width, height } = detection.box;
    return { x, y, width, height, imgW: img.width, imgH: img.height, score: detection.score };
  } catch (err) {
    logger.warn({ error: err }, "Face detection warning, falling back to full image");
    return null;
  }
}

async function cropFaceWithMargin(
  imageBuffer: Buffer,
  box: { x: number; y: number; width: number; height: number; imgW: number; imgH: number } | null
): Promise<Buffer> {
  if (!box) {
    return imageBuffer;
  }

  const padX = box.width * 0.6;
  const padTop = box.height * 0.5;
  const padBottom = box.height * 1.1; // Room for neck & shoulders

  const left = Math.max(0, Math.round(box.x - padX));
  const top = Math.max(0, Math.round(box.y - padTop));
  const width = Math.min(box.imgW - left, Math.round(box.width + padX * 2));
  const height = Math.min(box.imgH - top, Math.round(box.height + padTop + padBottom));

  return sharp(imageBuffer)
    .extract({ left, top, width, height })
    .toBuffer();
}

async function placeOnWhiteCanvas(
  faceBuffer: Buffer,
  canvasWidth = 1920,
  canvasHeight = 1080,
  horizontalPercent = 0.5
): Promise<Buffer> {
  const targetHeight = Math.round(canvasHeight * 0.65);
  const resizedFace = await sharp(faceBuffer)
    .resize({ height: targetHeight, fit: "inside" })
    .toBuffer();

  const meta = await sharp(resizedFace).metadata();
  const fw = meta.width || 300;
  const fh = meta.height || 450;

  const top = Math.round((canvasHeight - fh) / 2);
  const centerX = canvasWidth * horizontalPercent;
  const left = Math.max(0, Math.min(canvasWidth - fw, Math.round(centerX - fw / 2)));

  return sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([{ input: resizedFace, left, top }])
    .jpeg({ quality: 95 })
    .toBuffer();
}

export type PositionOnCanvas = "left" | "right" | "center";

export interface FaceReferences {
  center: string;
  right: string;
  left: string;
}

export class FaceCanvasService {
  private static instance: FaceCanvasService;

  static getInstance(): FaceCanvasService {
    if (!FaceCanvasService.instance) {
      FaceCanvasService.instance = new FaceCanvasService();
    }
    return FaceCanvasService.instance;
  }

  /**
   * Helper to fetch or convert image source into a Buffer
   */
  async getImageBuffer(input: Buffer | string): Promise<Buffer> {
    if (Buffer.isBuffer(input)) {
      return input;
    }
    if (input.startsWith("data:")) {
      const base64Data = input.split(",")[1];
      if (!base64Data) throw new Error("Invalid base64 image data");
      return Buffer.from(base64Data, "base64");
    }

    const response = await fetch(input);
    if (!response.ok) {
      throw new Error(`Failed to download image from ${input} (${response.status})`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  /**
   * Detect face, crop with margin, and generate center (50%), right (75%), and
   * left (25%) canvas references — in a single detection pass.
   */
  async generateFaceLab(input: Buffer | string): Promise<{
    detection: FaceDetectionResult;
    references: FaceReferences;
  }> {
    const buffer = await this.getImageBuffer(input);
    const detected = await detectFaceWithScore(buffer);
    const faceCrop = await cropFaceWithMargin(buffer, detected);

    const canvasWidth = 1920;
    const canvasHeight = 1080;

    const [centerBuf, rightBuf, leftBuf] = await Promise.all([
      placeOnWhiteCanvas(faceCrop, canvasWidth, canvasHeight, 0.50), // center / cover
      placeOnWhiteCanvas(faceCrop, canvasWidth, canvasHeight, 0.75), // 75% right
      placeOnWhiteCanvas(faceCrop, canvasWidth, canvasHeight, 0.25), // 25% left
    ]);

    return {
      detection: detected
        ? {
            found: true,
            box: {
              x: detected.x,
              y: detected.y,
              width: detected.width,
              height: detected.height,
            },
            score: detected.score,
            imageSize: { width: detected.imgW, height: detected.imgH },
          }
        : { found: false },
      references: {
        center: `data:image/jpeg;base64,${centerBuf.toString("base64")}`,
        right: `data:image/jpeg;base64,${rightBuf.toString("base64")}`,
        left: `data:image/jpeg;base64,${leftBuf.toString("base64")}`,
      },
    };
  }

  /**
   * Detect face, crop with margin, and generate center (50%), right (75%), and left (25%) canvas references.
   */
  async generateFaceReferences(input: Buffer | string): Promise<FaceReferences> {
    return (await this.generateFaceLab(input)).references;
  }

  /**
   * Create a single positioned reference URL for a given target position.
   */
  async createPositionedCanvasImage(
    input: Buffer | string,
    options: { position?: PositionOnCanvas } = {}
  ): Promise<string> {
    const refs = await this.generateFaceReferences(input);
    const pos = options.position || "center";
    if (pos === "left") return refs.left;
    if (pos === "right") return refs.right;
    return refs.center;
  }
}

export const faceCanvasService = FaceCanvasService.getInstance();
export const generateFaceReferences = (input: Buffer | string) =>
  faceCanvasService.generateFaceReferences(input);

/**
 * Which positioned reference a page should use.
 *
 * Driven by the shared composition contract (`getPageComposition().characterSide`)
 * instead of an odd/even page rule, so the side of the reference image shown to
 * the image model always agrees with the character placement of the final
 * illustration and the PDF layout.
 */
export function getPositionForPage(pageNumber: number): PositionOnCanvas {
  if (pageNumber === 1) {
    return "center"; // cover
  }
  return getPageComposition(pageNumber).characterSide;
}

export function getReferenceForPage(
  refs: FaceReferences,
  pageNumber: number
): string {
  const position = getPositionForPage(pageNumber);
  if (position === "left") return refs.left;
  if (position === "right") return refs.right;
  return refs.center;
}
