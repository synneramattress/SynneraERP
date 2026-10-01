"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { T } from "@/i18n";
import {
  computeLedgerBalance,
  fetchLedgerEntries,
  formatLedgerRupee,
  postOpeningBalance,
  withRunningBalance,
  type LedgerEntry,
  type LedgerType,
} from "@/modules/financial/ledger";
import { RecordPaymentForm } from "@/modules/financial/payments/components/RecordPaymentForm";
import { ManualOtherOrderForm } from "@/modules/financial/ledger/components/ManualOtherOrderForm";
import EmptyState from "@/components/shared/EmptyState";
import Loading from "@/components/shared/Loading";
import { Plus, X, Wallet, Scale, PencilLine } from "lucide-react";

type Props = {
  partyId: string;
  ledgerType: LedgerType;
  createdBy?: string;
};

type SheetMode =
  | null
  | "MENU"
  | "OPENING"
  | "PAYMENT"
  | "MANUAL";

function formatShortDate(iso: string): { day: string; mon: string } {
  // Prefer YYYY-MM-DD
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  if (m) {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const mon = months[Math.max(0, Math.min(11, Number(m[2]) - 1))] || m[2];
    return { day: m[3], mon };
  }
  return { day: iso?.slice(0, 2) || "—", mon: "" };
}

/**
 * Simplified party ledger: hero outstanding, entry cards, + action sheet.
 * Tax Invoice and Other Order stay isolated via ledgerType prop.
 */
export function PartyLedgerPanel({ partyId, ledgerType, createdBy }: Props) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sheet, setSheet] = useState<SheetMode>(null);
  const [openingAmount, setOpeningAmount] = useState("");
  const [openingDir, setOpeningDir] = useState<"DEBIT" | "CREDIT">("DEBIT");
  const [openingDate, setOpeningDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!partyId) return;
    setLoading(true);
    setError("");
    try {
      setEntries(await fetchLedgerEntries(partyId, ledgerType));
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to load ledger");
    } finally {
      setLoading(false);
    }
  }, [partyId, ledgerType]);

  useEffect(() => {
    load();
  }, [load]);

  const balance = useMemo(
    () => computeLedgerBalance(partyId, ledgerType, entries),
    [partyId, ledgerType, entries]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      const hay = [
        e.description,
        e.reference,
        e.entryType,
        e.transactionDate,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [entries, search]);

  const rows = useMemo(() => withRunningBalance(filtered), [filtered]);

  const closeSheet = () => setSheet(null);

  const onFormSuccess = async () => {
    closeSheet();
    await load();
  };

  const saveOpening = async () => {
    if (!createdBy) return;
    setBusy(true);
    setError("");
    try {
      await postOpeningBalance(
        {
          partyId,
          ledgerType,
          amount: Number(openingAmount),
          direction: openingDir,
          transactionDate: openingDate,
        },
        createdBy
      );
      setOpeningAmount("");
      await onFormSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Opening balance failed");
    } finally {
      setBusy(false);
    }
  };

  const isTax = ledgerType === "TAX_INVOICE";

  return (
    <div className="space-y-4">
      {/* Hero outstanding */}
      <div className="rounded-2xl bg-[#330066]/[0.06] border border-[#330066]/10 px-4 py-4">
        <p className="text-xs font-medium text-slate-500">
          <T>Outstanding</T>
        </p>
        <p className="text-2xl sm:text-3xl font-bold text-[#330066] tabular-nums mt-0.5">
          {formatLedgerRupee(balance.outstanding)}
        </p>
        <p className="text-[11px] text-slate-500 mt-1.5">
          <T>Dr</T> {formatLedgerRupee(balance.totalDebit)}
          {" · "}
          <T>Cr</T> {formatLedgerRupee(balance.totalCredit)}
          {" · "}
          {balance.entryCount} <T>entries</T>
        </p>
      </div>

      {/* Search + actions */}
      <div className="flex items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search entries…"
          className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#330066]/20"
        />
        {createdBy ? (
          <button
            type="button"
            onClick={() => setSheet("MENU")}
            className="shrink-0 w-11 h-11 rounded-full bg-[#330066] text-white flex items-center justify-center shadow-sm"
            aria-label="Add entry"
          >
            <Plus className="w-5 h-5" />
          </button>
        ) : null}
      </div>

      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {/* Entry cards */}
      {loading ? (
        <Loading label="Loading ledger…" />
      ) : rows.length === 0 ? (
        <EmptyState
          title={
            isTax
              ? "No tax invoice ledger entries"
              : "No other-order entries"
          }
          description={
            isTax
              ? "Issued invoices and payments will appear here."
              : "Add a manual debit or credit for non-invoice transactions."
          }
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const { day, mon } = formatShortDate(r.transactionDate);
            const isDebit = r.direction === "DEBIT";
            return (
              <li
                key={r.id}
                className={`rounded-xl border border-slate-200 bg-white px-3 py-3 flex gap-3 items-start ${
                  r.isReversed ? "opacity-50" : ""
                }`}
              >
                <div className="shrink-0 w-11 text-center">
                  <p className="text-sm font-bold text-[#330066] leading-tight">
                    {day}
                  </p>
                  <p className="text-[10px] font-medium text-slate-500 uppercase">
                    {mon}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {r.description || r.entryType}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        isDebit
                          ? "bg-rose-50 text-rose-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {isDebit ? <T>Debit</T> : <T>Credit</T>}
                    </span>
                    {r.reference ? (
                      <span className="text-[11px] text-slate-500 truncate">
                        {r.reference}
                      </span>
                    ) : null}
                    {r.isReversed ? (
                      <span className="text-[10px] text-amber-700 font-medium">
                        <T>Reversed</T>
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`text-sm font-bold tabular-nums ${
                      isDebit ? "text-rose-700" : "text-emerald-700"
                    }`}
                  >
                    {formatLedgerRupee(r.amount)}
                  </p>
                  <p className="text-[11px] text-slate-500 tabular-nums mt-0.5">
                    <T>Balance</T> {formatLedgerRupee(r.runningBalance)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Action sheet */}
      {sheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
            onClick={closeSheet}
          />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-bold text-slate-900">
                {sheet === "MENU" && <T>Add entry</T>}
                {sheet === "OPENING" && <T>Opening balance</T>}
                {sheet === "PAYMENT" && <T>Record payment</T>}
                {sheet === "MANUAL" && <T>Add entry</T>}
              </p>
              <button
                type="button"
                onClick={closeSheet}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {sheet === "MENU" && (
              <div className="space-y-1">
                {isTax && (
                  <button
                    type="button"
                    onClick={() => setSheet("PAYMENT")}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 text-left"
                  >
                    <span className="w-10 h-10 rounded-full bg-[#330066]/10 text-[#330066] flex items-center justify-center">
                      <Wallet className="w-5 h-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">
                        <T>Record payment</T>
                      </span>
                      <span className="block text-xs text-slate-500">
                        <T>Credit on Tax Invoice Ledger</T>
                      </span>
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSheet("OPENING")}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 text-left"
                >
                  <span className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center">
                    <Scale className="w-5 h-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">
                      <T>Opening balance</T>
                    </span>
                    <span className="block text-xs text-slate-500">
                      <T>One-time starting balance</T>
                    </span>
                  </span>
                </button>
                {!isTax && (
                  <button
                    type="button"
                    onClick={() => setSheet("MANUAL")}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 text-left"
                  >
                    <span className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center">
                      <PencilLine className="w-5 h-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">
                        <T>Manual debit / credit</T>
                      </span>
                      <span className="block text-xs text-slate-500">
                        <T>Other Order only</T>
                      </span>
                    </span>
                  </button>
                )}
              </div>
            )}

            {sheet === "OPENING" && createdBy && (
              <div className="space-y-3">
                <label className="block text-xs font-medium text-slate-600">
                  <T>Amount</T>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={openingAmount}
                    onChange={(e) => setOpeningAmount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-600">
                  <T>Direction</T>
                  <select
                    value={openingDir}
                    onChange={(e) =>
                      setOpeningDir(e.target.value as "DEBIT" | "CREDIT")
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  >
                    <option value="DEBIT">Debit</option>
                    <option value="CREDIT">Credit</option>
                  </select>
                </label>
                <label className="block text-xs font-medium text-slate-600">
                  <T>Date</T>
                  <input
                    type="date"
                    value={openingDate}
                    onChange={(e) => setOpeningDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  />
                </label>
                <button
                  type="button"
                  disabled={busy || !openingAmount}
                  onClick={saveOpening}
                  className="w-full py-2.5 rounded-xl bg-[#330066] text-white text-sm font-bold disabled:opacity-50"
                >
                  {busy ? <T>Saving…</T> : <T>Save</T>}
                </button>
              </div>
            )}

            {sheet === "PAYMENT" && createdBy && (
              <RecordPaymentForm
                partyId={partyId}
                createdBy={createdBy}
                onSuccess={onFormSuccess}
                onCancel={closeSheet}
              />
            )}

            {sheet === "MANUAL" && createdBy && (
              <ManualOtherOrderForm
                partyId={partyId}
                createdBy={createdBy}
                onSuccess={onFormSuccess}
                onCancel={closeSheet}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
