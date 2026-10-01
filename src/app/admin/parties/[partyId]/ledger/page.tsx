"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BookOpen, FileText } from "lucide-react";
import { T } from "@/i18n";
import { useAuth } from "@/context/AuthContext";
import { PartyLedgerPanel } from "@/modules/financial/ledger/components/PartyLedgerPanel";
import { StatementView } from "@/modules/financial/statements/components/StatementView";
import {
  canAccessPartyFinancials,
  canWriteLedger,
  type LedgerType,
} from "@/modules/financial/ledger";
import { fetchPartyById, partyDisplayName } from "@/modules/parties";

type ViewMode = "LEDGER" | "STATEMENT";

export default function PartyLedgerPage() {
  const params = useParams();
  const partyId = typeof params?.partyId === "string" ? params.partyId : "";
  const { user } = useAuth();
  const role = user?.role;
  const [ledgerTab, setLedgerTab] = useState<LedgerType>("TAX_INVOICE");
  const [viewMode, setViewMode] = useState<ViewMode>("LEDGER");
  const [partyLabel, setPartyLabel] = useState("");

  useEffect(() => {
    if (!partyId) return;
    let cancelled = false;
    fetchPartyById(partyId)
      .then((p) => {
        if (cancelled || !p) return;
        setPartyLabel(
          partyDisplayName(p) || p.name || p.shopName || p.email || partyId
        );
      })
      .catch(() => {
        if (!cancelled) setPartyLabel(partyId);
      });
    return () => {
      cancelled = true;
    };
  }, [partyId]);

  if (!canAccessPartyFinancials(role)) {
    return (
      <div className="max-w-lg mx-auto p-6 text-sm text-rose-700 bg-rose-50 rounded-xl border border-rose-200">
        You do not have access to party financial ledgers.
      </div>
    );
  }

  const writeUid = canWriteLedger(role) ? user?.uid : undefined;

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-8">
      <div className="flex items-start gap-2 min-w-0">
        <Link
          href={`/admin/parties/${partyId}`}
          className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shrink-0"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </Link>
        <div className="min-w-0 pt-0.5">
          <h1 className="text-lg font-bold text-slate-900 truncate">
            <T>Party Ledger</T>
          </h1>
          {partyLabel ? (
            <p className="text-xs text-slate-500 truncate">{partyLabel}</p>
          ) : null}
        </div>
      </div>

      <div className="flex rounded-xl bg-slate-100 p-1 gap-1">
        <button
          type="button"
          onClick={() => setViewMode("LEDGER")}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition ${
            viewMode === "LEDGER"
              ? "bg-white text-[#330066] shadow-sm"
              : "text-slate-600"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <T>Ledger</T>
        </button>
        <button
          type="button"
          onClick={() => setViewMode("STATEMENT")}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition ${
            viewMode === "STATEMENT"
              ? "bg-white text-[#330066] shadow-sm"
              : "text-slate-600"
          }`}
        >
          <FileText className="w-4 h-4" />
          <T>Statement</T>
        </button>
      </div>

      <div className="flex rounded-xl bg-slate-100 p-1 gap-1">
        <button
          type="button"
          onClick={() => setLedgerTab("TAX_INVOICE")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
            ledgerTab === "TAX_INVOICE"
              ? "bg-[#330066] text-white shadow-sm"
              : "text-slate-600"
          }`}
        >
          <T>Tax Invoice</T>
        </button>
        <button
          type="button"
          onClick={() => setLedgerTab("OTHER_ORDER")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
            ledgerTab === "OTHER_ORDER"
              ? "bg-[#330066] text-white shadow-sm"
              : "text-slate-600"
          }`}
        >
          <T>Other Order</T>
        </button>
      </div>

      {viewMode === "LEDGER" ? (
        <PartyLedgerPanel
          partyId={partyId}
          ledgerType={ledgerTab}
          createdBy={writeUid}
        />
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            <T>Statement</T>
            {" · "}
            {ledgerTab === "TAX_INVOICE" ? (
              <T>Tax Invoice</T>
            ) : (
              <T>Other Order</T>
            )}
            {" · "}
            <T>View PDF uses in-app viewer</T>
          </p>
          <StatementView partyId={partyId} ledgerType={ledgerTab} />
        </div>
      )}
    </div>
  );
}
