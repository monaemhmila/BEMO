/**
 * Browser mirror of the printed book pipeline: each generated 16:9 image is
 * read by its real dimensions and split into TWO equal square crops taken
 * side-by-side from the source, without stretching or distorting anything.
 *
 * Shared with the backend utility `split16x9IntoTwoSquares` (sharp):
 *   squareSize = floor(sourceWidth / 2)
 *   cropY      = floor((sourceHeight - squareSize) / 2)
 *   Left  = x:0,          y:cropY
 *   Right = x:squareSize, y:cropY
 *
 * The entire original width is preserved; only excess vertical area is
 * removed, centered on the frame. The source image is never modified.
 */

export interface SquareCrop {
  size: number;
  cropY: number;
}

export function computeSquareCrop(width: number, height: number): SquareCrop | null {
  const size = Math.floor(width / 2);
  if (size < 1) return null;
  const cropY = Math.floor((height - size) / 2);
  return { size, cropY };
}

/** Draw one vertical half of the source image into a square canvas. */
export function drawSquareHalfOnCanvas(
  img: HTMLImageElement,
  side: "left" | "right",
  canvas: HTMLCanvasElement
): boolean {
  const crop = computeSquareCrop(img.naturalWidth, img.naturalHeight);
  if (!crop) return false;

  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  const sx = side === "left" ? 0 : crop.size;
  canvas.width = crop.size;
  canvas.height = crop.size;
  ctx.drawImage(img, sx, crop.cropY, crop.size, crop.size, 0, 0, crop.size, crop.size);
  return true;
}