export const PLACEHOLDER_SRC = "/placeholder.svg";

/**
 * Swaps a failing <img> / next/image to the branded placeholder.
 * Guarded so it only runs once per element.
 */
export function handleImageError(
  event: React.SyntheticEvent<HTMLImageElement>
) {
  const img = event.currentTarget;
  if (img.src.endsWith(PLACEHOLDER_SRC)) return;
  img.onerror = null;
  img.src = PLACEHOLDER_SRC;
}