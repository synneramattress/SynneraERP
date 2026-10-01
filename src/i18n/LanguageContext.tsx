"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { translations } from "./translations";
import { uiTranslations } from "./uiTranslations";

export type Language = "en" | "hi" | "gu";

const LANGUAGE_KEY = "synnera-language";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (text: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const originalTextNodes = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Record<string, string>>();

function translate(text: string, language: Language): string {
  if (language === "en") return text;
  const entry =
    (translations as Record<string, { hi?: string; gu?: string } | undefined>)[text] ||
    (uiTranslations as Record<string, { hi?: string; gu?: string } | undefined>)[text];
  return entry?.[language] || text;
}

/** Find the English dictionary key when a node currently contains a translated value. */
function originalForTranslatedValue(text: string, language: Language): string | null {
  if (language === "en" || !text) return null;
  const dictionaries = [translations as Record<string, { hi?: string; gu?: string }>, uiTranslations];
  for (const dict of dictionaries) {
    for (const [key, entry] of Object.entries(dict)) {
      if (entry?.[language] === text) return key;
    }
  }
  return null;
}

/** True only for exact UI dictionary strings — never for dynamic data (counts, order #s, names). */
function isTranslatableUiString(core: string): boolean {
  if (!core) return false;
  if (/^\(?\d+(?:\.\d+)?\)?$/.test(core)) return false;
  if (/^[A-Z0-9-]{6,}$/i.test(core)) return false;
  return (
    Object.prototype.hasOwnProperty.call(translations, core) ||
    Object.prototype.hasOwnProperty.call(uiTranslations, core)
  );
}

/**
 * Translate existing hard-coded UI text without changing application logic.
 * The observer also watches characterData/attributes because React can update
 * an existing text node in place after data loads. Those updates used to bypass
 * the old childList-only observer and could put English back after Gujarati.
 */
function localizeDom(language: Language) {
  if (typeof document === "undefined") return;

  let scanning = false;
  let scheduled = false;

  const scan = () => {
    if (scanning) return;
    scanning = true;
    try {
      const root = document.body;
      if (!root) return;

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const textNode = node as Text;
        const parent = textNode.parentElement;
        if (!parent || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName)) continue;

        const current = textNode.nodeValue || "";
        const leading = current.match(/^\s*/)?.[0] || "";
        const trailing = current.match(/\s*$/)?.[0] || "";
        const core = current.trim();
        if (!core) continue;

        let original = originalTextNodes.get(textNode);

        // React may replace/reuse a text node while it already contains a
        // translated value. Recover the English dictionary key if possible.
        if (!original) {
          if (isTranslatableUiString(core)) {
            original = core;
          } else {
            original = originalForTranslatedValue(core, language) || undefined;
          }
          if (original) originalTextNodes.set(textNode, original);
        }

        if (!original || !isTranslatableUiString(original)) continue;

        const translated = language === "en" ? original : translate(original, language);
        if (current.trim() !== translated) {
          textNode.nodeValue = `${leading}${translated}${trailing}`;
        }
      }

      root.querySelectorAll<HTMLElement>("*").forEach((el) => {
        const attrs = ["placeholder", "title", "aria-label", "alt"];
        if (!originalAttributes.has(el)) originalAttributes.set(el, {});
        const originals = originalAttributes.get(el)!;

        attrs.forEach((attr) => {
          const value = el.getAttribute(attr);
          if (value == null) return;

          let original: string | undefined = originals[attr];
          if (!original) {
            if (isTranslatableUiString(value)) original = value;
            else original = originalForTranslatedValue(value, language) || undefined;
            if (original) originals[attr] = original;
          }
          if (!original || !isTranslatableUiString(original)) return;

          const translated = language === "en" ? original : translate(original, language);
          if (value !== translated) el.setAttribute(attr, translated);
        });
      });
    } finally {
      scanning = false;
    }
  };

  const scheduleScan = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      scan();
    });
  };

  scan();

  const observer = new MutationObserver(() => scheduleScan());
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["placeholder", "title", "aria-label", "alt"],
  });

  return () => observer.disconnect();
}


export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem(LANGUAGE_KEY) as Language | null;
    if (saved === "en" || saved === "hi" || saved === "gu") setLanguageState(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_KEY, language);
    document.documentElement.lang = language === "hi" ? "hi" : language === "gu" ? "gu" : "en";

    // Browser dialogs are outside the DOM, so MutationObserver cannot translate
    // them. Wrap alert/confirm for exact dictionary UI messages while leaving
    // dynamic Firebase/server errors untouched.
    const nativeAlert = window.alert.bind(window);
    const nativeConfirm = window.confirm.bind(window);
    window.alert = (message?: any) => nativeAlert(translate(String(message ?? ""), language));
    window.confirm = (message?: string) => nativeConfirm(translate(String(message ?? ""), language));

    const cleanup = localizeDom(language);
    return () => {
      cleanup?.();
      window.alert = nativeAlert;
      window.confirm = nativeConfirm;
    };
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage: (next: Language) => setLanguageState(next),
    t: (text: string) => translate(text, language),
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used inside LanguageProvider");
  return value;
}

/** Translate a static UI text node without changing any application logic. */
export function T({ children }: { children: string }) {
  const { t } = useLanguage();
  return <>{t(children)}</>;
}
