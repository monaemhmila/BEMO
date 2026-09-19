import { frStorefront } from "./fr";
import { frFeatures } from "./fr-features";
import { arStorefront } from "./ar";
import { arFeatures } from "./ar-features";
import {
  LANGUAGE_OPTIONS,
  LOCALES,
  htmlLangFor,
  isLocale,
  type Locale,
} from "./types";

export { LANGUAGE_OPTIONS, LOCALES, htmlLangFor, isLocale };
export type { Locale };

export const dictionaries: Record<Exclude<Locale, "en">, Record<string, string>> = {
  fr: { ...frStorefront, ...frFeatures },
  ar: { ...arStorefront, ...arFeatures },
};

const CURLY = /[\u2018\u2019\u02BC]/g;
const CURLY_DOUBLE = /[\u201C\u201D]/g;

/** Normalise typographic apostrophes/quotes to plain ASCII so keys match rendered text. */
export function normalize(text: string): string {
  return text.replace(CURLY, "'").replace(CURLY_DOUBLE, '"');
}

const ESCAPE_RE = /[.*+?^${}()|[\]\\]/g;
const escapeRe = (s: string) => s.replace(ESCAPE_RE, "\\$&");

const regexCache: Partial<Record<Locale, { regex: RegExp; dict: Record<string, string> }>> = {};

function compiled(locale: Exclude<Locale, "en">) {
  if (regexCache[locale]) return regexCache[locale]!;
  const dict = dictionaries[locale];
  const keys = Object.keys(dict)
    .map(normalize)
    .sort((a, b) => b.length - a.length);
  const pattern = keys.map(escapeRe).join("|");
  const regex = new RegExp(`(?<![\\p{L}])(${pattern})(?![\\p{L}])`, "gu");
  const entry = { regex, dict };
  regexCache[locale] = entry;
  return entry;
}

type DynamicRule = { pattern: RegExp; to: (a: string, b: string, c: string) => string };

const DYNAMIC: Record<Exclude<Locale, "en">, DynamicRule[]> = {
  fr: [
    {
      pattern: /(\d+)\s*of\s*(\d+)\s*pages/g,
      to: (a, b) => `${a} sur ${b} pages`,
    },
    { pattern: /Go to spread (\d+)/g, to: (a) => `Aller à la double page ${a}` },
    { pattern: /Pages (\d+)[–-](\d+)/g, to: (a, b) => `Pages ${a}–${b}` },
    { pattern: /(\d+) images/g, to: (a) => `${a} images` },
    { pattern: /Added (.+)/g, to: (a) => `Ajouté le ${a}` },
  ],
  ar: [
    {
      pattern: /(\d+)\s*of\s*(\d+)\s*pages/g,
      to: (a, b) => `${a} من ${b} صفحات`,
    },
    {
      pattern: /Go to spread (\d+)/g,
      to: (a) => `الانتقال إلى الصفحة المزدوجة ${a}`,
    },
    { pattern: /Pages (\d+)[–-](\d+)/g, to: (a, b) => `الصفحات ${a}–${b}` },
    { pattern: /(\d+) images/g, to: (a) => `${a} صور` },
    { pattern: /Added (.+)/g, to: (a) => `أُضيف ${a}` },
  ],
};

const LATIN_RE = /[A-Za-z]/;

export function hasLatin(text: string): boolean {
  return LATIN_RE.test(text);
}

/**
 * Translate a single English string into the given locale by replacing every
 * known phrase inside it. Unknown fragments are left untouched.
 */
export function translateText(text: string, locale: Locale): string {
  if (locale === "en" || !text || !hasLatin(text)) return text;

  const source = normalize(text);

  // 1) Whole-phrase dictionary pass (longest match first).
  const { regex, dict } = compiled(locale);
  let out = source.replace(regex, (m) => dict[m] ?? m);

  // 2) Numeric/dynamic patterns.
  for (const rule of DYNAMIC[locale]) {
    out = out.replace(rule.pattern, (match, a, b, c) =>
      rule.to(a ?? "", b ?? "", c ?? ""),
    );
  }

  return out;
}

/** True when the provided text still contains English words (heuristic for the translator). */
export function looksEnglish(text: string): boolean {
  return hasLatin(text);
}