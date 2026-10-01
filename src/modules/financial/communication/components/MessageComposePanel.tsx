"use client";

import { useMemo, useState } from "react";
import { T } from "@/i18n";
import {
  renderMessageTemplate,
  whatsappTextHref,
  type MessageTemplateId,
  type MessageVars,
} from "@/modules/financial/communication";
import { shareText } from "@/lib/share";
import { Copy, MessageCircle, Share2 } from "lucide-react";

type Props = {
  templateId: MessageTemplateId;
  vars: MessageVars;
  /** Party WhatsApp / phone for wa.me link */
  phone?: string | null;
  title?: string;
};

/**
 * Generate message text — copy / share / open WhatsApp.
 * Does not call any SMS/WhatsApp API (Phase 11).
 */
export function MessageComposePanel({
  templateId,
  vars,
  phone,
  title,
}: Props) {
  const text = useMemo(
    () => renderMessageTemplate(templateId, vars),
    [templateId, vars]
  );
  const [status, setStatus] = useState("");
  const wa = whatsappTextHref(phone, text);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied");
    } catch {
      setStatus("Copy failed");
    }
  };

  const share = async () => {
    const r = await shareText({ title: title || "Synnera", text });
    setStatus(
      r === "shared" ? "Shared" : r === "copied" ? "Copied" : r === "cancelled" ? "" : "Share failed"
    );
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 print:hidden">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">
          {title || <T>Message</T>}
        </h3>
        {status && (
          <span className="text-xs text-emerald-700 font-medium">{status}</span>
        )}
      </div>
      <textarea
        readOnly
        className="w-full min-h-[140px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
        value={text}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium"
        >
          <Copy className="w-4 h-4" />
          <T>Copy</T>
        </button>
        <button
          type="button"
          onClick={share}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium"
        >
          <Share2 className="w-4 h-4" />
          <T>Share</T>
        </button>
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </a>
        )}
      </div>
      <p className="text-[11px] text-slate-400">
        <T>Opens WhatsApp with this text. SMS provider integration comes later.</T>
      </p>
    </div>
  );
}
