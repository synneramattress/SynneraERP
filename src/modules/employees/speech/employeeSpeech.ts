/**
 * Browser SpeechSynthesis controller for Employee order TTS.
 * No external AI / no microphone.
 */

import type { Language } from "@/i18n";
import type { Order, OrderItem } from "@/modules/orders";
import { speechLangCode, pickVoice } from "./speechLanguage";
import { formatOrderSpeech, formatOrderItemSpeech, formatOrderCardSpeech } from "./speechFormatter";

export type SpeechStatus = "idle" | "speaking" | "paused" | "unsupported";

type Listener = (status: SpeechStatus) => void;

let listeners: Listener[] = [];
let currentStatus: SpeechStatus = "idle";

function setStatus(s: SpeechStatus) {
  currentStatus = s;
  listeners.forEach((fn) => fn(s));
}

export function subscribeSpeechStatus(fn: Listener): () => void {
  listeners.push(fn);
  fn(currentStatus);
  return () => {
    listeners = listeners.filter((x) => x !== fn);
  };
}

export function getSpeechStatus(): SpeechStatus {
  return currentStatus;
}

export function isSpeechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.speechSynthesis !== "undefined" &&
    typeof window.SpeechSynthesisUtterance !== "undefined"
  );
}

function ensureVoicesLoaded(): Promise<void> {
  return new Promise((resolve) => {
    if (!isSpeechSupported()) {
      resolve();
      return;
    }
    const syn = window.speechSynthesis;
    if (syn.getVoices().length) {
      resolve();
      return;
    }
    const onVoices = () => {
      syn.removeEventListener("voiceschanged", onVoices);
      resolve();
    };
    syn.addEventListener("voiceschanged", onVoices);
    // Fallback timeout
    setTimeout(() => {
      syn.removeEventListener("voiceschanged", onVoices);
      resolve();
    }, 500);
  });
}

function speakText(text: string, language: Language): void {
  if (!isSpeechSupported()) {
    setStatus("unsupported");
    return;
  }
  const syn = window.speechSynthesis;
  syn.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = speechLangCode(language);
  utter.rate = 0.9;
  utter.pitch = 1;
  const voice = pickVoice(language);
  if (voice) utter.voice = voice;

  utter.onstart = () => setStatus("speaking");
  utter.onend = () => setStatus("idle");
  utter.onerror = () => setStatus("idle");

  // Chrome sometimes needs resume after cancel
  try {
    syn.resume();
  } catch {
    /* ignore */
  }
  syn.speak(utter);
  setStatus("speaking");
}

export async function speakOrder(
  order: Order,
  language: Language
): Promise<void> {
  await ensureVoicesLoaded();
  if (!isSpeechSupported()) {
    setStatus("unsupported");
    return;
  }
  const text = formatOrderSpeech(order, language);
  if (!text.trim()) return;
  speakText(text, language);
}

/** Short list-card summary (employee Home / Production). */
export async function speakOrderCard(
  order: Order,
  language: Language
): Promise<void> {
  await ensureVoicesLoaded();
  if (!isSpeechSupported()) {
    setStatus("unsupported");
    return;
  }
  const text = formatOrderCardSpeech(order, language);
  if (!text.trim()) return;
  speakText(text, language);
}

export async function speakOrderItem(
  item: OrderItem,
  index: number,
  language: Language
): Promise<void> {
  await ensureVoicesLoaded();
  if (!isSpeechSupported()) {
    setStatus("unsupported");
    return;
  }
  const text = formatOrderItemSpeech(item, index, language);
  if (!text.trim()) return;
  speakText(text, language);
}

export function stopSpeech(): void {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
  setStatus("idle");
}

export function pauseSpeech(): void {
  if (!isSpeechSupported()) return;
  if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
    window.speechSynthesis.pause();
    setStatus("paused");
  }
}

export function resumeSpeech(): void {
  if (!isSpeechSupported()) return;
  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
    setStatus("speaking");
  }
}


/** Speak arbitrary guidance text (order wizard etc). Reuses same TTS stack. */
export async function speakGuidance(
  text: string,
  language: Language
): Promise<void> {
  if (!isSpeechSupported()) {
    setStatus("unsupported");
    return;
  }
  await ensureVoicesLoaded();
  speakText(text, language);
}
