"use client";

import { useLanguage } from "@/components/language-provider";
import { translateText } from "@/lib/i18n";
import { storyTranslations, type StoryCopyField } from "@/lib/story-translations";

type LocalizedStoryTextProps = {
  templateId: string;
  field: StoryCopyField;
  fallback: string;
  translations?: {
    fr?: Partial<Record<StoryCopyField, string | null>>;
    ar?: Partial<Record<StoryCopyField, string | null>>;
  };
};

/** Renders catalogue copy for the selected locale with a safe English fallback. */
export function LocalizedStoryText({
  templateId,
  field,
  fallback,
  translations,
}: LocalizedStoryTextProps) {
  const { locale } = useLanguage();
  const databaseCopy = locale === "en" ? null : translations?.[locale]?.[field];
  const curatedCopy = storyTranslations[templateId]?.[locale]?.[field];

  // If a future database story is not in the curated catalogue map yet, use
  // the shared phrase translator before falling back to its English copy.
  return <>{databaseCopy ?? curatedCopy ?? translateText(fallback, locale)}</>;
}
