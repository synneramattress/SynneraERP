"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { T } from "@/i18n";
import {
  InvoiceStatusBadge,
  useInvoice,
  canIssueInvoice,
  canCancelInvoice,
  canEditInvoice,
  isInvoiceMutable,
  issueInvoice,
  cancelInvoice,
  IssueInvoiceDialog,
  CancelInvoiceDialog,
  InvoiceDocument,
  InvoicePrintActions,
} from "@/modules/invoicing";
import { useAuth } from "@/context/AuthContext";
import { RecordPaymentForm } from "@/modules/financial/payments/components/RecordPaymentForm";
import {
  fetchPaymentsForInvoice,
  sumPayments,
  type PaymentRecord,
} from "@/modules/financial/payments";

function money(n: number) {
  return `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function AdminInvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = typeof params?.invoiceId === "string" ? params.invoiceId : "";
  const { invoice, loading, error, reload } = useInvoice(invoiceId);
  const { user } = useAuth();
  const role = user?.role;

  const [issueOpen, setIssueOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  const loadPayments = useCallback(async () => {
    if (!invoiceId) {
      setPayments([]);
      return;
    }
    try {
      setPayments(await fetchPaymentsForInvoice(invoiceId));
    } catch (e) {
      console.error("[payments] load failed", e);
    }
  }, [invoiceId]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-slate-500">
        <T>Loading</T>…
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/invoices"
          className="inline-flex items-center gap-1 text-sm text-indigo-600"
        >
          <ArrowLeft className="h-4 w-4" />
          <T>Back to invoices</T>
        </Link>
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error || <T>Invoice not found</T>}
        </div>
      </div>
    );
  }

  const editable = canEditInvoice(role, invoice.status);
  const canIssue = canIssueInvoice(role) && invoice.status === "DRAFT";
  const canCancel = canCancelInvoice(role) && invoice.status === "ISSUED";


  const handleIssue = async () => {
    setBusy(true);
    setActionError("");
    try {
      await issueInvoice(invoice.id, { issuedBy: user?.uid });
      setIssueOpen(false);
      await reload();
    } catch (e) {
      console.error(e);
      setActionError(e instanceof Error ? e.message : "Failed to issue invoice.");
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async (reason: string) => {
    setBusy(true);
    setActionError("");
    try {
      await cancelInvoice(invoice.id, reason, { cancelledBy: user?.uid });
      setCancelOpen(false);
      await reload();
    } catch (e) {
      console.error(e);
      setActionError(e instanceof Error ? e.message : "Failed to cancel invoice.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/admin/invoices"
            className="mb-2 inline-flex items-center gap-1 text-sm text-indigo-600"
          >
            <ArrowLeft className="h-4 w-4" />
            <T>Back to invoices</T>
          </Link>
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-indigo-600" />
            <h1 className="text-xl font-semibold text-slate-900">
              {invoice.invoiceNumber || <T>Draft Invoice</T>}
            </h1>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            <T>Invoice date</T>: {invoice.invoiceDate || "—"} · {invoice.invoiceType}
            {invoice.orderNumber ? ` · ${invoice.orderNumber}` : ""}
            {invoice.amountType ? ` · ${invoice.amountType}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {editable && (
            <Link
              href={`/admin/invoices/new?edit=${invoice.id}`}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <T>Edit</T>
            </Link>
          )}
          {canIssue && (
            <button
              type="button"
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              onClick={() => {
                setActionError("");
                setIssueOpen(true);
              }}
            >
              <T>Issue Invoice</T>
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
              onClick={() => {
                setActionError("");
                setCancelOpen(true);
              }}
            >
              <T>Cancel Invoice</T>
            </button>
          )}
        </div>
      </div>

      <div className="print:hidden" data-print-hide="true">
        <InvoicePrintActions invoice={invoice} />
      </div>

      {invoice.status === "ISSUED" &&
        (invoice.partyId ||
          invoice.partyRef?.partyId ||
          invoice.recipientSnapshot?.partyId) && (
          <div className="space-y-3 print:hidden" data-print-hide="true">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-800">
                <T>Payments</T>
              </h2>
              {!showPaymentForm && (
                <button
                  type="button"
                  className="rounded-lg bg-[#330066] px-3 py-2 text-sm font-medium text-white"
                  onClick={() => setShowPaymentForm(true)}
                >
                  <T>Record payment</T>
                </button>
              )}
            </div>
            {payments.length > 0 && (
              <ul className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 text-sm">
                {payments.map((p) => (
                  <li key={p.id} className="px-3 py-2 flex justify-between gap-2">
                    <span>
                      {p.paymentNumber} · {p.paymentDate} · {p.paymentMode}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {money(p.amount)}
                    </span>
                  </li>
                ))}
                <li className="px-3 py-2 flex justify-between text-slate-600">
                  <span><T>Total paid</T></span>
                  <span className="font-semibold">{money(sumPayments(payments))}</span>
                </li>
              </ul>
            )}
            {showPaymentForm && user?.uid && (
              <RecordPaymentForm
                partyId={String(
                  invoice.partyId ||
                    invoice.partyRef?.partyId ||
                    invoice.recipientSnapshot?.partyId
                )}
                invoiceId={invoice.id}
                invoiceNumber={invoice.invoiceNumber}
                createdBy={user.uid}
                suggestedMax={Math.max(
                  0,
                  Number(invoice.grandTotal || 0) - sumPayments(payments)
                )}
                onSuccess={async () => {
                  setShowPaymentForm(false);
                  await loadPayments();
                }}
                onCancel={() => setShowPaymentForm(false)}
              />
            )}
          </div>
        )}


      <div className="rounded-xl border border-slate-200 overflow-hidden print:border-0">
        <InvoiceDocument invoice={invoice} />
      </div>

      {/* Compact metadata kept for admin context when not printing */}
      <div className="grid gap-4 md:grid-cols-2 print:hidden" data-print-hide="true">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">
            <T>Supplier</T>
          </h2>
          <p className="font-medium text-slate-900">
            {invoice.supplierSnapshot?.legalName}
          </p>
          <p className="text-sm text-slate-600">
            GSTIN: {invoice.supplierSnapshot?.gstin || "—"}
          </p>
          <p className="text-sm text-slate-500">
            {invoice.supplierSnapshot?.address?.line1}
            {invoice.supplierSnapshot?.address?.city
              ? `, ${invoice.supplierSnapshot.address.city}`
              : ""}
          </p>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">
            <T>Customer</T>
          </h2>
          <p className="font-medium text-slate-900">
            {invoice.recipientSnapshot?.name}
          </p>
          <p className="text-sm text-slate-600">
            GSTIN: {invoice.recipientSnapshot?.gstin || "—"}
          </p>
          <p className="text-sm text-slate-500">
            <T>Place of supply</T>: {invoice.placeOfSupply || "—"}
          </p>
        </section>
      </div>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2"><T>Description</T></th>
              <th className="px-3 py-2"><T>HSN / SAC</T></th>
              <th className="px-3 py-2 text-right"><T>Qty</T></th>
              <th className="px-3 py-2 text-right"><T>Rate</T></th>
              <th className="px-3 py-2 text-right"><T>Taxable Amount</T></th>
              <th className="px-3 py-2 text-right"><T>GST</T></th>
              <th className="px-3 py-2 text-right"><T>Total</T></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoice.items.map((it) => (
              <tr key={it.id}>
                <td className="px-3 py-2">
                  <div className="font-medium text-slate-900">{it.description}</div>
                  <div className="text-xs text-slate-400">{it.sourceType}</div>
                </td>
                <td className="px-3 py-2 text-slate-600">
                  {it.gst?.hsnSacCode || "—"}
                </td>
                <td className="px-3 py-2 text-right">{it.quantity}</td>
                <td className="px-3 py-2 text-right">{money(it.rate)}</td>
                <td className="px-3 py-2 text-right">{money(it.taxableAmount)}</td>
                <td className="px-3 py-2 text-right">
                  {money(it.gst?.totalTax || 0)}
                  <div className="text-xs text-slate-400">
                    {it.gst?.gstRate ?? 0}%
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  {money(it.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="ml-auto max-w-sm rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <div className="flex justify-between py-1">
          <span className="text-slate-500"><T>Subtotal</T></span>
          <span>{money(invoice.subtotal)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-slate-500"><T>Discount</T></span>
          <span>{money(invoice.discount)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-slate-500"><T>Taxable Amount</T></span>
          <span>{money(invoice.taxableAmount)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-slate-500"><T>CGST</T></span>
          <span>{money(invoice.gst?.cgstAmount || 0)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-slate-500"><T>SGST</T></span>
          <span>{money(invoice.gst?.sgstAmount || 0)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-slate-500"><T>IGST</T></span>
          <span>{money(invoice.gst?.igstAmount || 0)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 text-base font-semibold">
          <span><T>Grand Total</T></span>
          <span>{money(invoice.grandTotal)}</span>
        </div>
      </section>

      {invoice.status === "CANCELLED" && (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <p className="font-semibold"><T>Cancelled</T></p>
          {invoice.cancellationReason && (
            <p className="mt-1">
              <T>Cancellation Reason</T>: {invoice.cancellationReason}
            </p>
          )}
        </section>
      )}

      {!isInvoiceMutable(invoice.status) && (
        <p className="text-xs text-slate-400">
          <T>Issued invoices are immutable snapshots</T>
        </p>
      )}

      <IssueInvoiceDialog
        open={issueOpen}
        busy={busy}
        error={actionError}
        onConfirm={handleIssue}
        onClose={() => !busy && setIssueOpen(false)}
      />
      <CancelInvoiceDialog
        open={cancelOpen}
        busy={busy}
        error={actionError}
        onConfirm={handleCancel}
        onClose={() => !busy && setCancelOpen(false)}
      />
    </div>
  );
}
