"use client";

/**
 * Read-only invoice document from stored snapshot.
 * No GST recalculation, no master data lookups.
 */

import type { Invoice } from "../invoiceTypes";
import { amountInWordsRupees } from "../utils/amountInWords";
import { formatInvoiceMoney } from "./formatMoney";
import { T } from "@/i18n";

function money(n: number) {
  return `₹${formatInvoiceMoney(n)}`;
}

export function InvoiceDocument({ invoice }: { invoice: Invoice }) {
  const supplier = invoice.supplierSnapshot;
  const recipient = invoice.recipientSnapshot;
  const gst = invoice.gst;
  const isIntra =
    (gst?.cgstAmount || 0) > 0 || (gst?.sgstAmount || 0) > 0;
  const items = invoice.items || [];

  return (
    <div
      id="invoice-document"
      className="invoice-document mx-auto max-w-[210mm] bg-white text-slate-900 shadow-sm print:shadow-none"
    >
      {/* Status banner */}
      {invoice.status !== "ISSUED" && (
        <div
          className={
            invoice.status === "CANCELLED"
              ? "bg-rose-600 px-4 py-1.5 text-center text-sm font-bold uppercase tracking-wide text-white"
              : "bg-amber-500 px-4 py-1.5 text-center text-sm font-bold uppercase tracking-wide text-white"
          }
        >
          {invoice.status === "CANCELLED" ? (
            <T>CANCELLED</T>
          ) : (
            <T>DRAFT</T>
          )}
        </div>
      )}

      <div className="space-y-4 p-6 print:p-4">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/synnera-logo.png"
              alt="Synnera"
              className="h-12 w-auto object-contain print:h-14"
              onError={(e) => {
                const el = e.currentTarget;
                if (el.dataset.fallback === "1") return;
                el.dataset.fallback = "1";
                el.src = "/synnera-icon-192.png";
              }}
            />
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                {supplier?.legalName || supplier?.tradeName || "—"}
              </h1>
              {supplier?.tradeName &&
                supplier.tradeName !== supplier.legalName && (
                  <p className="text-sm text-slate-600">{supplier.tradeName}</p>
                )}
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                {[
                  supplier?.address?.line1,
                  supplier?.address?.line2,
                  supplier?.address?.city,
                  supplier?.address?.state,
                  supplier?.address?.pincode,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              {supplier?.gstin && (
                <p className="text-xs text-slate-600">
                  <T>GSTIN</T>: {supplier.gstin}
                </p>
              )}
              {(supplier?.phone || supplier?.email) && (
                <p className="text-xs text-slate-500">
                  {[supplier.phone, supplier.email].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-base font-bold uppercase tracking-wide text-indigo-700">
              <T>TAX INVOICE</T>
            </p>
            {invoice.status === "ISSUED" && (
              <p className="text-xs font-semibold text-emerald-700">
                <T>ISSUED</T>
              </p>
            )}
          </div>
        </header>

        {/* Meta + customer */}
        <div className="grid gap-4 sm:grid-cols-2">
          <section>
            <h2 className="mb-1 text-xs font-semibold uppercase text-slate-500">
              <T>Invoice Details</T>
            </h2>
            <dl className="space-y-0.5 text-sm">
              <div className="flex gap-2">
                <dt className="text-slate-500"><T>Invoice Number</T>:</dt>
                <dd className="font-medium">
                  {invoice.invoiceNumber || <T>Draft</T>}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-slate-500"><T>Invoice Date</T>:</dt>
                <dd>{invoice.invoiceDate || "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-slate-500"><T>Type</T>:</dt>
                <dd>{invoice.invoiceType}</dd>
              </div>
              {invoice.amountType && (
                <div className="flex gap-2">
                  <dt className="text-slate-500"><T>GST Mode</T>:</dt>
                  <dd>
                    {invoice.amountType === "INCLUSIVE" ? (
                      <T>GST Inclusive</T>
                    ) : (
                      <T>GST Exclusive</T>
                    )}
                  </dd>
                </div>
              )}
              {invoice.orderNumber && (
                <div className="flex gap-2">
                  <dt className="text-slate-500"><T>Order number</T>:</dt>
                  <dd>{invoice.orderNumber}</dd>
                </div>
              )}
              {invoice.placeOfSupply && (
                <div className="flex gap-2">
                  <dt className="text-slate-500"><T>Place of supply</T>:</dt>
                  <dd>{invoice.placeOfSupply}</dd>
                </div>
              )}
            </dl>
          </section>
          <section>
            <h2 className="mb-1 text-xs font-semibold uppercase text-slate-500">
              <T>Bill To</T>
            </h2>
            <p className="text-sm font-semibold text-slate-900">
              {recipient?.name || "—"}
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              {[
                recipient?.address?.line1,
                recipient?.address?.line2,
                recipient?.address?.city,
                recipient?.address?.state,
                recipient?.address?.pincode,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
            {recipient?.gstin && (
              <p className="text-xs text-slate-600">
                <T>GSTIN</T>: {recipient.gstin}
              </p>
            )}
            {recipient?.mobile && (
              <p className="text-xs text-slate-500">{recipient.mobile}</p>
            )}
          </section>
        </div>

        {/* Items */}
        <section className="overflow-x-auto">
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-y border-slate-300 bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-500 sm:text-xs">
                <th className="px-2 py-2">#</th>
                <th className="px-2 py-2"><T>Description</T></th>
                <th className="px-2 py-2"><T>HSN / SAC</T></th>
                <th className="px-2 py-2 text-right"><T>Qty</T></th>
                <th className="px-2 py-2 text-right"><T>Rate</T></th>
                <th className="px-2 py-2 text-right"><T>Taxable Amount</T></th>
                <th className="px-2 py-2 text-right"><T>GST</T></th>
                <th className="px-2 py-2 text-right"><T>Total</T></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={it.id} className="border-b border-slate-100 align-top">
                  <td className="px-2 py-2 text-slate-500">{idx + 1}</td>
                  <td className="px-2 py-2">
                    <div className="font-medium text-slate-900">
                      {it.description}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-slate-600">
                    {it.gst?.hsnSacCode || "—"}
                  </td>
                  <td className="px-2 py-2 text-right">{it.quantity}</td>
                  <td className="px-2 py-2 text-right">{money(it.rate)}</td>
                  <td className="px-2 py-2 text-right">
                    {money(it.taxableAmount)}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {money(it.gst?.totalTax || 0)}
                    <div className="text-[10px] text-slate-400">
                      {it.gst?.gstRate ?? 0}%
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right font-medium">
                    {money(it.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Totals */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
          <div className="max-w-md text-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">
              <T>Amount in Words</T>
            </p>
            <p className="mt-1 font-medium text-slate-800">
              {amountInWordsRupees(invoice.grandTotal)}
            </p>
          </div>
          <div className="w-full max-w-xs space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500"><T>Subtotal</T></span>
              <span>{money(invoice.subtotal)}</span>
            </div>
            {(invoice.discount || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500"><T>Discount</T></span>
                <span>-{money(invoice.discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500"><T>Taxable Amount</T></span>
              <span>{money(invoice.taxableAmount)}</span>
            </div>
            {isIntra ? (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-500"><T>CGST</T></span>
                  <span>{money(gst?.cgstAmount || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500"><T>SGST</T></span>
                  <span>{money(gst?.sgstAmount || 0)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between">
                <span className="text-slate-500"><T>IGST</T></span>
                <span>{money(gst?.igstAmount || 0)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500"><T>Total GST</T></span>
              <span>{money(gst?.totalTax || 0)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
              <span><T>Grand Total</T></span>
              <span>{money(invoice.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Terms & Conditions (snapshot only) */}
        {(invoice.termsSnapshot || []).filter((t) => t.text?.trim()).length > 0 && (
          <section className="border-t border-slate-200 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              <T>Terms & Conditions</T>
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-slate-700">
              {(invoice.termsSnapshot || [])
                .filter((t) => t.text?.trim())
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((t) => (
                  <li key={t.id || t.sortOrder}>{t.text}</li>
                ))}
            </ol>
          </section>
        )}

        {/* Cancellation */}
        {invoice.status === "CANCELLED" && (
          <section className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            <p className="font-semibold"><T>CANCELLED</T></p>
            {invoice.cancellationReason && (
              <p className="mt-1">
                <T>Cancellation Reason</T>: {invoice.cancellationReason}
              </p>
            )}
          </section>
        )}

        {/* Footer */}
        <footer className="border-t border-slate-200 pt-4 text-xs text-slate-500">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <p>
              <T>Thank you for your business</T>
            </p>
            <div className="min-w-[160px] text-right">
              {supplier?.signatureImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={supplier.signatureImageUrl}
                  alt="Authorized signatory"
                  className="mb-1 ml-auto h-20 max-w-[200px] object-contain"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="mb-2 ml-auto h-12 w-40 border-b border-slate-300" />
              )}
              <p className="font-medium text-slate-700">
                {supplier?.authorizedSignatoryName ||
                  supplier?.legalName ||
                  "—"}
              </p>
              <p>
                <T>Authorized Signatory</T>
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
