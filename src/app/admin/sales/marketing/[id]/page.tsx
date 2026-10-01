"use client";

import { T, useLanguage } from "@/i18n";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  MARKETING_CATEGORIES,
  fetchMarketingMaterial,
  saveMarketingMaterial,
  setMarketingStatus,
} from "@/modules/salesMarketing";
import AdminSalesSubNav from "@/modules/sales/components/AdminSalesSubNav";

export default function AdminEditMarketingPage() {
  const { id } = useParams() as { id: string };
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [category, setCategory] = useState("Product");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [status, setStatus] = useState("draft");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const m = await fetchMarketingMaterial(id);
      if (m) {
        setTitle(m.title || m.en?.title || "");
        setContent(m.content || m.en?.content || "");
        setHashtags(m.hashtags || m.en?.hashtags || "");
        setCategory(String(m.category || "Other"));
        setMediaUrl(m.mediaUrl || "");
        setMediaType((m.mediaType as "image" | "video") || "image");
        setStatus(String(m.status || "draft"));
      }
      setLoading(false);
    })();
  }, [id]);

  const save = async () => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      await saveMarketingMaterial(
        {
          id,
          category,
          status,
          mediaType,
          mediaUrl,
          en: { title, content, hashtags },
          title,
          content,
          hashtags,
        },
        user.uid
      );
      router.push("/admin/sales/marketing");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <p className="text-center text-slate-400 py-12">
        <T>Loading…</T>
      </p>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <AdminSalesSubNav />
      <h1 className="text-xl font-bold">
        <T>Edit Marketing Material</T>
      </h1>
      <input
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t("Title")}
      />
      <textarea
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm min-h-[120px]"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={t("Content")}
      />
      <input
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        value={hashtags}
        onChange={(e) => setHashtags(e.target.value)}
        placeholder={t("Hashtags")}
      />
      <select
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        {MARKETING_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <input
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        value={mediaUrl}
        onChange={(e) => setMediaUrl(e.target.value)}
        placeholder="Media URL"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="flex-1 py-3 rounded-2xl bg-[#330066] text-white font-bold"
        >
          <T>Save Changes</T>
        </button>
        {status !== "published" ? (
          <button
            type="button"
            onClick={async () => {
              await setMarketingStatus(id, "published");
              setStatus("published");
            }}
            className="flex-1 py-3 rounded-2xl border font-semibold"
          >
            <T>Publish</T>
          </button>
        ) : (
          <button
            type="button"
            onClick={async () => {
              await setMarketingStatus(id, "unpublished");
              setStatus("unpublished");
            }}
            className="flex-1 py-3 rounded-2xl border font-semibold"
          >
            <T>Unpublish</T>
          </button>
        )}
      </div>
    </div>
  );
}
