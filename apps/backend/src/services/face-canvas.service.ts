import * as faceapi from "@vladmandic/face-api/dist/face-api.node-wasm.js";
import { Canvas, Image, ImageData, loadImage } from "canvas";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { logger } from "../lib/logger";

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
  // Memoize the load so parallel face-detection calls never race.
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

/**
 * Crop as tightly as possible around the detected face - no white canvas, no
 * extra environment. The resulting face crop is fed directly to the image-edit
 * model, which fully replaces the background via the storybook style
 * guarantees. A small symmetric margin keeps hair / forehead intact.
 */
async function cropFaceTight(
  imageBuffer: Buffer,
  box: { x: number; y: number; width: number; height: number; imgW: number; imgH: number } | null
): Promise<Buffer> {
  if (!box) {
    return imageBuffer;
  }

  const padX = box.width * 0.12;
  const padY = box.height * 0.18;

  const left = Math.max(0, Math.round(box.x - padX));
  const top = Math.max(0, Math.round(box.y - padY));
  const width = Math.min(box.imgW - left, Math.round(box.width + padX * 2));
  const height = Math.min(box.imgH - top, Math.round(box.height + padY * 2));

  return sharp(imageBuffer)
    .extract({ left, top, width, height })
    .jpeg({ quality: 95 })
    .toBuffer();
}

/**
 * The single reference shown to the image-edit model: a tightly cropped face.
 */
export interface FaceReferences {
  face: string;
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
   * Detect the face in a single pass, crop the maximum possible to the face,
   * and return that crop as the edit-model reference (no white canvas).
   */
  async generateFaceLab(input: Buffer | string): Promise<{
    detection: FaceDetectionResult;
    references: FaceReferences;
  }> {
    const buffer = await this.getImageBuffer(input);
    const detected = await detectFaceWithScore(buffer);
    const faceCrop = await cropFaceTight(buffer, detected);

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
        face: `data:image/jpeg;base64,${faceCrop.toString("base64")}`,
      },
    };
  }

  /**
   * Detect, crop the face, and return the reference crop as a data URL.
   */
  async generateFaceReferences(input: Buffer | string): Promise<FaceReferences> {
    return (await this.generateFaceLab(input)).references;
  }
}

export const faceCanvasService = FaceCanvasService.getInstance();
export const generateFaceReferences = (input: Buffer | string) =>
  faceCanvasService.generateFaceReferences(input);