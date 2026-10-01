"use client";

import { useState } from "react";
import { T, useLanguage } from "@/i18n";

export function CancelInvoiceDialog({
  open,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  busy?: boolean;
  error?: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [reason, setReason] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={busy ? undefined : onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-xl space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">
          <T>Cancel Invoice</T>
        </h3>
        <p className="text-sm text-slate-600">
          <T>Cancel this invoice?</T>{" "}
          <T>This invoice will become CANCELLED and cannot be edited.</T>
        </p>
        <div>
          <label className="text-xs font-medium text-slate-500">
            <T>Cancellation Reason</T> *
          </label>
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            rows={3}
            value={reason}
            disabled={busy}
            placeholder={t("Cancellation Reason")}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <T>Keep Invoice</T>
          </button>
          <button
            type="button"
            disabled={busy || !reason.trim()}
            onClick={() => onConfirm(reason.trim())}
            className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {busy ? <T>Cancelling</T> : <T>Confirm Cancel</T>}
          </button>
        </div>
      </div>
    </div>
  );
}
