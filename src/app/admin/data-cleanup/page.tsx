"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, ExternalLink, Loader2, ShieldCheck, Terminal } from "lucide-react";
import { T } from "@/i18n";
import { cleanupErrorMessage, executeClientCleanup, previewCleanup, CONFIRMATION_PHRASE } from "@/modules/dataCleanup";
import type { CleanupPreview, ClientCleanupResult } from "@/modules/dataCleanup/dataCleanupTypes";

const rows: Array<[keyof CleanupPreview["counts"], string]> = [
  ["orders", "Orders"], ["productionMattresses", "Production mattresses"], ["invoiceOrderLocks", "Invoice order locks"],
  ["parties", "Legacy parties"], ["customers", "Customers"], ["prospects", "Prospects"], ["salespersons", "Salesperson profiles"],
  ["partyUsers", "Party accounts"], ["salespersonUsers", "Salesperson accounts"], ["salesActivities", "Sales activities"],
  ["salesFollowUps", "Sales follow-ups"], ["salesConversionRequests", "Sales conversion requests"], ["salesCommissions", "Sales commissions"],
  ["retailFollowUps", "Retail follow-ups"], ["retailFollowUpConversations", "Retail conversations"], ["transportDetails", "Transport records"],
];

const financialRows: Array<[keyof CleanupPreview["counts"], string]> = [
  ["invoices", "Invoices"], ["payments", "Payments"], ["taxInvoiceLedgerEntries", "Tax Invoice Ledger entries"],
  ["otherOrderLedgerEntries", "Other Order Ledger entries"], ["financialAuditLogs", "Financial audit logs"],
];

export default function DataCleanupPage() {
  const [preview, setPreview] = useState<CleanupPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [result, setResult] = useState<ClientCleanupResult | null>(null);

  const scan = useCallback(async () => {
    setLoading(true); setError(null); setResult(null);
    try { setPreview(await previewCleanup()); }
    catch (err) { console.error("[DataCleanup] Spark scan failed", err); setPreview(null); setError(cleanupErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void scan(); }, [scan]);

  const runClientCleanup = async () => {
    if (!preview || confirmation !== CONFIRMATION_PHRASE) return;
    setRunning(true); setError(null);
    try { const r = await executeClientCleanup(preview); setResult(r); setConfirmation(""); setPreview(await previewCleanup()); }
    catch (err) { console.error("[DataCleanup] Spark client cleanup failed", err); setError(cleanupErrorMessage(err)); }
    finally { setRunning(false); }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900"><T>Test Data Cleanup</T></h1>
        <p className="mt-1 text-sm text-slate-500"><T>V2.15.42 Spark-compatible controlled cleanup.</T></p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex gap-3"><AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" /><div>
          <h2 className="font-semibold text-amber-900"><T>Two-step cleanup</T></h2>
          <p className="mt-1 text-sm leading-6 text-amber-900/90"><T>This version does not use Cloud Functions and does not require the Firebase Blaze plan. The PWA cleans only records allowed by your current Firestore rules. Financial records and Firebase Auth accounts are handled by the one-time Termux script.</T></p>
        </div></div>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex gap-3"><ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" /><div>
          <h2 className="font-semibold text-emerald-900"><T>Protected data</T></h2>
          <p className="mt-1 text-sm leading-6 text-emerald-900/90"><T>Suppliers and supplier transactions, company settings, rates, products, designs, costing, invoice terms, employees, counters, marketing master data and admin accounts are never touched.</T></p>
        </div></div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div className="flex items-center gap-3"><Database className="h-5 w-5 text-[#330066]" /><div><h2 className="font-semibold text-slate-900"><T>Testing data found</T></h2><p className="text-xs text-slate-500">{preview ? new Date(preview.generatedAt).toLocaleString() : ""}</p></div></div>
          <button type="button" onClick={() => void scan()} disabled={loading || running} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-60">{loading ? <><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Scanning…</> : <T>Scan again</T>}</button>
        </div>
        {loading && !preview ? <div className="flex min-h-32 items-center justify-center gap-3 p-6 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /><T>Scanning testing data…</T></div> : preview ? <div className="divide-y divide-slate-100">{rows.map(([key,label]) => <div key={key} className="flex items-center justify-between px-5 py-3 text-sm"><span className="text-slate-600"><T>{label}</T></span><span className="font-semibold tabular-nums text-slate-900">{preview.counts[key]}</span></div>)}</div> : null}
      </section>

      {preview && <section className="rounded-2xl border border-orange-200 bg-orange-50 p-5"><div className="flex items-start gap-3"><Terminal className="mt-0.5 h-5 w-5 text-orange-700" /><div className="flex-1"><h2 className="font-semibold text-orange-950"><T>Financial cleanup — Termux required</T></h2><p className="mt-1 text-sm text-orange-900"><T>Invoices, payments, both party ledgers, financial audit logs, notifications, FCM dispatch logs and Firebase Auth test accounts cannot be deleted by this PWA under the current rules. Run the included one-time Termux cleanup script after the client cleanup.</T></p><div className="mt-3 grid gap-2 sm:grid-cols-2">{financialRows.map(([key,label]) => <div key={key} className="rounded-xl bg-white/70 p-3 text-sm text-orange-950"><T>{label}</T>: <b><T>Termux only</T></b></div>)}<div className="rounded-xl bg-white/70 p-3 text-sm text-orange-950"><T>Notifications</T>: <b><T>Termux only</T></b></div><div className="rounded-xl bg-white/70 p-3 text-sm text-orange-950"><T>FCM dispatch logs</T>: <b><T>Termux only</T></b></div></div></div></div></section>}

      {preview && <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-900"><T>Protected data check</T></h2><div className="mt-3 grid gap-2 sm:grid-cols-2"><div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><T>Suppliers</T>: <b>{preview.counts.supplierCount}</b></div><div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><T>Supplier transactions</T>: <b>{preview.counts.supplierTransactionCount}</b></div><div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><T>Employees</T>: <b>{preview.counts.employeeCount}</b></div><div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><T>Admin accounts</T>: <b>{preview.counts.adminUserCount}</b></div></div></section>}

      {error && <div className="whitespace-pre-wrap rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><b><T>Cleanup error</T></b><div className="mt-2">{error}</div></div>}

      {preview && <section className="rounded-2xl border border-rose-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-900"><T>Remove PWA-cleanable testing data</T></h2><p className="mt-1 text-sm text-slate-500"><T>This does not remove invoices, payments, ledgers, notifications, FCM dispatch logs or Firebase Auth accounts. Those require the Termux step.</T></p><input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder={CONFIRMATION_PHRASE} autoComplete="off" className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#330066] focus:ring-2 focus:ring-[#330066]/10" /><button type="button" onClick={() => void runClientCleanup()} disabled={running || confirmation !== CONFIRMATION_PHRASE} className="mt-3 w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{running ? <><Loader2 className="mr-2 inline h-4 w-4 animate-spin" /><T>Cleaning PWA data…</T></> : <T>Delete PWA-cleanable Test Data</T>}</button></section>}

      {result && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900"><div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5" /><T>PWA cleanup completed</T></div><p className="mt-2">Cleanup ID: <b>{result.cleanupId}</b></p><p className="mt-1"><T>Now run the Termux script for financial records and Firebase Auth test users.</T></p></div>}

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><div className="flex items-start gap-3"><ExternalLink className="mt-0.5 h-5 w-5 text-slate-600" /><div><h2 className="font-semibold text-slate-900"><T>Termux cleanup files</T></h2><p className="mt-1 text-sm text-slate-600"><T>The project includes tools/termux-data-cleanup with a preview-first script. It uses Firebase Admin SDK from your Android device, not Cloud Functions, so Blaze is not required.</T></p></div></div></section>
    </div>
  );
}
