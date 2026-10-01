"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { T } from "@/i18n";
import type { LedgerType } from "@/modules/financial/ledger";
import { formatLedgerRupee } from "@/modules/financial/ledger";
import {
  fetchOutstandingReport,
  type OutstandingReport,
  type PartyOutstandingRow,
} from "@/modules/financial/outstanding";
import EmptyState from "@/components/shared/EmptyState";
import Loading from "@/components/shared/Loading";
import { RefreshCw, MessageCircle, X } from "lucide-react";
import { MessageComposePanel } from "@/modules/financial/communication/components/MessageComposePanel";
import { fetchPartyById } from "@/modules/parties";

type Props = {
  /** Initial ledger type; user can switch in-page */
  initialLedgerType?: LedgerType;
  /** When true, hide Tax|Other toggle (legacy single-type pages) */
  fixedLedgerType?: LedgerType;
  title?: string;
  subtitle?: string;
};

/**
 * Unified outstanding report — Tax Invoice | Other Order in one screen.
 * Card list (mobile-friendly); messaging via sheet.
 */
export function OutstandingReportView({
  initialLedgerType = "TAX_INVOICE",
  fixedLedgerType,
  title,
  subtitle,
}: Props) {
  const [ledgerType, setLedgerType] = useState<LedgerType>(
    fixedLedgerType || initialLedgerType
  );
  const [report, setReport] = useState<OutstandingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [hideZero, setHideZero] = useState(true);
  const [msgParty, setMsgParty] = useState<PartyOutstandingRow | null>(null);
  const [msgPhone, setMsgPhone] = useState<string | null>(null);

  const activeType = fixedLedgerType || ledgerType;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setReport(await fetchOutstandingReport(activeType, { hideZero }));
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to load report");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [activeType, hideZero]);

  useEffect(() => {
    load();
  }, [load]);

  const openMessage = async (row: PartyOutstandingRow) => {
    setMsgParty(row);
    setMsgPhone(null);
    try {
      const p = await fetchPartyById(row.partyId);
      setMsgPhone(
        p?.whatsappNumber || p?.contactNumber || p?.phone || null
      );
    } catch {
      setMsgPhone(null);
    }
  };

  const rows =
    report?.rows.filter((r) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const hay = [r.partyName, r.shopName, r.city, r.partyIdCustom, r.partyId]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    }) ?? [];

  const heading =
    title ||
    (fixedLedgerType
      ? fixedLedgerType === "TAX_INVOICE"
        ? "Tax Invoice Outstanding"
        : "Other Order Outstanding"
      : "Outstanding");

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-8">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900">
            <T>{heading}</T>
          </h1>
          {subtitle ? (
            <p className="text-xs text-slate-500 mt-0.5">
              <T>{subtitle}</T>
            </p>
          ) : (
            <p className="text-xs text-slate-500 mt-0.5">
              <T>One ledger at a time — never combined</T>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="shrink-0 p-2 rounded-xl border border-slate-200 bg-white text-slate-600"
          aria-label="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {!fixedLedgerType && (
        <div className="flex rounded-xl bg-slate-100 p-1 gap-1">
          <button
            type="button"
            onClick={() => setLedgerType("TAX_INVOICE")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
              ledgerType === "TAX_INVOICE"
                ? "bg-[#330066] text-white shadow-sm"
                : "text-slate-600"
            }`}
          >
            <T>Tax Invoice</T>
          </button>
          <button
            type="button"
            onClick={() => setLedgerType("OTHER_ORDER")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
              ledgerType === "OTHER_ORDER"
                ? "bg-[#330066] text-white shadow-sm"
                : "text-slate-600"
            }`}
          >
            <T>Other Order</T>
          </button>
        </div>
      )}

      {/* Hero total due */}
      <div className="rounded-2xl bg-[#330066]/[0.06] border border-[#330066]/10 px-4 py-4">
        <p className="text-xs font-medium text-slate-500">
          <T>Total due</T>
        </p>
        <p className="text-2xl sm:text-3xl font-bold text-[#330066] tabular-nums mt-0.5">
          {formatLedgerRupee(report?.totalPositiveOutstanding ?? 0)}
        </p>
        <p className="text-[11px] text-slate-500 mt-1.5">
          {report?.partyCount ?? 0} <T>parties</T>
          {" · "}
          <button
            type="button"
            onClick={() => setHideZero((v) => !v)}
            className="underline-offset-2 hover:underline"
          >
            {hideZero ? <T>Hide zero</T> : <T>Show zero</T>} ✓
          </button>
        </p>
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search party…"
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#330066]/20"
      />

      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {loading ? (
        <Loading label="Loading outstanding…" />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No outstanding parties"
          description="Parties with a non-zero balance for this ledger will appear here."
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.partyId}
              className="rounded-xl border border-slate-200 bg-white px-3 py-3 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <Link
                  href={`/admin/parties/${r.partyId}/ledger`}
                  prefetch={false}
                  className="text-sm font-semibold text-[#330066] hover:underline truncate block"
                >
                  {r.partyName}
                </Link>
                <p className="text-xs text-slate-500 truncate">
                  {[r.shopName, r.city].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p
                  className={`text-sm font-bold tabular-nums ${
                    r.outstanding > 0
                      ? "text-violet-800"
                      : r.outstanding < 0
                        ? "text-emerald-700"
                        : "text-slate-500"
                  }`}
                >
                  {formatLedgerRupee(r.outstanding)}
                </p>
                <p className="text-[10px] text-slate-400">
                  <T>Due</T>
                </p>
              </div>
              <button
                type="button"
                onClick={() => openMessage(r)}
                className="shrink-0 p-2 rounded-full text-green-700 bg-green-50 hover:bg-green-100"
                title="WhatsApp"
                aria-label="Message"
              >
                <MessageCircle className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Message sheet */}
      {msgParty && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
            onClick={() => setMsgParty(null)}
          />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-bold text-slate-900 truncate pr-2">
                <T>Message</T> — {msgParty.partyName}
              </p>
              <button
                type="button"
                onClick={() => setMsgParty(null)}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <MessageComposePanel
              title={`Message — ${msgParty.partyName}`}
              templateId={
                activeType === "TAX_INVOICE"
                  ? "OUTSTANDING_TAX_INVOICE"
                  : "OUTSTANDING_OTHER_ORDER"
              }
              phone={msgPhone}
              vars={{
                partyName: msgParty.partyName,
                amount: msgParty.outstanding,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
