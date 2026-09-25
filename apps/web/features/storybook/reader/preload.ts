/**
 * Lightweight image preloading for the story reader.
 *
 * Only the pages closest to the current one are preloaded (previous, next and
 * the next-next) so page turns feel instant without downloading every
 * high-resolution illustration up front.
 */

const preloadCache = new Set<string>();

export function preloadImage(url: string): void {
  if (!url || preloadCache.has(url)) return;
  preloadCache.add(url);

  const img = new Image();
  img.decoding = "async";
  img.referrerPolicy = "no-referrer";
  img.src = url;
}

/** Preload a window of page images around a current index (0-based). */
export function preloadNeighbouringPages(
  pages: ReadonlyArray<{ imageUrl?: string | null }>,
  currentIndex: number
): void {
  const offsets = [-1, 1, 2];
  for (const offset of offsets) {
    const page = pages[currentIndex + offset];
    if (page?.imageUrl) {
      preloadImage(page.imageUrl);
    }
  }
}

export function resetPreloadCache(): void {
  preloadCache.clear();
}