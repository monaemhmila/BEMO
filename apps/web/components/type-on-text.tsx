"use client";

import { motion } from "framer-motion";
import { translateText } from "@/lib/i18n";
import { useLanguage } from "@/components/language-provider";

export function TypeOnText({
  children,
  className,
  delay = 0,
}: {
  children: string;
  className?: string;
  delay?: number;
}) {
  const { locale } = useLanguage();
  const translatedText = translateText(children, locale);

  return (
    <span className={className} aria-label={translatedText}>
      {translatedText.split(/(\s+)/).map((part, partIndex) => {
        if (/^\s+$/.test(part)) {
          return (
            <span key={`space-${partIndex}`} aria-hidden="true">
              {part.replace(/\s/g, "\u00a0")}
            </span>
          );
        }

        return (
          <span key={`${part}-${partIndex}`} className="inline-block whitespace-nowrap" aria-hidden="true">
            {Array.from(part).map((character, characterIndex) => (
              <motion.span
                key={`${character}-${characterIndex}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: delay + (partIndex + characterIndex) * 0.025,
                  duration: 0.22,
                  ease: "easeOut",
                }}
                className="inline-block"
              >
                {character}
              </motion.span>
            ))}
          </span>
        );
      })}
    </span>
  );
}
