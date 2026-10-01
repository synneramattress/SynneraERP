"use client";

import { T, useLanguage } from "@/i18n";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  MARKETING_CATEGORIES,
  saveMarketingMaterial,
} from "@/modules/salesMarketing";
import AdminSalesSubNav from "@/modules/sales/components/AdminSalesSubNav";
import { uploadImageToImageKit } from "@/lib/imagekit/upload";

export default function AdminNewMarketingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [category, setCategory] = useState<string>(MARKETING_CATEGORIES[0]);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [mediaUrl, setMediaUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [saving, setSaving] = useState(false);

  const onFile = async (file: File | null) => {
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      const isVideo = file.type.startsWith("video/");
      setMediaType(isVideo ? "video" : "image");
      const res = await uploadImageToImageKit(file, "/synnera/marketing");
      setMediaUrl(res.url);
    } catch (e: any) {
      console.error(e);
      setUploadError(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const submit = async (status: "draft" | "published") => {
    if (!user?.uid) return;
    if (!title.trim()) return;
    setSaving(true);
    try {
      await saveMarketingMaterial(
        {
          category,
          status,
          mediaType,
          mediaUrl,
          title: title.trim(),
          content: content.trim(),
          hashtags: hashtags.trim(),
          en: {
            title: title.trim(),
            content: content.trim(),
            hashtags: hashtags.trim(),
          },
        },
        user.uid
      );
      router.push("/admin/sales/marketing");
    } catch (e) {
      console.error(e);
      setUploadError("Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-24">
      <AdminSalesSubNav />
      <h1 className="text-lg font-bold text-slate-900">
        <T>New Marketing Material</T>
      </h1>

      <input
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        placeholder={t("Title") || "Title"}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm min-h-[100px]"
        placeholder={t("Content") || "Content"}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <input
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        placeholder="Hashtags"
        value={hashtags}
        onChange={(e) => setHashtags(e.target.value)}
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

      <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
        <p className="text-xs font-semibold text-slate-600">Media (ImageKit upload)</p>
        <input
          type="file"
          accept="image/*,video/*"
          disabled={uploading}
          onChange={(e) => onFile(e.target.files?.[0] || null)}
          className="w-full text-sm"
        />
        {uploading && (
          <p className="text-xs text-slate-500">Uploading…</p>
        )}
        {uploadError && (
          <p className="text-xs text-rose-600">{uploadError}</p>
        )}
        {mediaUrl && mediaType !== "video" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl} alt="Preview" className="w-full max-h-48 object-contain rounded-lg bg-slate-50" />
        )}
        {mediaUrl && mediaType === "video" && (
          <video src={mediaUrl} controls className="w-full max-h-48 rounded-lg" />
        )}
        {mediaUrl && (
          <button
            type="button"
            className="text-xs text-rose-600"
            onClick={() => setMediaUrl("")}
          >
            Remove media
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={saving || uploading}
          onClick={() => submit("draft")}
          className="flex-1 py-3 rounded-2xl border border-slate-200 font-semibold"
        >
          <T>Save Draft</T>
        </button>
        <button
          type="button"
          disabled={saving || uploading}
          onClick={() => submit("published")}
          className="flex-1 py-3 rounded-2xl bg-[#330066] text-white font-bold"
        >
          <T>Publish</T>
        </button>
      </div>
    </div>
  );
}
