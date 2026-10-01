"use client";

import { useLanguage, type Language } from "@/i18n";

const options: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिन्दी" },
  { value: "gu", label: "ગુજરાતી" },
];

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useLanguage();
  return (
    <div className={compact ? "flex items-center gap-1" : "w-full"}>
      <span className={compact ? "sr-only" : "text-xs font-medium text-slate-500"}>Language</span>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
        aria-label="Language"
        className={compact
          ? "h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700"
          : "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"}
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  );
}
