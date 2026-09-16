import sharp from "sharp";
import { logger } from "../lib/logger";

export interface PreprocessImageOptions {
  /** Target output width in pixels (default: 1920) */
  targetWidth?: number;
  /** Target output height in pixels (default: 1080) */
  targetHeight?: number;
  /** Minimum short-side resolution allowed in pixels (default: 512) */
  minShortSide?: number;
  /** Maximum allowed aspect ratio (default: 3.0 for 3:1) */
  maxAspectRatio?: number;
  /** Minimum allowed aspect ratio (default: 0.3333 for 1:3) */
  minAspectRatio?: number;
}

export interface PreprocessResult {
  /** Processed 1920x1080 JPEG image buffer */
  buffer: Buffer;
  /** Output width (1920) */
  width: number;
  /** Output height (1080) */
  height: number;
  /** True if a face was detected and used for crop alignment */
  faceDetected: boolean;
  /** Bounding box of detected face if face was found */
  faceBoundingBox?: { x: number; y: number; width: number; height: number };
}

/**
 * WHY 'cover' IS USED INSTEAD OF 'contain' OR 'fill':
 * 1. fit: 'fill' stretches and distorts image aspect ratios, warping face proportions and altering facial features.
 *    This destroys identity consistency when sending the image to Grok Imagine edit API.
 * 2. fit: 'contain' adds artificial letterbox/pillarbox borders, introducing dark framing artifacts
 *    that confuse image edit models and reduce effective face resolution.
 * 3. fit: 'cover' maintains exact 1:1 pixel aspect ratio with zero warping or distortion, cropping
 *    to cleanly fill the 16:9 frame while centering the crop on the subject's face.
 */

let faceapiInstance: any = null;
let isFaceApiInitialized = false;
let faceApiLoadError: Error | null = null;

async function getFaceApi(): Promise<any> {
  if (faceapiInstance) return faceapiInstance;
  if (faceApiLoadError) return null;

  try {
    try {
      faceapiInstance = await import("@vladmandic/face-api/dist/face-api.node-wasm.js");
    } catch {
      try {
        faceapiInstance = await import("@vladmandic/face-api/dist/face-api.js");
      } catch {
        faceapiInstance = await import("@vladmandic/face-api");
      }
    }
    return faceapiInstance;
  } catch (error) {
    faceApiLoadError = error instanceof Error ? error : new Error(String(error));
    logger.warn({ error: faceApiLoadError.message }, "Unable to load face-api package; falling back to Sharp smart crop.");
    return null;
  }
}

async function initFaceApi(): Promise<boolean> {
  if (isFaceApiInitialized) return true;

  const faceapi = await getFaceApi();
  if (!faceapi) return false;

  try {
    // Load lightweight TinyFaceDetector weights from CDN
    await faceapi.nets.tinyFaceDetector.loadFromUri(
      "https://vladmandic.github.io/face-api/model"
    );
    isFaceApiInitialized = true;
    return true;
  } catch (error) {
    logger.warn({ error: String(error) }, "face-api model initialization failed; falling back to Sharp smart crop.");
    return false;
  }
}

/**
 * Preprocesses a client-uploaded image before sending to Grok Imagine edit API.
 *
 * - Resizes image to exactly 1920x1080 (16:9)
 * - Uses fit: 'cover' (crop to fill, never stretch/warp)
 * - Centers crop on detected face if possible via lightweight face detection
 * - Rejects images with extreme aspect ratios (> 3:1 or < 1:3) or short-side resolution < 512px
 * - Returns JPEG buffer ready for Grok Imagine edit API
 * - Wrapped in try/catch with clear error reporting
 *
 * @param input - Client-uploaded image buffer or file path
 * @param options - Custom preprocessing parameters
 * @returns PreprocessResult containing 1920x1080 JPEG buffer and metadata
 */
export async function preprocessImageForGrokEdit(
  input: Buffer | string,
  options: PreprocessImageOptions = {}
): Promise<PreprocessResult> {
  const targetWidth = options.targetWidth ?? 1920;
  const targetHeight = options.targetHeight ?? 1080;
  const minShortSide = options.minShortSide ?? 512;
  const maxAspectRatio = options.maxAspectRatio ?? 3.0; // wider than 3:1
  const minAspectRatio = options.minAspectRatio ?? (1 / 3); // taller than 1:3

  try {
    if (!input) {
      throw new Error("Invalid input: Image buffer or file path is required.");
    }

    // Inspect image metadata
    const metadata = await sharp(input).metadata();
    const width = metadata.width;
    const height = metadata.height;

    if (!width || !height) {
      throw new Error("Unable to read image dimensions. The file may be invalid or corrupt.");
    }

    // 1. Validation: Reject resolution below 512px on short side
    const shortSide = Math.min(width, height);
    if (shortSide < minShortSide) {
      throw new Error(
        `Image resolution too low: Short side (${shortSide}px) is below the required minimum of ${minShortSide}px. (Dimensions: ${width}x${height})`
      );
    }

    // 2. Validation: Reject extreme aspect ratios (wider than 3:1 or taller than 1:3)
    const aspectRatio = width / height;
    if (aspectRatio > maxAspectRatio || aspectRatio < minAspectRatio) {
      throw new Error(
        `Extreme aspect ratio rejected: Image aspect ratio (${aspectRatio.toFixed(2)}) is outside allowed bounds [1:3 (0.33) - 3:1 (3.00)]. (Dimensions: ${width}x${height})`
      );
    }

    // 3. Face detection to center crop box on detected face focal point
    let cropBox: { left: number; top: number; width: number; height: number } | null = null;
    let faceDetected = false;
    let faceBoundingBox: { x: number; y: number; width: number; height: number } | undefined;

    try {
      const faceapi = await getFaceApi();
      const faceApiReady = faceapi && (await initFaceApi());

      if (faceApiReady && faceapi) {
        // Decode image to raw RGB tensor using Sharp
        const { data, info } = await sharp(input)
          .removeAlpha()
          .toBuffer({ resolveWithObject: true });

        const tensor = faceapi.tf.tensor3d(
          new Uint8Array(data),
          [info.height, info.width, 3],
          "int32"
        );

        const detection = await faceapi.detectSingleFace(
          tensor,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 })
        );

        if (tensor && typeof tensor.dispose === "function") {
          tensor.dispose();
        }

        if (detection) {
          faceDetected = true;
          const { x, y, width: fW, height: fH } = detection.box;
          faceBoundingBox = { x: Math.round(x), y: Math.round(y), width: Math.round(fW), height: Math.round(fH) };

          const faceCenterX = x + fW / 2;
          const faceCenterY = y + fH / 2;
          const targetRatio = targetWidth / targetHeight; // 16:9 = 1.7777...

          let cropW: number;
          let cropH: number;

          if (aspectRatio > targetRatio) {
            // Source is wider than 16:9
            cropH = height;
            cropW = Math.round(height * targetRatio);
          } else {
            // Source is taller than 16:9
            cropW = width;
            cropH = Math.round(width / targetRatio);
          }

          // Center crop rectangle around detected face focal point, clamping to image boundaries
          const left = Math.max(0, Math.min(width - cropW, Math.round(faceCenterX - cropW / 2)));
          const top = Math.max(0, Math.min(height - cropH, Math.round(faceCenterY - cropH / 2)));

          cropBox = { left, top, width: cropW, height: cropH };
        }
      }
    } catch (faceErr) {
      logger.warn({ error: faceErr }, "Face detection attempt failed; falling back to Sharp smart crop.");
    }

    // 4. Output resized image to 1920x1080 JPEG using fit: 'cover'
    let pipeline = sharp(input);

    if (cropBox) {
      // Extract face-centered region and resize to 1920x1080
      pipeline = pipeline
        .extract(cropBox)
        .resize(targetWidth, targetHeight, { fit: "cover" });
    } else {
      // Fallback: Smart cover crop biased towards high-entropy / face attention regions
      pipeline = pipeline.resize(targetWidth, targetHeight, {
        fit: "cover",
        position: sharp.strategy.attention,
      });
    }

    const outputBuffer = await pipeline
      .jpeg({ quality: 92, progressive: true })
      .toBuffer();

    return {
      buffer: outputBuffer,
      width: targetWidth,
      height: targetHeight,
      faceDetected,
      faceBoundingBox,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error }, `preprocessImageForGrokEdit error: ${errorMessage}`);
    throw new Error(`Image preprocessing failed: ${errorMessage}`);
  }
}
