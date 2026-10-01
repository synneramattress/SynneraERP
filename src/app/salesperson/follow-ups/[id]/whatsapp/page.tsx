"use client";

import { T, useLanguage } from "@/i18n";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ChevronDown, ExternalLink, RefreshCw } from "lucide-react";
import { whatsappHref } from "@/lib/phoneLinks";
import {
  defaultWhatsAppMessage,
  fetchRetailFollowUp,
  fetchConversations,
  type RetailFollowUp,
  type WhatsAppMessageLang,
} from "@/modules/retailFollowUps";

const LANG_OPTIONS: { value: WhatsAppMessageLang; label: string }[] = [
  { value: "gu", label: "ગુજરાતી" },
  { value: "hi", label: "हिन्दी" },
  { value: "en", label: "English" },
];

export default function RetailWhatsAppPreviewPage() {
  const params = useParams();
  const id = params?.id as string;
  const { language: appLang } = useLanguage();
  const [row, setRow] = useState<RetailFollowUp | null>(null);
  const [originalConversation, setOriginalConversation] = useState("");
  const [message, setMessage] = useState("");
  const [msgLang, setMsgLang] = useState<WhatsAppMessageLang>(
    appLang === "hi" || appLang === "gu" ? appLang : "en"
  );
  const [loading, setLoading] = useState(true);
  const [langOpen, setLangOpen] = useState(false);
  const [edited, setEdited] = useState(false);
  const [regenerateCount, setRegenerateCount] = useState(0);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    // Default language follows app language when page loads
    setMsgLang(appLang === "hi" || appLang === "gu" ? appLang : "en");
  }, [appLang]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await fetchRetailFollowUp(id);
        const conversations = data ? await fetchConversations(id) : [];
        const conversationText = conversations.length
          ? conversations.slice().reverse().map((c) => c.note).filter(Boolean).join("\n")
          : String(data?.requirementNotes || "");
        setOriginalConversation(conversationText);
        setRow(data);
        if (data) {
          const lang = appLang === "hi" || appLang === "gu" ? appLang : "en";
          setMessage(defaultWhatsAppMessage({ ...data, requirementNotes: conversationText }, lang));
          setEdited(false);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id, appLang]);

  const applyLang = (lang: WhatsAppMessageLang) => {
    setMsgLang(lang);
    setLangOpen(false);
    if (row && !edited) {
      setMessage(defaultWhatsAppMessage({ ...row, requirementNotes: originalConversation }, lang));
    } else if (row && edited) {
      // regenerating in new language still allowed via explicit Regenerate
    }
  };

  const regenerate = () => {
    if (row) {
      setMessage(defaultWhatsAppMessage({ ...row, requirementNotes: originalConversation }, msgLang, regenerateCount + 1));
      setEdited(false);
    }
  };

  const openWhatsApp = () => {
    if (!row) return;
    const base = whatsappHref(row.mobile);
    if (!base) {
      alert("Invalid mobile number");
      return;
    }
    const url = `${base}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-[#330066] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!row) {
    return <p className="text-center text-slate-500 py-12">Not found</p>;
  }

  const langLabel =
    LANG_OPTIONS.find((o) => o.value === msgLang)?.label || "English";

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href={`/salesperson/follow-ups/${id}`}
          className="p-2 -ml-2 rounded-xl hover:bg-slate-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-bold text-slate-900">
          <T>WhatsApp Message</T>
        </h1>
      </div>

      <p className="text-sm text-slate-500">
        <T>To</T>: {row.mobile} ({row.customerName})
      </p>

      <div>
        <p className="text-xs font-semibold text-slate-500 mb-1">
          <T>Message Preview</T>
        </p>
        <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-sm text-slate-800 whitespace-pre-wrap">
          {message}
        </div>
      </div>

      {/* Message Language dropdown */}
      <div className="relative">
        <p className="text-xs font-semibold text-slate-500 mb-1">
          <T>Message Language</T>
        </p>
        <button
          type="button"
          onClick={() => setLangOpen((v) => !v)}
          className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800"
        >
          <span>{langLabel}</span>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </button>
        {langOpen && (
          <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
            {LANG_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  setMsgLang(o.value);
                  setLangOpen(false);
                  if (row) {
                    setMessage(defaultWhatsAppMessage({ ...row, requirementNotes: originalConversation }, o.value));
                    setEdited(false);
                  }
                }}
                className={`w-full text-left px-3 py-2.5 text-sm hover:bg-slate-50 flex items-center justify-between ${
                  msgLang === o.value ? "bg-violet-50 text-[#330066] font-semibold" : "text-slate-700"
                }`}
              >
                {o.label}
                {msgLang === o.value ? <span>✓</span> : null}
              </button>
            ))}
          </div>
        )}
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-semibold text-slate-500">
          <T>Edit Message</T>
        </span>
        <textarea
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            setEdited(true);
          }}
          rows={6}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none resize-none"
        />
      </label>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={regenerate}
          disabled={regenerating}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
        >
          <RefreshCw className={`w-4 h-4 ${regenerating ? "animate-spin" : ""}`} />
          <T>Regenerate</T>
        </button>
        <button
          type="button"
          onClick={openWhatsApp}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#330066] text-white text-sm font-bold"
        >
          <ExternalLink className="w-4 h-4" />
          <T>Open WhatsApp</T>
        </button>
      </div>

      <p className="text-xs text-slate-400 text-center">
        <T>Message is not sent automatically. Press Send in WhatsApp.</T>
      </p>
    </div>
  );
}
