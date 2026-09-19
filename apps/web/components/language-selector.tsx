"use client";

import * as React from "react";
import { Check, Languages } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LANGUAGE_OPTIONS, type Locale } from "@/lib/i18n";
import { useLanguage } from "@/components/language-provider";

const SHORT_LABEL: Record<Locale, string> = {
  en: "EN",
  fr: "FR",
  ar: "ع",
};

export function LanguageSelector({ className }: { className?: string }) {
  const { locale, setLocale } = useLanguage();

  return (
    <div data-nolit className={cn("shrink-0", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-full px-3 font-bold"
            aria-label="Choose language"
          >
            <Languages className="size-4" aria-hidden />
            <span className="text-xs">{SHORT_LABEL[locale]}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {LANGUAGE_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.code}
              onSelect={() => setLocale(option.code)}
              className="flex items-center gap-2 py-2"
            >
              <span aria-hidden>{option.flag}</span>
              <span className="flex-1">{option.label}</span>
              {locale === option.code && (
                <Check className="size-4" aria-hidden />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}