"use client";

import { useEffect, useRef, useState } from "react";
import { T, useLanguage } from "@/i18n";
import {
  isSpeechSupported,
  speakGuidance,
  stopSpeech,
  subscribeSpeechStatus,
  type SpeechStatus,
} from "@/modules/employees/speech";
import {
  phraseForWizardStep,
  type WizardSpeechStep,
} from "@/lib/wizard/wizardSpeech";
import { Volume2, Square, VolumeX } from "lucide-react";

const STORAGE_KEY = "synnera_wizard_auto_speak";

export function getWizardAutoSpeak(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    // Default OFF so users are not surprised; prior builds defaulted on via prop
    if (v === null) return false;
    return v === "1" || v === "true";
  } catch {
    return false;
  }
}

export function setWizardAutoSpeak(on: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
    window.dispatchEvent(new CustomEvent("synnera-auto-speak", { detail: on }));
  } catch {
    /* ignore */
  }
}

type Props = {
  /** Current wizard step — drives what is spoken */
  step?: WizardSpeechStep | string;
  /** Override auto-speak (if omitted, uses saved setting) */
  autoSpeak?: boolean;
  /** Show the Auto speak on/off toggle next to the button */
  showSetting?: boolean;
  className?: string;
};

export function WizardSpeechButton({
  step,
  autoSpeak,
  showSetting = true,
  className = "",
}: Props) {
  const { language } = useLanguage();
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [settingOn, setSettingOn] = useState(false);
  const lastSpoken = useRef<string>("");

  useEffect(() => subscribeSpeechStatus(setStatus), []);
  useEffect(() => () => {
    stopSpeech();
  }, []);

  useEffect(() => {
    setSettingOn(getWizardAutoSpeak());
    const onEvt = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (typeof d === "boolean") setSettingOn(d);
      else setSettingOn(getWizardAutoSpeak());
    };
    window.addEventListener("synnera-auto-speak", onEvt);
    window.addEventListener("storage", onEvt);
    return () => {
      window.removeEventListener("synnera-auto-speak", onEvt);
      window.removeEventListener("storage", onEvt);
    };
  }, []);

  const effectiveAuto = autoSpeak !== undefined ? autoSpeak : settingOn;

  // Auto-speak current step only when step actually changes and setting is on
  useEffect(() => {
    if (!effectiveAuto || !step) return;
    const key = `${step}:${language}`;
    if (lastSpoken.current === key) return;
    lastSpoken.current = key;
    const text = phraseForWizardStep(step, language);
    if (!text || !isSpeechSupported()) return;
    const t = window.setTimeout(() => {
      void speakGuidance(text, language);
    }, 250);
    return () => window.clearTimeout(t);
  }, [step, language, effectiveAuto]);

  const speaking = status === "speaking" || status === "paused";

  const onClick = async () => {
    if (speaking) {
      stopSpeech();
      return;
    }
    if (!isSpeechSupported()) return;
    const text = step
      ? phraseForWizardStep(step, language)
      : phraseForWizardStep("mattress", language);
    if (!text) return;
    lastSpoken.current = `${step}:${language}`;
    await speakGuidance(text, language);
  };

  const toggleSetting = () => {
    const next = !settingOn;
    setWizardAutoSpeak(next);
    setSettingOn(next);
    if (!next) stopSpeech();
  };

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {showSetting && (
        <button
          type="button"
          onClick={toggleSetting}
          className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-full border text-[11px] font-semibold ${
            settingOn
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-slate-200 bg-white text-slate-600"
          }`}
          title={settingOn ? "Auto speak on" : "Auto speak off"}
          aria-label="Toggle auto speak"
        >
          {settingOn ? (
            <Volume2 className="w-3.5 h-3.5" />
          ) : (
            <VolumeX className="w-3.5 h-3.5" />
          )}
          <T>{settingOn ? "Auto speak: On" : "Auto speak: Off"}</T>
        </button>
      )}
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-[#330066]/25 bg-[#330066]/5 text-[#330066] text-xs font-semibold"
        title="Speak"
        aria-label="Speak current step"
      >
        {speaking ? (
          <Square className="w-3.5 h-3.5" />
        ) : (
          <Volume2 className="w-3.5 h-3.5" />
        )}
        <T>{speaking ? "Stop" : "Speak"}</T>
      </button>
    </div>
  );
}
