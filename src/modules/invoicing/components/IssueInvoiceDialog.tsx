"use client";

import { T } from "@/i18n";

export function IssueInvoiceDialog({
  open,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  busy?: boolean;
  error?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={busy ? undefined : onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-xl space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">
          <T>Issue Invoice</T>
        </h3>
        <p className="text-sm text-slate-600">
          <T>Issue this invoice?</T>{" "}
          <T>It will become a permanent tax document and cannot be edited.</T>
        </p>
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
            <T>Cancel</T>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? <T>Issuing</T> : <T>Confirm Issue</T>}
          </button>
        </div>
      </div>
    </div>
  );
}
