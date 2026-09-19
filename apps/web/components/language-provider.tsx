"use client";

import * as React from "react";
import { htmlLangFor, isLocale, translateText, type Locale } from "@/lib/i18n";

const STORAGE_KEY = "ww_lang";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LanguageContext = React.createContext<LanguageContextValue | null>(null);

export function useLanguage(): LanguageContextValue {
  const ctx = React.useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Translation engine                                                  */
/* ------------------------------------------------------------------ */

const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEXTAREA",
  "INPUT",
  "SELECT",
  "OPTION",
  "CODE",
  "PRE",
  "KBD",
  "SAMP",
  "VAR",
  "SVG",
  "MATH",
]);

const ATTRS = ["placeholder", "aria-label", "title", "alt"] as const;
const ATTR_SELECTOR = "[placeholder],[aria-label],[title],[alt]";
const LATIN_RE = /[A-Za-z]/;

const originalText = new WeakMap<Text, string>();
const appliedText = new WeakMap<Text, { locale: Locale; text: string }>();
const originalAttrs = new WeakMap<Element, Map<string, string>>();

function hasSkipAncestor(el: Element | null): boolean {
  let node: Element | null = el;
  while (node) {
    if (SKIP_TAGS.has(node.tagName)) return true;
    if (node.hasAttribute("data-nolit")) return true;
    node = node.parentElement;
  }
  return false;
}

function processTextNode(node: Text, locale: Locale) {
  if (!node.parentElement || hasSkipAncestor(node.parentElement)) return;

  const current = node.data;
  if (!current || !LATIN_RE.test(current)) return;

  if (!originalText.has(node)) originalText.set(node, current);
  const original = originalText.get(node) ?? current;

  const record = appliedText.get(node);
  if (record && record.locale === locale && record.text === current) return;

  const target =
    locale === "en" ? original : translateText(original ?? "", locale);

  if (target !== current) {
    node.data = target;
  }
  appliedText.set(node, { locale, text: target });
}

function processElement(el: Element, locale: Locale) {
  if (el.hasAttribute("data-nolit")) return;

  let originals = originalAttrs.get(el);
  if (!originals) {
    originals = new Map();
    originalAttrs.set(el, originals);
  }

  for (const attr of ATTRS) {
    const current = el.getAttribute(attr);
    if (!current || !LATIN_RE.test(current)) continue;

    if (!originals.has(attr)) originals.set(attr, current);
    const original = originals.get(attr) ?? current;

    const target =
      locale === "en" ? original : translateText(original ?? "", locale);

    if (target !== current) {
      el.setAttribute(attr, target);
    }
  }
}

function collectAttrTargets(root: Element): Element[] {
  const targets: Element[] = [];
  if (root.matches(ATTR_SELECTOR)) targets.push(root);
  root.querySelectorAll(ATTR_SELECTOR).forEach((el) => targets.push(el));
  return targets;
}

function walkSubtree(root: Node, locale: Locale) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (hasSkipAncestor(parent)) return NodeFilter.FILTER_REJECT;
      if (parent.isContentEditable) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    processTextNode(node, locale);
  }

  if (root instanceof Element) {
    collectAttrTargets(root).forEach((el) => processElement(el, locale));
  }
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = React.useState<Locale>("en");
  const localeRef = React.useRef<Locale>(locale);
  localeRef.current = locale;

  // Restore the saved preference once mounted (avoids SSR mismatch).
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && isLocale(saved)) {
        setLocale(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    const root = document.body;

    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // ignore
    }

    document.documentElement.lang = htmlLangFor(locale);
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";

    if (!root) return undefined;

    walkSubtree(root, locale);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const currentLocale = localeRef.current;

        if (
          mutation.type === "characterData" &&
          mutation.target.nodeType === Node.TEXT_NODE
        ) {
          processTextNode(mutation.target as Text, currentLocale);
          continue;
        }

        if (mutation.type === "childList") {
          for (const added of mutation.addedNodes) {
            if (added.nodeType === Node.TEXT_NODE) {
              processTextNode(added as Text, currentLocale);
            } else if (added.nodeType === Node.ELEMENT_NODE) {
              walkSubtree(added as Element, currentLocale);
            }
          }
        }
      }
    });

    observer.observe(root, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [locale]);

  const value = React.useMemo(() => ({ locale, setLocale }), [locale]);

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}