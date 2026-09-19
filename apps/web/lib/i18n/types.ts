export type Locale = "en" | "fr" | "ar";

export const LOCALES: Locale[] = ["en", "fr", "ar"];

export const LANGUAGE_OPTIONS: { code: Locale; label: string; flag: string; htmlLang: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧", htmlLang: "en" },
  { code: "fr", label: "Français", flag: "🇫🇷", htmlLang: "fr" },
  { code: "ar", label: "العربية", flag: "🇸🇦", htmlLang: "ar" },
];

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as string[]).includes(value);
}

export function htmlLangFor(locale: Locale): string {
  if (locale === "fr") return "fr";
  if (locale === "ar") return "ar";
  return "en";
}