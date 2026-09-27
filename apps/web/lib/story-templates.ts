import { BACKEND_URL } from "../app/config";
import {
  getCategoryMeta,
  toStoryCategory,
  type StoryAudience,
  type StoryMedia,
  type StoryReview,
  type StoryTemplate,
  type StorefrontTemplate,
} from "@/data/story-templates";

/**
 * How long a fetched catalogue stays cached before the storefront asks the
 * backend again. A template added in the database appears on /books within this
 * window without a rebuild.
 */
export const TEMPLATE_REVALIDATE_SECONDS = 60;

function toAudience(raw: string): StoryAudience {
  return raw === "girl" || raw === "boy" ? raw : "any";
}

function toReview(raw: StorefrontTemplate["review"]): StoryReview | undefined {
  if (!raw || !raw.quote || !raw.author) return undefined;
  return raw;
}

/**
 * Keep only URLs the storefront can actually render. A blank value would
 * produce a broken <img>, and a non-http scheme (javascript:, data:) must never
 * reach the page even though the value came from the database.
 */
function toImageUrl(raw: string | null): string {
  if (!raw) return "";
  const value = raw.trim();
  return /^(https?:\/\/|\/)/i.test(value) ? value : "";
}

/**
 * Keep only slides that can actually render. The API already validates the
 * shape, but the storefront must not depend on that: a blank `src` would render
 * a broken <img>, and a non-http scheme would be a script injection.
 */
function toPreviews(raw: StorefrontTemplate["previews"]): StoryMedia[] {
  if (!Array.isArray(raw)) return [];

  const slides: StoryMedia[] = [];
  for (const entry of raw) {
    const src = toImageUrl(entry?.src ?? null);
    if (!src) continue;

    slides.push({
      src,
      type: entry.type === "video" ? "video" : "image",
      mimeType: entry.mimeType || undefined,
      caption: entry.caption || undefined,
    });
  }
  return slides;
}

/**
 * Adapt the API's template into the shape the storefront components render.
 * `slug` is the row id, and `categoryLabel` comes from the design system rather
 * than the database, because labels and colours are a presentation concern.
 */
function toStoryTemplate(row: StorefrontTemplate): StoryTemplate {
  return {
    slug: row.id,
    title: row.title,
    audience: toAudience(row.audience),
    category: toStoryCategory(row.category),
    categoryLabel: getCategoryMeta(row.category).label,
    emoji: row.emoji ?? "",
    tagline: row.tagline ?? "",
    description: row.description,
    excerpt: row.excerpt ?? "",
    coverImage: toImageUrl(row.coverImage),
    previews: toPreviews(row.previews),
    ageRange: row.ageRange,
    theme: row.theme,
    artStyle: row.artStyle ?? "",
    moral: row.moral ?? undefined,
    learning: row.learning ?? undefined,
    review: toReview(row.review),
  };
}

class TemplateFetchError extends Error {
  readonly status: number | undefined;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "TemplateFetchError";
    this.status = status;
  }
}

async function fetchTemplates(): Promise<StorefrontTemplate[]> {
  let response: Response;

  try {
    response = await fetch(`${BACKEND_URL}/storybook/templates`, {
      next: { revalidate: TEMPLATE_REVALIDATE_SECONDS },
    });
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    throw new TemplateFetchError(
      `Could not reach the backend at ${BACKEND_URL} (${reason}) — is it running?`
    );
  }

  if (response.status === 404) {
    throw new TemplateFetchError(
      `${BACKEND_URL}/storybook/templates returned 404 — ` +
        `check NEXT_PUBLIC_BACKEND_URL points at the API, not a web server.`,
      404
    );
  }

  if (!response.ok) {
    throw new TemplateFetchError(
      `Failed to load story templates (${response.status} ${response.statusText})`,
      response.status
    );
  }

  const payload: unknown = await response.json();
  const templates = (payload as { templates?: unknown })?.templates;

  if (!Array.isArray(templates)) {
    throw new TemplateFetchError("Unexpected story templates response");
  }

  return templates as StorefrontTemplate[];
}

/**
 * The catalogue is fetched once per revalidation window per route, so a broken
 * backend would otherwise print the same line dozens of times during a build.
 * Report each distinct failure once.
 */
const reportedFailures = new Set<string>();

function reportFailure(detail: string): void {
  if (reportedFailures.has(detail)) return;
  reportedFailures.add(detail);
  // A 404 or a malformed response is almost always a wiring problem rather than
  // a blip, so it is worth surfacing loudly instead of silently rendering an
  // empty shop.
  console.error(`[storefront] ${detail}`);
}

/**
 * Every active predefined template, in the backend's catalogue order. Resolves
 * to an empty list rather than throwing, so a backend outage degrades to an
 * empty shelf instead of a 500 or a failed deploy — the sitemap and the static
 * param generation both depend on this.
 */
export async function getStoreTemplates(): Promise<StoryTemplate[]> {
  try {
    return (await fetchTemplates()).map(toStoryTemplate);
  } catch (error) {
    reportFailure(error instanceof Error ? error.message : String(error));
    return [];
  }
}

/** A single template by its slug, or undefined when it is not in the catalogue. */
export async function getStoreTemplate(
  slug: string
): Promise<StoryTemplate | undefined> {
  const templates = await getStoreTemplates();
  return templates.find((template) => template.slug === slug);
}
