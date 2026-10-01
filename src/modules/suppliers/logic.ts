/**
 * Suppliers pure helpers — no Firestore.
 */

import {
  SUPPLIER_STATUS_ACTIVE,
  SUPPLIER_STATUS_INACTIVE,
  SUPPLIER_TX_PAYMENT,
  SUPPLIER_TX_PURCHASE,
  SUPPLIER_TX_PURCHASE_RETURN,
} from "./supplierDefinitions";
import type {
  SupplierRecord,
  SupplierTransaction,
  SupplierWithBalance,
} from "./supplierTypes";

export function formatRupee(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "₹0";
  const rounded = Math.round(n * 100) / 100;
  const abs = Math.abs(rounded);
  const formatted = abs.toLocaleString("en-IN", {
    maximumFractionDigits: Number.isInteger(abs) ? 0 : 2,
    minimumFractionDigits: Number.isInteger(abs) ? 0 : 2,
  });
  return rounded < 0 ? `-₹${formatted}` : `₹${formatted}`;
}

export function isSupplierActive(s: Pick<SupplierRecord, "status">): boolean {
  const st = String(s.status || SUPPLIER_STATUS_ACTIVE).toUpperCase();
  return st !== SUPPLIER_STATUS_INACTIVE;
}

export function supplierDisplayName(s: SupplierRecord): string {
  return String(s.name || s.id || "Supplier").trim() || "Supplier";
}

export function sortSuppliersByName(rows: SupplierRecord[]): SupplierRecord[] {
  return [...rows].sort((a, b) =>
    supplierDisplayName(a).localeCompare(supplierDisplayName(b), undefined, {
      sensitivity: "base",
    })
  );
}

/** Current Due = Opening Balance + Purchases − Payments */
export function calcSupplierDue(
  openingBalance: number,
  transactions: Pick<SupplierTransaction, "type" | "amount">[]
): { currentDue: number; purchaseTotal: number; paymentTotal: number } {
  let purchaseTotal = 0;
  let paymentTotal = 0;
  for (const tx of transactions) {
    const amt = Number(tx.amount) || 0;
    if (tx.type === SUPPLIER_TX_PURCHASE) purchaseTotal += amt;
    else if (tx.type === SUPPLIER_TX_PAYMENT) paymentTotal += amt;
    else if (tx.type === SUPPLIER_TX_PURCHASE_RETURN) paymentTotal += amt; // return reduces due
  }
  const opening = Number(openingBalance) || 0;
  return {
    currentDue: opening + purchaseTotal - paymentTotal,
    purchaseTotal,
    paymentTotal,
  };
}

export function withBalance(
  supplier: SupplierRecord,
  transactions: SupplierTransaction[]
): SupplierWithBalance {
  const { currentDue, purchaseTotal, paymentTotal } = calcSupplierDue(
    supplier.openingBalance ?? 0,
    transactions
  );
  return {
    ...supplier,
    currentDue,
    purchaseTotal,
    paymentTotal,
  };
}

/** Newest first by date, then createdAt */
export function sortTransactionsNewestFirst(
  rows: SupplierTransaction[],
  toMs: (v: unknown) => number
): SupplierTransaction[] {
  return [...rows].sort((a, b) => {
    const da = toMs(a.date) || toMs(a.createdAt);
    const db = toMs(b.date) || toMs(b.createdAt);
    return db - da;
  });
}

export function validatePurchase(input: {
  billNumber?: string;
  amount?: number;
  date?: string;
}): string | null {
  if (!String(input.billNumber || "").trim()) return "Bill Number is required.";
  if (input.amount == null || Number.isNaN(Number(input.amount)))
    return "Purchase Amount is required.";
  if (Number(input.amount) <= 0) return "Amount must be greater than 0.";
  if (!String(input.date || "").trim()) return "Purchase Date is required.";
  return null;
}

export function validatePayment(input: {
  amount?: number;
  date?: string;
  currentDue?: number;
}): string | null {
  if (input.amount == null || Number.isNaN(Number(input.amount)))
    return "Payment Amount is required.";
  if (Number(input.amount) <= 0) return "Amount must be greater than 0.";
  if (!String(input.date || "").trim()) return "Payment Date is required.";
  const due = Number(input.currentDue);
  if (Number.isFinite(due) && Number(input.amount) > due + 0.001) {
    return "Payment amount cannot be greater than the current outstanding balance.";
  }
  return null;
}

export function todayISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateInput(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

/** Split total inclusive of GST into taxable + gst */
export function splitGstFromInclusiveTotal(
  totalInclusive: number,
  gstRatePercent: number
): { taxableAmount: number; gstAmount: number; totalAmount: number } {
  const total = Math.max(0, Number(totalInclusive) || 0);
  const rate = Math.max(0, Number(gstRatePercent) || 0);
  if (rate <= 0) {
    return { taxableAmount: total, gstAmount: 0, totalAmount: total };
  }
  const taxableAmount = Math.round((total / (1 + rate / 100)) * 100) / 100;
  const gstAmount = Math.round((total - taxableAmount) * 100) / 100;
  return { taxableAmount, gstAmount, totalAmount: total };
}

/** Build total from taxable + rate */
export function calcGstFromTaxable(
  taxable: number,
  gstRatePercent: number
): { taxableAmount: number; gstAmount: number; totalAmount: number } {
  const t = Math.max(0, Number(taxable) || 0);
  const rate = Math.max(0, Number(gstRatePercent) || 0);
  const gstAmount = Math.round(((t * rate) / 100) * 100) / 100;
  const totalAmount = Math.round((t + gstAmount) * 100) / 100;
  return { taxableAmount: t, gstAmount, totalAmount };
}

export function purchaseTypeLabel(t: string | null | undefined): string {
  const v = String(t || "").toLowerCase();
  if (v === "gst") return "GST Bill";
  if (v === "non_gst") return "Cash / Non-GST";
  return "";
}
