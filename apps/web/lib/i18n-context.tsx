"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { dictionaries, type Dictionary, type Locale } from "./dictionaries";

type TranslationContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
};

function lookup(dict: Dictionary, path: string): string | undefined {
  const keys = path.split(".");
  let current: string | Dictionary | undefined = dict;

  for (const key of keys) {
    if (current === undefined || current === null || typeof current === "string") {
      return undefined;
    }
    current = current[key];
  }

  return typeof current === "string" ? current : undefined;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load saved locale from localStorage on mount
    const savedLocale = localStorage.getItem("app-locale") as Locale;
    if (savedLocale && (savedLocale === "en" || savedLocale === "fr" || savedLocale === "ar")) {
      setLocale(savedLocale);
    }
    setMounted(true);
  }, []);

  const handleSetLocale = (newLocale: Locale) => {
    setLocale(newLocale);
    localStorage.setItem("app-locale", newLocale);
  };

  const t = (path: string): string => {
    // Fallback to English if key is missing in the chosen language
    return lookup(dictionaries[locale], path) ?? lookup(dictionaries.en, path) ?? path;
  };

  // Prevent hydration mismatch by not rendering children until mounted
  if (!mounted) {
    return <div style={{ visibility: "hidden" }}>{children}</div>;
  }

  return (
    <TranslationContext.Provider value={{ locale, setLocale: handleSetLocale, t }}>
      <div dir={locale === "ar" ? "rtl" : "ltr"} className={locale === "ar" ? "font-arabic" : ""}>
        {children}
      </div>
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error("useTranslation must be used within a TranslationProvider");
  }
  return context;
}
