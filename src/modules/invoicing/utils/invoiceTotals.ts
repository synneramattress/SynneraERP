import { roundMoney } from "../../tax/taxLogic";
import type { GstAmountType } from "../../tax/amountType";
import type { InvoiceItem, InvoiceGstTotals } from "../invoiceTypes";

export type InvoiceTotalsResult = {
  subtotal: number;
  discount: number;
  taxableAmount: number;
  gst: InvoiceGstTotals;
  grandTotal: number;
};

/** Sum line-level amounts only (no invoice-level discount). */
export function sumInvoiceItems(items: InvoiceItem[]): InvoiceTotalsResult {
  let subtotal = 0;
  let lineDiscount = 0;
  let taxableAmount = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  for (const it of items) {
    subtotal = roundMoney(subtotal + (it.lineAmount || 0));
    lineDiscount = roundMoney(lineDiscount + (it.discountAmount || 0));
    taxableAmount = roundMoney(taxableAmount + (it.taxableAmount || 0));
    cgstAmount = roundMoney(cgstAmount + (it.gst?.cgstAmount || 0));
    sgstAmount = roundMoney(sgstAmount + (it.gst?.sgstAmount || 0));
    igstAmount = roundMoney(igstAmount + (it.gst?.igstAmount || 0));
  }

  const totalTax = roundMoney(cgstAmount + sgstAmount + igstAmount);
  const grandTotal = roundMoney(taxableAmount + totalTax);

  return {
    subtotal,
    discount: lineDiscount,
    taxableAmount,
    gst: { cgstAmount, sgstAmount, igstAmount, totalTax },
    grandTotal,
  };
}

function scaleGst(gst: InvoiceGstTotals, ratio: number): InvoiceGstTotals {
  const cgstAmount = roundMoney(gst.cgstAmount * ratio);
  const sgstAmount = roundMoney(gst.sgstAmount * ratio);
  const igstAmount = roundMoney(gst.igstAmount * ratio);
  const totalTax = roundMoney(cgstAmount + sgstAmount + igstAmount);
  return { cgstAmount, sgstAmount, igstAmount, totalTax };
}

/**
 * Central invoice totals: authoritative line items + invoice-level discount.
 * - EXCLUSIVE: discount reduces taxable base; GST scaled to discounted taxable.
 * - INCLUSIVE: discount reduces gross (sum of inclusive line amounts); taxable/GST scaled;
 *   grand tracks remaining gross.
 * Never trust client-supplied subtotal/taxable/gst/grandTotal.
 */
export function calculateInvoiceTotals(
  items: InvoiceItem[],
  invoiceDiscount: number,
  amountType: GstAmountType = "EXCLUSIVE"
): InvoiceTotalsResult {
  const base = sumInvoiceItems(items);
  const rawDisc = Math.max(0, Number(invoiceDiscount) || 0);

  if (rawDisc <= 0 || items.length === 0) {
    return {
      subtotal: base.subtotal,
      discount: 0,
      taxableAmount: base.taxableAmount,
      gst: base.gst,
      grandTotal: base.grandTotal,
    };
  }

  if (amountType === "INCLUSIVE") {
    const grossBefore = base.subtotal;
    const disc = Math.min(rawDisc, Math.max(0, grossBefore));
    const grossAfter = roundMoney(Math.max(0, grossBefore - disc));
    const ratio = grossBefore > 0 ? grossAfter / grossBefore : 0;
    const taxableAmount = roundMoney(base.taxableAmount * ratio);
    const gst = scaleGst(base.gst, ratio);
    // Prefer remaining gross as grand when lines fully capture tax in lineAmount
    const grandTotal = roundMoney(taxableAmount + gst.totalTax);
    return {
      subtotal: base.subtotal,
      discount: disc,
      taxableAmount,
      gst,
      grandTotal,
    };
  }

  // EXCLUSIVE: discount off taxable; GST on discounted taxable (proportional)
  const taxableBefore = base.taxableAmount;
  const disc = Math.min(rawDisc, Math.max(0, taxableBefore));
  const taxableAmount = roundMoney(Math.max(0, taxableBefore - disc));
  const ratio = taxableBefore > 0 ? taxableAmount / taxableBefore : 0;
  const gst = scaleGst(base.gst, ratio);
  const grandTotal = roundMoney(taxableAmount + gst.totalTax);

  return {
    subtotal: base.subtotal,
    discount: disc,
    taxableAmount,
    gst,
    grandTotal,
  };
}
