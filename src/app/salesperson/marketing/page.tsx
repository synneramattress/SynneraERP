"use client";

import { T, useLanguage } from "@/i18n";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchPublishedMarketingMaterials,
  resolveMarketingText,
  MARKETING_CATEGORIES,
  type SalesMarketingMaterial,
} from "@/modules/salesMarketing";

export default function SalespersonMarketingPage() {
  const { language, t } = useLanguage();
  const [rows, setRows] = useState<SalesMarketingMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchPublishedMarketingMaterials());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((m) => {
      if (cat !== "all" && m.category !== cat) return false;
      if (!s) return true;
      const txt = resolveMarketingText(m, language);
      return (
        txt.title.toLowerCase().includes(s) ||
        txt.content.toLowerCase().includes(s)
      );
    });
  }, [rows, q, cat, language]);

  const copyContent = async (m: SalesMarketingMaterial) => {
    const txt = resolveMarketingText(m, language);
    const body = [txt.title, txt.content, txt.hashtags]
      .filter(Boolean)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(body);
      setMsg(t("Copied."));
    } catch {
      setMsg(t("Could not copy."));
    }
  };

  const share = async (m: SalesMarketingMaterial) => {
    const txt = resolveMarketingText(m, language);
    const body = [txt.title, txt.content, txt.hashtags]
      .filter(Boolean)
      .join("\n\n");
    try {
      if (navigator.share) {
        await navigator.share({
          title: txt.title,
          text: body,
          url: m.mediaUrl || undefined,
        });
      } else {
        await copyContent(m);
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div>
        <h1 className="text-xl font-bold">
          <T>Marketing Materials</T>
        </h1>
        <p className="text-sm text-slate-500">
          <T>Ready-made content to share</T>
        </p>
      </div>
      {msg && (
        <p className="text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">
          {msg}
        </p>
      )}
      <input
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        placeholder={t("Search")}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="flex gap-1.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => setCat("all")}
          className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${
            cat === "all"
              ? "bg-[#330066] text-white"
              : "bg-white border border-slate-200"
          }`}
        >
          <T>All</T>
        </button>
        {MARKETING_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${
              cat === c
                ? "bg-[#330066] text-white"
                : "bg-white border border-slate-200"
            }`}
          >
            <T>{c}</T>
          </button>
        ))}
      </div>
      {loading ? (
        <p className="text-center text-slate-400 text-sm py-8">
          <T>Loading…</T>
        </p>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-2xl border p-8 text-center text-sm text-slate-500">
          <T>No materials published yet.</T>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((m) => {
            const txt = resolveMarketingText(m, language);
            return (
              <div
                key={m.id}
                className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
              >
                {m.mediaUrl && m.mediaType !== "video" && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.mediaUrl}
                    alt={txt.title}
                    className="w-full max-h-80 object-contain bg-slate-50 cursor-pointer"
                    onClick={() => window.open(m.mediaUrl, "_blank")}
                  />
                )}
                {m.mediaUrl && m.mediaType === "video" && (
                  <video
                    src={m.mediaUrl}
                    controls
                    className="w-full max-h-80 bg-black"
                  />
                )}
                <div className="p-3 space-y-2">
                  <p className="text-[10px] font-bold uppercase text-violet-600">
                    {m.category}
                  </p>
                  <p className="font-semibold text-slate-900">{txt.title}</p>
                  <p className="text-sm text-slate-600 line-clamp-3">
                    {txt.content}
                  </p>
                  {txt.hashtags && (
                    <p className="text-xs text-sky-700">{txt.hashtags}</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => share(m)}
                      className="flex-1 py-2 rounded-xl bg-[#330066] text-white text-xs font-bold"
                    >
                      <T>Share</T>
                    </button>
                    {m.mediaUrl && (
                      <a
                        href={m.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="flex-1 py-2 rounded-xl border border-slate-200 text-center text-xs font-bold text-slate-700"
                      >
                        <T>Download</T>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => copyContent(m)}
                      className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700"
                    >
                      <T>Copy Content</T>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
