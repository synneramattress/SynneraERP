"use client";

import { T } from "@/i18n";
import type { InvoiceGstTotals } from "../invoiceTypes";

function money(n: number) {
  return `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function InvoiceTotals({
  subtotal,
  discount,
  taxableAmount,
  gst,
  grandTotal,
}: {
  subtotal: number;
  discount: number;
  taxableAmount: number;
  gst: InvoiceGstTotals;
  grandTotal: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm space-y-1.5 max-w-sm ml-auto">
      <div className="flex justify-between">
        <span className="text-slate-500"><T>Subtotal</T></span>
        <span>{money(subtotal)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-500"><T>Discount</T></span>
        <span>{money(discount)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-500"><T>Taxable Amount</T></span>
        <span>{money(taxableAmount)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-500"><T>CGST</T></span>
        <span>{money(gst.cgstAmount)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-500"><T>SGST</T></span>
        <span>{money(gst.sgstAmount)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-500"><T>IGST</T></span>
        <span>{money(gst.igstAmount)}</span>
      </div>
      <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-semibold">
        <span><T>Grand Total</T></span>
        <span>{money(grandTotal)}</span>
      </div>
    </div>
  );
}
