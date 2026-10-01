/**
 * Pure GST calculation engine.
 * No Firestore, React, or UI dependencies.
 */

import { isIntraState, isZeroTaxTaxability, halfGstRate, roundMoney } from "./taxLogic";
import { validateGstCalcInput } from "./taxValidation";
import type { GstCalcInput, GstCalcResult } from "./taxTypes";

/**
 * Calculate GST split for a single line / amount.
 *
 * - TAXABLE + same state → CGST + SGST (each half rate)
 * - TAXABLE + different state → IGST (full rate)
 * - EXEMPT / NIL_RATED / NON_GST → all tax zero
 */
export function calculateGst(input: GstCalcInput): GstCalcResult {
  validateGstCalcInput(input);

  const taxableAmount = roundMoney(input.taxableAmount);
  const taxability = input.taxability;
  const zeroTax = isZeroTaxTaxability(taxability) || input.gstRate === 0;
  const gstRate = zeroTax ? 0 : input.gstRate;
  const intra = isIntraState(input.supplierState, input.recipientState);

  if (zeroTax || taxableAmount === 0) {
    return {
      taxableAmount,
      gstRate: 0,
      taxability,
      isIntraState: intra,
      cgstRate: 0,
      cgstAmount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      igstRate: 0,
      igstAmount: 0,
      totalTax: 0,
      totalAmount: taxableAmount,
    };
  }

  if (intra) {
    const half = halfGstRate(gstRate);
    const cgstAmount = roundMoney((taxableAmount * half) / 100);
    const sgstAmount = roundMoney((taxableAmount * half) / 100);
    const totalTax = roundMoney(cgstAmount + sgstAmount);
    return {
      taxableAmount,
      gstRate,
      taxability,
      isIntraState: true,
      cgstRate: half,
      cgstAmount,
      sgstRate: half,
      sgstAmount,
      igstRate: 0,
      igstAmount: 0,
      totalTax,
      totalAmount: roundMoney(taxableAmount + totalTax),
    };
  }

  const igstAmount = roundMoney((taxableAmount * gstRate) / 100);
  return {
    taxableAmount,
    gstRate,
    taxability,
    isIntraState: false,
    cgstRate: 0,
    cgstAmount: 0,
    sgstRate: 0,
    sgstAmount: 0,
    igstRate: gstRate,
    igstAmount,
    totalTax: igstAmount,
    totalAmount: roundMoney(taxableAmount + igstAmount),
  };
}

/** Sum multiple line results (e.g. invoice lines) with consistent rounding. */
export function sumGstResults(lines: GstCalcResult[]): GstCalcResult {
  if (lines.length === 0) {
    return {
      taxableAmount: 0,
      gstRate: 0,
      taxability: "NON_GST",
      isIntraState: true,
      cgstRate: 0,
      cgstAmount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      igstRate: 0,
      igstAmount: 0,
      totalTax: 0,
      totalAmount: 0,
    };
  }
  const taxableAmount = roundMoney(
    lines.reduce((s, l) => s + l.taxableAmount, 0)
  );
  const cgstAmount = roundMoney(lines.reduce((s, l) => s + l.cgstAmount, 0));
  const sgstAmount = roundMoney(lines.reduce((s, l) => s + l.sgstAmount, 0));
  const igstAmount = roundMoney(lines.reduce((s, l) => s + l.igstAmount, 0));
  const totalTax = roundMoney(cgstAmount + sgstAmount + igstAmount);
  const intra = lines.every((l) => l.isIntraState);
  // Rate on totals is informational only when mixed rates — leave 0 if mixed
  const rates = new Set(lines.map((l) => l.gstRate));
  const gstRate = rates.size === 1 ? lines[0].gstRate : 0;
  return {
    taxableAmount,
    gstRate,
    taxability: lines.every((l) => l.taxability === lines[0].taxability)
      ? lines[0].taxability
      : "TAXABLE",
    isIntraState: intra,
    cgstRate: intra && gstRate ? halfGstRate(gstRate) : 0,
    cgstAmount,
    sgstRate: intra && gstRate ? halfGstRate(gstRate) : 0,
    sgstAmount,
    igstRate: !intra && gstRate ? gstRate : 0,
    igstAmount,
    totalTax,
    totalAmount: roundMoney(taxableAmount + totalTax),
  };
}
