"use client";

import { useEffect, useState } from "react";
import { T, useLanguage } from "@/i18n";
import type { Order, OrderItem } from "@/modules/orders";
import {
  isSpeechSupported,
  speakOrder,
  speakOrderItem,
  stopSpeech,
  pauseSpeech,
  resumeSpeech,
  subscribeSpeechStatus,
  type SpeechStatus,
} from "@/modules/employees/speech";
import { Pause, Play, Square, Volume2 } from "lucide-react";

type Props = {
  order: Order;
  /** If set, speak only this item (Listen on one mattress card) */
  item?: OrderItem;
  itemIndex?: number;
  /** compact = small per-item button */
  variant?: "order" | "item";
};

export default function OrderSpeechControls({
  order,
  item,
  itemIndex = 0,
  variant = "order",
}: Props) {
  const { language } = useLanguage();
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [unsupportedMsg, setUnsupportedMsg] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);

  useEffect(() => {
    return subscribeSpeechStatus(setStatus);
  }, []);

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  const start = async () => {
    if (!isSpeechSupported()) {
      setUnsupportedMsg(true);
      return;
    }
    setUnsupportedMsg(false);
    setHasPlayed(true);
    if (variant === "item" && item) {
      await speakOrderItem(item, itemIndex, language);
    } else {
      await speakOrder(order, language);
    }
  };

  if (variant === "item") {
    return (
      <button
        type="button"
        onClick={() => {
          if (status === "speaking" || status === "paused") {
            stopSpeech();
          } else {
            start();
          }
        }}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#330066]/30 bg-[#330066]/5 text-[#330066] text-sm font-semibold"
      >
        <Volume2 className="w-4 h-4" />
        <T>Listen</T>
      </button>
    );
  }

  return (
    <div className="space-y-2">
      {unsupportedMsg && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <T>Voice playback is not available on this device.</T>
        </p>
      )}

      {status === "idle" || status === "unsupported" ? (
        <button
          type="button"
          onClick={start}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#330066] text-white font-bold text-base shadow-sm active:scale-[0.99]"
        >
          <Volume2 className="w-6 h-6" />
          {hasPlayed ? <T>Listen Again</T> : <T>Listen to Order</T>}
        </button>
      ) : null}

      {status === "speaking" && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => pauseSpeech()}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-[#330066] text-[#330066] font-bold bg-white"
          >
            <Pause className="w-5 h-5" />
            <T>Pause</T>
          </button>
          <button
            type="button"
            onClick={() => stopSpeech()}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-slate-300 text-slate-700 font-bold bg-white"
          >
            <Square className="w-5 h-5" />
            <T>Stop</T>
          </button>
        </div>
      )}

      {status === "paused" && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => resumeSpeech()}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#330066] text-white font-bold"
          >
            <Play className="w-5 h-5" />
            <T>Resume</T>
          </button>
          <button
            type="button"
            onClick={() => stopSpeech()}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-slate-300 text-slate-700 font-bold bg-white"
          >
            <Square className="w-5 h-5" />
            <T>Stop</T>
          </button>
        </div>
      )}

    </div>
  );
}
