import sharp from "sharp";

export interface SplitSquareImage {
  left: Buffer;
  right: Buffer;
}

export interface Split16x9Options {
  /**
   * Optional output size in pixels. When provided, each square is resized
   * proportionally (square -> square, so nothing is ever distorted) AFTER the
   * crop has been taken from the source.
   */
  size?: number;
  /** JPEG quality for the output squares (1-100). Defaults to 90. */
  quality?: number;
}

/**
 * Split an already-generated 16:9 image into TWO equal square crops taken
 * side-by-side from the original, without stretching or distorting anything.
 *
 * The source image is read for its real dimensions, then:
 *   squareSize = floor(sourceWidth / 2)
 *   cropY      = floor((sourceHeight - squareSize) / 2)
 *
 * Left  = x:0,              y:cropY, squareSize x squareSize
 * Right = x:squareSize,     y:cropY, squareSize x squareSize
 *
 * The entire original width is preserved; only excess vertical area is
 * removed, centered on the frame. The original source buffer is never
 * modified. Optional proportional resizing happens only AFTER the crop.
 */
export async function split16x9IntoTwoSquares(
  source: Buffer,
  options: Split16x9Options = {}
): Promise<SplitSquareImage> {
  const oriented = sharp(source, { failOn: "error" }).rotate();

  const { width, height } = await oriented.metadata();
  if (!width || !height) {
    throw new Error("Unable to read source image dimensions");
  }

  const squareSize = Math.floor(width / 2);
  if (squareSize < 1) {
    throw new Error(`Source image is too narrow to split into two squares (width=${width})`);
  }

  const cropY = Math.floor((height - squareSize) / 2);

  const [leftCrop, rightCrop] = await Promise.all([
    oriented.clone().extract({ left: 0, top: cropY, width: squareSize, height: squareSize }),
    oriented.clone().extract({ left: squareSize, top: cropY, width: squareSize, height: squareSize }),
  ]);

  const encode = async (square: sharp.Sharp): Promise<Buffer> => {
    let pipeline = square;
    if (options.size && options.size > 0) {
      pipeline = pipeline.resize(options.size, options.size);
    }
    return pipeline.jpeg({ quality: options.quality ?? 90, mozjpeg: true }).toBuffer();
  };

  return {
    left: await encode(leftCrop),
    right: await encode(rightCrop),
  };
}