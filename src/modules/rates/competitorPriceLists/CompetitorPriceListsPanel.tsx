"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { uploadImageToImageKit } from "@/lib/imagekit/upload";
import type { CompetitorPriceList } from "./types";
import {
  fetchCompetitorPriceLists,
  saveCompetitorPriceList,
  deleteCompetitorPriceList,
} from "./service";
import { InAppPdfViewer } from "@/components/pdf";

export default function CompetitorPriceListsPanel() {
  const { user } = useAuth();
  const [rows, setRows] = useState<CompetitorPriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState("");
  const [listDate, setListDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [viewType, setViewType] = useState<"image" | "pdf">("image");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchCompetitorPriceLists());
    } catch (e) {
      console.error(e);
      setError("Could not load competitor lists");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onUpload = async (file: File | null) => {
    if (!file || !user?.uid) return;
    if (!companyName.trim()) {
      setError("Enter company name first");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");
      const res = await uploadImageToImageKit(
        file,
        "/synnera/competitor-price-lists"
      );
      await saveCompetitorPriceList(
        {
          companyName: companyName.trim(),
          listDate,
          mediaUrl: res.url,
          mediaType: isPdf ? "pdf" : "image",
          fileName: file.name,
        },
        user.uid
      );
      setCompanyName("");
      await load();
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this price list?")) return;
    await deleteCompetitorPriceList(id);
    await load();
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <h3 className="text-sm font-bold text-slate-800">
        Other company price lists
      </h3>
      <p className="text-xs text-slate-500">
        Upload PDF or image with company name and date. View in page or download.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
          placeholder="Company name"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />
        <input
          type="date"
          className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
          value={listDate}
          onChange={(e) => setListDate(e.target.value)}
        />
        <input
          type="file"
          accept="image/*,application/pdf"
          disabled={uploading}
          onChange={(e) => onUpload(e.target.files?.[0] || null)}
          className="text-sm"
        />
      </div>
      {uploading && <p className="text-xs text-slate-500">Uploading…</p>}
      {error && <p className="text-xs text-rose-600">{error}</p>}

      {loading ? (
        <p className="text-xs text-slate-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-slate-400">No lists uploaded yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800 truncate">
                  {r.companyName}
                </p>
                <p className="text-[10px] text-slate-500">
                  {r.listDate}
                  {r.fileName ? ` · ${r.fileName}` : ""}
                </p>
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-[#330066] px-2 py-1 rounded border border-slate-200"
                onClick={() => {
                  setViewUrl(r.mediaUrl);
                  setViewType(r.mediaType);
                }}
              >
                View
              </button>
              <a
                href={r.mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="text-xs font-semibold text-slate-700 px-2 py-1 rounded border border-slate-200"
              >
                Download
              </a>
              <button
                type="button"
                className="text-xs text-rose-600 px-2 py-1"
                onClick={() => onDelete(r.id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* In-page viewer modal */}
      {viewUrl && viewType !== "pdf" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <p className="font-semibold text-sm">Price list preview</p>
              <button
                type="button"
                className="text-slate-500 text-sm"
                onClick={() => setViewUrl(null)}
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-auto p-2 bg-slate-50 min-h-[50vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={viewUrl}
                alt="Price list"
                className="max-w-full mx-auto"
              />
            </div>
            <div className="p-3 border-t flex justify-end">
              <a
                href={viewUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="px-4 py-2 rounded-xl bg-[#330066] text-white text-sm font-bold"
              >
                Download
              </a>
            </div>
          </div>
        </div>
      )}
      {viewUrl && viewType === "pdf" && (
        <InAppPdfViewer
          source={{ kind: "url", url: viewUrl }}
          title="Price list preview"
          onClose={() => setViewUrl(null)}
        />
      )}
    </div>
  );
}
