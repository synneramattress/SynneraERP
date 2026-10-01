"use client";

/**
 * Party uploads photo of signed+stamped+ticked physical DC.
 * No mandatory form fields — photo only (+ optional remark).
 */

import { useRef, useState } from "react";
import { T } from "@/i18n";
import { useAuth } from "@/context/AuthContext";
import { uploadImageToImageKit } from "@/lib/imagekit/upload";
import {
  uploadDeliveryChallanPod,
  type DeliveryChallan,
} from "@/modules/delivery-challan";
import { Loader2, Upload, CheckCircle } from "lucide-react";

type Props = {
  dc: DeliveryChallan;
  onUploaded?: () => void;
};

export function UploadSignedChallan({ dc, onUploaded }: Props) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const needsUpload =
    dc.status === "generated" ||
    dc.status === "dispatched" ||
    (dc.status === "pod_uploaded" && dc.pod?.rejected);

  if (!needsUpload && dc.pod?.signedImageUrl && !dc.pod.rejected) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2 text-sm text-emerald-900">
        <CheckCircle className="h-4 w-4 shrink-0" />
        <span>
          <T>DC Uploaded</T>
          {dc.pod.uploadedAt
            ? ` · ${new Date(
                typeof (dc.pod.uploadedAt as { toDate?: () => Date }).toDate ===
                "function"
                  ? (dc.pod.uploadedAt as { toDate: () => Date }).toDate()
                  : (dc.pod.uploadedAt as string)
              ).toLocaleString("en-IN")}`
            : ""}
        </span>
      </div>
    );
  }

  if (!needsUpload) return null;

  async function onFile(file: File | null) {
    if (!file || !user?.uid) return;
    setBusy(true);
    setError("");
    try {
      const result = await uploadImageToImageKit(
        file,
        "/synnera/delivery-challans"
      );
      const url = result.url || (result as { filePath?: string }).filePath;
      if (!url) throw new Error("Upload failed — no URL");
      await uploadDeliveryChallanPod(dc.id, {
        signedImageUrl: url,
        uploadedBy: user.uid,
      });
      setDone(true);
      onUploaded?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-2">
      <p className="text-sm font-semibold text-indigo-900">
        {dc.pod?.rejected ? (
          <T>Re-upload Signed Challan</T>
        ) : (
          <T>Upload Signed Challan</T>
        )}
      </p>
      <p className="text-xs text-indigo-800">
        {dc.challanNumber}
        {dc.orderNumber ? ` · ${dc.orderNumber}` : ""}
      </p>
      {dc.pod?.rejected && dc.pod.rejectionReason ? (
        <p className="text-xs text-rose-600">{dc.pod.rejectionReason}</p>
      ) : null}
      <p className="text-xs text-indigo-700">
        Take a clear photo of the signed, stamped Delivery Challan (with ticks)
        and upload here.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] || null)}
      />
      <button
        type="button"
        disabled={busy || done}
        onClick={() => inputRef.current?.click()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        {done ? <T>Signed Challan Uploaded</T> : <T>Upload Signed Challan</T>}
      </button>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
