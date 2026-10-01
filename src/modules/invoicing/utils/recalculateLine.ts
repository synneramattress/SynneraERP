/**
 * Rebuild PRODUCT_MASTER line amounts using Phase 2 calculateGst + amount type.
 */

import { calculateGst } from "../../tax/gstCalculator";
import { roundMoney } from "../../tax/taxLogic";
import { toTaxableAmount, type GstAmountType } from "../../tax/amountType";
import type { InvoiceItem } from "../invoiceTypes";

export function recalculateProductMasterLine(
  item: InvoiceItem,
  patch: { quantity?: number; rate?: number },
  states: {
    supplierState: string;
    recipientState: string;
    amountType?: GstAmountType;
  }
): InvoiceItem {
  if (item.sourceType !== "PRODUCT_MASTER") return item;

  const quantity = patch.quantity != null ? patch.quantity : item.quantity;
  const rate = patch.rate != null ? patch.rate : item.rate;
  if (!(quantity > 0) || rate < 0) return item;

  const entered = roundMoney(quantity * rate);
  const amountType = states.amountType || "EXCLUSIVE";
  const taxableAmount = toTaxableAmount({
    enteredAmount: entered,
    gstRate: item.gst.gstRate,
    taxability: item.gst.taxability,
    amountType,
  });

  const calc = calculateGst({
    taxableAmount,
    gstRate: item.gst.gstRate,
    taxability: item.gst.taxability,
    supplierState: states.supplierState,
    recipientState: states.recipientState,
  });

  return {
    ...item,
    quantity,
    rate: roundMoney(rate),
    lineAmount: entered,
    discountAmount: 0,
    taxableAmount: calc.taxableAmount,
    gst: {
      taxability: item.gst.taxability,
      hsnSacCode: item.gst.hsnSacCode,
      gstRate: calc.gstRate,
      cgstRate: calc.cgstRate,
      cgstAmount: calc.cgstAmount,
      sgstRate: calc.sgstRate,
      sgstAmount: calc.sgstAmount,
      igstRate: calc.igstRate,
      igstAmount: calc.igstAmount,
      totalTax: calc.totalTax,
    },
    lineTotal: calc.totalAmount,
  };
}
