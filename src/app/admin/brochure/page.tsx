"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  deleteCurrentBrochure,
  fetchCurrentBrochure,
  uploadBrochurePdf,
  type CompanyBrochure,
} from "@/modules/brochure";
import { FileText, Trash2, Upload, ExternalLink, Loader2 } from "lucide-react";

export default function AdminBrochurePage() {
  const { user } = useAuth();
  const [current, setCurrent] = useState<CompanyBrochure | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setCurrent(await fetchCurrentBrochure());
    } catch (e: any) {
      setError(e?.message || "Failed to load brochure.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onFile = async (file: File | null) => {
    if (!file || !user?.uid) return;
    setBusy(true);
    setError("");
    try {
      const meta = await uploadBrochurePdf(file, user.uid);
      setCurrent(meta);
      alert("Brochure uploaded.");
    } catch (e: any) {
      setError(e?.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!confirm("Delete current company brochure?")) return;
    setBusy(true);
    try {
      await deleteCurrentBrochure();
      setCurrent(null);
    } catch (e: any) {
      setError(e?.message || "Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#330066]" />
          Company Brochure
        </h1>
        <p className="text-xs text-slate-500">Upload a PDF for Party users to download.</p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">{error}</div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500 flex justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          {current ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900">Current brochure</p>
              <p className="text-sm text-slate-600 break-all">{current.fileName}</p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={current.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium"
                >
                  <ExternalLink className="w-4 h-4" /> Open / Preview
                </a>
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 text-rose-700 text-sm"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No company brochure is currently available.</p>
          )}

          <div className="pt-3 border-t border-slate-100 space-y-2">
            <p className="text-sm font-semibold text-slate-900">
              {current ? "Replace brochure" : "Upload brochure"}
            </p>
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl p-6 cursor-pointer hover:border-[#330066]/40">
              <Upload className="w-6 h-6 text-[#330066]" />
              <span className="text-sm text-slate-600">
                {busy ? "Uploading…" : "Choose PDF (max 20 MB)"}
              </span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                disabled={busy}
                onChange={(e) => onFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
