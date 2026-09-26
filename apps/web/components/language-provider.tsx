"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
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

type Applied = { locale: Locale; text: string };

const originalText = new WeakMap<Text, string>();
const appliedText = new WeakMap<Text, Applied>();
const originalAttrs = new WeakMap<Element, Map<string, string>>();
const appliedAttrs = new WeakMap<Element, Map<string, Applied>>();

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
  if (!current) return;

  const record = appliedText.get(node);
  // Anything other than the exact string we last wrote came from the app
  // (React re-render, async data, portal mount...). Treat it as the new
  // English source, otherwise we would keep translating a stale string and
  // overwrite the fresh content with it.
  const isOurOwnText = record !== undefined && record.text === current;
  if (!isOurOwnText) originalText.set(node, current);

  const original = originalText.get(node) ?? current;

  if (record && record.locale === locale && record.text === current) return;

  if (locale !== "en" && !LATIN_RE.test(original)) {
    appliedText.set(node, { locale, text: current });
    return;
  }

  const target = locale === "en" ? original : translateText(original, locale);

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

  let applied = appliedAttrs.get(el);
  if (!applied) {
    applied = new Map();
    appliedAttrs.set(el, applied);
  }

  for (const attr of ATTRS) {
    const current = el.getAttribute(attr);
    if (current === null) continue;

    const record = applied.get(attr);
    // Same rule as for text nodes: only trust the cached original while the
    // attribute still holds the value we wrote.
    if (record === undefined || record.text !== current) {
      originals.set(attr, current);
    }

    const original = originals.get(attr) ?? current;

    if (record && record.locale === locale && record.text === current) continue;

    if (locale !== "en" && !LATIN_RE.test(original)) {
      applied.set(attr, { locale, text: current });
      continue;
    }

    const target = locale === "en" ? original : translateText(original, locale);

    if (target !== current) {
      el.setAttribute(attr, target);
    }
    applied.set(attr, { locale, text: target });
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
  const pathname = usePathname();
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

        if (mutation.type === "attributes" && mutation.target.nodeType === Node.ELEMENT_NODE) {
          const el = mutation.target as Element;
          if (!hasSkipAncestor(el)) processElement(el, currentLocale);
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
      attributes: true,
      attributeFilter: [...ATTRS],
      subtree: true,
    });

    return () => observer.disconnect();
  }, [locale]);

  // Safety net: the provider lives in the root layout, so it survives client
  // side navigations. Re-walk after the new page has painted (and once more on
  // the following tick) so nodes the observer missed are translated too.
  React.useEffect(() => {
    if (locale === "en") return undefined;

    let second = 0;
    const frame = requestAnimationFrame(() => {
      if (document.body) walkSubtree(document.body, locale);
      second = window.setTimeout(() => {
        if (document.body) walkSubtree(document.body, locale);
      }, 200);
    });

    return () => {
      cancelAnimationFrame(frame);
      if (second) window.clearTimeout(second);
    };
  }, [locale, pathname]);

  const value = React.useMemo(() => ({ locale, setLocale }), [locale]);

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}