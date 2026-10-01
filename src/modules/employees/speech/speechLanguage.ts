import type { Language } from "@/i18n";

/** Map app language → SpeechSynthesis BCP-47 lang code */
export function speechLangCode(language: Language): string {
  if (language === "hi") return "hi-IN";
  if (language === "gu") return "gu-IN";
  return "en-IN";
}

/** Prefer a matching voice if the browser has one */
export function pickVoice(
  language: Language
): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const code = speechLangCode(language);
  const primary = code.slice(0, 2).toLowerCase();
  return (
    voices.find((v) => v.lang.toLowerCase() === code.toLowerCase()) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(primary)) ||
    null
  );
}
