"use client";

import { useRef, useState } from "react";
import { T } from "@/i18n";
import {
  PAYMENT_MODES,
  PAYMENT_MODE_LABELS,
  type RecordPaymentInput,
} from "../index";
import { recordPartyPayment } from "../services/paymentsService";

type Props = {
  partyId: string;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  createdBy: string;
  /** Optional max hint (does not block over-payment in Phase 3) */
  suggestedMax?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
};

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#330066]/20";

/**
 * Minimal admin form to record a party payment (Tax Invoice Ledger credit).
 * Avoids full-screen overlays that can trap navigation.
 */
export function RecordPaymentForm({
  partyId,
  invoiceId,
  invoiceNumber,
  createdBy,
  suggestedMax,
  onSuccess,
  onCancel,
}: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [amount, setAmount] = useState(
    suggestedMax && suggestedMax > 0 ? String(suggestedMax) : ""
  );
  const [paymentDate, setPaymentDate] = useState(today);
  const [paymentMode, setPaymentMode] = useState<string>("CASH");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const input: RecordPaymentInput = {
        partyId,
        amount: Number(amount),
        paymentDate,
        paymentMode,
        invoiceId: invoiceId || null,
        invoiceNumber: invoiceNumber || null,
        referenceNumber: referenceNumber || undefined,
        notes: notes || undefined,
        idempotencyKey: idempotencyKeyRef.current,
      };
      await recordPartyPayment(input, createdBy);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
    >
      <h3 className="text-sm font-semibold text-slate-900">
        <T>Record payment</T>
      </h3>
      {invoiceNumber ? (
        <p className="text-xs text-slate-500">
          <T>Invoice</T>: {invoiceNumber}
        </p>
      ) : (
        <p className="text-xs text-amber-700">
          <T>Unallocated payment</T>
        </p>
      )}

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
          <T>Payment date</T>
          <input
            type="date"
            required
            className={`${fieldClass} mt-1`}
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
          />
        </label>
        <label className="block text-xs font-medium text-slate-600">
          <T>Payment mode</T>
          <select
            className={`${fieldClass} mt-1`}
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
          >
            {PAYMENT_MODES.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_MODE_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-slate-600">
          <T>Reference</T>
          <input
            className={`${fieldClass} mt-1`}
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="UTR / Cheque no."
          />
        </label>
      </div>
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
          {busy ? <T>Saving…</T> : <T>Save payment</T>}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700"
          >
            <T>Cancel</T>
          </button>
        )}
      </div>
    </form>
  );
}
