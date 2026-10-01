"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { T } from "@/i18n";
import type { LedgerType } from "@/modules/financial/ledger";
import { formatLedgerRupee } from "@/modules/financial/ledger";
import {
  currentFinancialYearLabel,
  fetchPartyStatement,
  listRecentFinancialYearLabels,
  periodForCustom,
  periodForFinancialYear,
  periodForMonth,
  type PartyStatement,
  type StatementPeriodKind,
} from "@/modules/financial/statements";
import Loading from "@/components/shared/Loading";
import {
  downloadStatementPdf,
  getStatementPdfBlob,
  statementPdfFilename,
} from "@/modules/financial/statements/pdf/statementPdfService";
import { InAppPdfViewer, usePdfViewer } from "@/components/pdf";
import { fetchPartyById, partyDisplayName } from "@/modules/parties";
import { Printer, Download } from "lucide-react";
import { MessageComposePanel } from "@/modules/financial/communication/components/MessageComposePanel";
import EmptyState from "@/components/shared/EmptyState";
import { SummaryStatusCards } from "@/components/shared/SummaryStatusCards";
import { IndianRupee } from "lucide-react";

type Props = {
  partyId: string;
  ledgerType: LedgerType;
  fyStartMonth?: number;
  fyStartDay?: number;
};

const fieldClass =
  "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#330066]/20";

export function StatementView({
  partyId,
  ledgerType,
  fyStartMonth = 4,
  fyStartDay = 1,
}: Props) {
  const pdfViewer = usePdfViewer();
  const fyOptions = useMemo(
    () => listRecentFinancialYearLabels(6, fyStartMonth, fyStartDay),
    [fyStartMonth, fyStartDay]
  );
  const [kind, setKind] = useState<StatementPeriodKind>("FINANCIAL_YEAR");
  const [fy, setFy] = useState(() =>
    currentFinancialYearLabel(fyStartMonth, fyStartDay)
  );
  const [month, setMonth] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
  });
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [statement, setStatement] = useState<PartyStatement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [partyMeta, setPartyMeta] = useState<{
    name: string;
    shopName?: string;
    city?: string;
    phone?: string;
  } | null>(null);


  const load = useCallback(async () => {
    if (!partyId) return;
    setLoading(true);
    setError("");
    try {
      let period;
      if (kind === "FINANCIAL_YEAR") {
        period = periodForFinancialYear(fy, fyStartMonth, fyStartDay);
      } else if (kind === "MONTH") {
        period = periodForMonth(month);
      } else {
        period = periodForCustom(customFrom, customTo);
      }
      const s = await fetchPartyStatement({
        partyId,
        ledgerType,
        period,
      });
      setStatement(s);
    } catch (e) {
      console.error(e);
      setStatement(null);
      setError(e instanceof Error ? e.message : "Failed to load statement");
    } finally {
      setLoading(false);
    }
  }, [
    partyId,
    ledgerType,
    kind,
    fy,
    month,
    customFrom,
    customTo,
    fyStartMonth,
    fyStartDay,
  ]);

  useEffect(() => {
    if (kind === "CUSTOM" && (!customFrom || !customTo)) {
      setStatement(null);
      return;
    }
    load();
  }, [load, kind, customFrom, customTo]);

  useEffect(() => {
    if (!partyId) return;
    fetchPartyById(partyId)
      .then((p) => {
        if (!p) {
          setPartyMeta(null);
          return;
        }
        setPartyMeta({
          name: partyDisplayName(p) || p.name || p.email || partyId,
          shopName: p.shopName || p.company,
          city: p.city,
          phone:
            p.whatsappNumber ||
            p.contactNumber ||
            p.phone ||
            undefined,
        });
      })
      .catch(() => setPartyMeta(null));
  }, [partyId]);

  const handleViewPdf = async () => {
    if (!statement) return;
    setPdfBusy(true);
    try {
      const blob = await getStatementPdfBlob(statement, {
        partyName: partyMeta?.name,
        shopName: partyMeta?.shopName,
        city: partyMeta?.city,
      });
      pdfViewer.openBlob(blob, {
        title: "Statement",
        fileName: statementPdfFilename(statement, partyMeta?.name),
      });
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "PDF failed");
    } finally {
      setPdfBusy(false);
    }
  };

  const handlePdf = async () => {
    if (!statement) return;
    setPdfBusy(true);
    try {
      await downloadStatementPdf(statement, {
        partyName: partyMeta?.name,
        shopName: partyMeta?.shopName,
        city: partyMeta?.city,
      });
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "PDF failed");
    } finally {
      setPdfBusy(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 flex-wrap">
        <label className="text-xs font-medium text-slate-600">
          <T>Period</T>
          <select
            className={`${fieldClass} mt-1 block min-w-[140px]`}
            value={kind}
            onChange={(e) => setKind(e.target.value as StatementPeriodKind)}
          >
            <option value="FINANCIAL_YEAR">Financial year</option>
            <option value="MONTH">Month</option>
            <option value="CUSTOM">Custom</option>
          </select>
        </label>

        {kind === "FINANCIAL_YEAR" && (
          <label className="text-xs font-medium text-slate-600">
            <T>Financial year</T>
            <select
              className={`${fieldClass} mt-1 block min-w-[140px]`}
              value={fy}
              onChange={(e) => setFy(e.target.value)}
            >
              {fyOptions.map((y) => (
                <option key={y} value={y}>
                  FY {y}
                </option>
              ))}
            </select>
          </label>
        )}

        {kind === "MONTH" && (
          <label className="text-xs font-medium text-slate-600">
            <T>Month</T>
            <input
              type="month"
              className={`${fieldClass} mt-1 block`}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </label>
        )}

        {kind === "CUSTOM" && (
          <>
            <label className="text-xs font-medium text-slate-600">
              <T>From date</T>
              <input
                type="date"
                className={`${fieldClass} mt-1 block`}
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
            </label>
            <label className="text-xs font-medium text-slate-600">
              <T>To date</T>
              <input
                type="date"
                className={`${fieldClass} mt-1 block`}
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </label>
          </>
        )}

        <button
          type="button"
          onClick={load}
          className="px-4 py-2 rounded-xl bg-[#330066] text-white text-sm font-semibold"
        >
          <T>Refresh</T>
        </button>
      </div>

      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {loading ? (
        <Loading label="Loading statement…" />
      ) : !statement ? (
        <EmptyState
          title="Select a period"
          description="Choose financial year, month, or custom dates."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">
                {statement.period.label}
              </span>
              <span className="text-slate-400"> · </span>
              {statement.period.dateFrom} → {statement.period.dateTo}
              <span className="text-slate-400"> · </span>
              {ledgerType === "TAX_INVOICE" ? (
                <T>Tax Invoice Ledger</T>
              ) : (
                <T>Other Order Ledger</T>
              )}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700"
              >
                <Printer className="w-4 h-4" />
                <T>Print</T>
              </button>
                      <button
          type="button"
          onClick={() => void handleViewPdf()}
          disabled={pdfBusy || !statement}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
        >
          <T>View PDF</T>
        </button>
<button
                type="button"
                onClick={handlePdf}
                disabled={pdfBusy}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#330066] text-white text-sm font-semibold disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {pdfBusy ? <T>Preparing…</T> : <T>Download PDF</T>}
              </button>
            </div>
          </div>

          {/* Print header (visible only when printing) */}
          <div className="hidden print:block mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              {partyMeta?.name || partyId} — Party Statement
            </h2>
            <p className="text-sm text-slate-600">
              {statement.period.label} ({statement.period.dateFrom} →{" "}
              {statement.period.dateTo}) ·{" "}
              {ledgerType === "TAX_INVOICE"
                ? "Tax Invoice Ledger"
                : "Other Order Ledger"}
            </p>
          </div>

          <SummaryStatusCards
            columns={4}
            items={[
              {
                key: "open",
                label: "Period opening",
                value: formatLedgerRupee(statement.periodOpeningBalance),
                icon: IndianRupee,
                bg: "bg-slate-50",
                text: "text-slate-700",
              },
              {
                key: "dr",
                label: "Period debit",
                value: formatLedgerRupee(statement.totalDebit),
                icon: IndianRupee,
                bg: "bg-rose-50",
                text: "text-rose-700",
              },
              {
                key: "cr",
                label: "Period credit",
                value: formatLedgerRupee(statement.totalCredit),
                icon: IndianRupee,
                bg: "bg-emerald-50",
                text: "text-emerald-700",
              },
              {
                key: "close",
                label: "Period closing",
                value: formatLedgerRupee(statement.periodClosingBalance),
                icon: IndianRupee,
                bg: "bg-violet-50",
                text: "text-violet-700",
              },
            ]}
          />

          <MessageComposePanel
            title="Statement message"
            templateId={
              ledgerType === "TAX_INVOICE"
                ? "STATEMENT_TAX_INVOICE"
                : "STATEMENT_OTHER_ORDER"
            }
            phone={partyMeta?.phone}
            vars={{
              partyName: partyMeta?.name,
              period: statement.period.label,
              opening: statement.periodOpeningBalance,
              debit: statement.totalDebit,
              credit: statement.totalCredit,
              closing: statement.periodClosingBalance,
            }}
          />

          {statement.lines.length === 0 ? (
            <EmptyState
              title="No transactions in this period"
              description="Opening and closing still reflect prior activity."
            />
          ) : (
            <div id="statement-print-root" className="overflow-x-auto rounded-xl border border-slate-200 bg-white print:border-0">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2"><T>Date</T></th>
                    <th className="px-3 py-2"><T>Particular</T></th>
                    <th className="px-3 py-2"><T>Reference</T></th>
                    <th className="px-3 py-2 text-right"><T>Debit</T></th>
                    <th className="px-3 py-2 text-right"><T>Credit</T></th>
                    <th className="px-3 py-2 text-right"><T>Balance</T></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-slate-50/80 font-medium">
                    <td className="px-3 py-2" colSpan={3}>
                      <T>Opening balance</T>
                    </td>
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatLedgerRupee(statement.periodOpeningBalance)}
                    </td>
                  </tr>
                  {statement.lines.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {r.transactionDate}
                      </td>
                      <td className="px-3 py-2">{r.description}</td>
                      <td className="px-3 py-2 text-slate-500">
                        {r.reference || "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-rose-700">
                        {r.direction === "DEBIT"
                          ? formatLedgerRupee(r.amount)
                          : ""}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-emerald-700">
                        {r.direction === "CREDIT"
                          ? formatLedgerRupee(r.amount)
                          : ""}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">
                        {formatLedgerRupee(r.runningBalance)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-violet-50/50 font-semibold">
                    <td className="px-3 py-2" colSpan={3}>
                      <T>Closing balance</T>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-rose-700">
                      {formatLedgerRupee(statement.totalDebit)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-emerald-700">
                      {formatLedgerRupee(statement.totalCredit)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatLedgerRupee(statement.periodClosingBalance)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );

      <InAppPdfViewer source={pdfViewer.source} title={pdfViewer.title} downloadFileName={pdfViewer.fileName} onClose={pdfViewer.close} />
}
