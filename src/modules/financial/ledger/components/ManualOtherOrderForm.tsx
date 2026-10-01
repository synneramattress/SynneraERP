"use client";

import { useState } from "react";
import { T } from "@/i18n";
import {
  postManualOtherOrderEntry,
  type LedgerDirection,
} from "@/modules/financial/ledger";

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#330066]/20";

type Props = {
  partyId: string;
  createdBy: string;
  onSuccess?: () => void;
  onCancel?: () => void;
};

/**
 * Admin form: Other Order Ledger manual debit/credit.
 * Fully isolated from Tax Invoice Ledger.
 */
export function ManualOtherOrderForm({
  partyId,
  createdBy,
  onSuccess,
  onCancel,
}: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [direction, setDirection] = useState<LedgerDirection>("DEBIT");
  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState(today);
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await postManualOtherOrderEntry(
        {
          partyId,
          direction,
          amount: Number(amount),
          transactionDate,
          description,
          reference: reference || undefined,
          notes: notes || undefined,
        },
        createdBy
      );
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entry");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4"
    >
      <h3 className="text-sm font-semibold text-slate-900">
        <T>Add Other Order entry</T>
      </h3>
      <p className="text-xs text-slate-500">
        <T>This does not affect Tax Invoice Ledger</T>
      </p>

      <div className="flex gap-2">
        {(["DEBIT", "CREDIT"] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDirection(d)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold ${
              direction === d
                ? d === "DEBIT"
                  ? "bg-rose-600 text-white"
                  : "bg-emerald-600 text-white"
                : "bg-white border border-slate-200 text-slate-600"
            }`}
          >
            {d === "DEBIT" ? <T>Debit</T> : <T>Credit</T>}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block text-xs font-medium text-slate-600">
          <T>Amount</T>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            className={`${fieldClass} mt-1`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className="block text-xs font-medium text-slate-600">
          <T>Date</T>
          <input
            type="date"
            required
            className={`${fieldClass} mt-1`}
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
          />
        </label>
      </div>

      <label className="block text-xs font-medium text-slate-600">
        <T>Particular</T>
        <input
          required
          className={`${fieldClass} mt-1`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
        />
      </label>
      <label className="block text-xs font-medium text-slate-600">
        <T>Reference</T>
        <input
          className={`${fieldClass} mt-1`}
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="ORD-700 / note"
        />
      </label>
      <label className="block text-xs font-medium text-slate-600">
        <T>Notes</T>
        <input
          className={`${fieldClass} mt-1`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 rounded-xl bg-[#330066] text-white text-sm font-semibold disabled:opacity-50"
        >
          {busy ? <T>Saving…</T> : <T>Save entry</T>}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium"
          >
            <T>Cancel</T>
          </button>
        )}
      </div>
    </form>
  );
}
