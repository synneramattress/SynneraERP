import type {
  Invoice,
  InvoiceDraftWrite,
  InvoiceItem,
  InvoiceStatus,
  InvoiceType,
} from "./invoiceTypes";
import { INVOICE_TYPES } from "./invoiceDefinitions";
import {
  canTransitionInvoiceStatus,
  isValidFinancialYearLabel,
} from "./invoiceLogic";
import { roundMoney } from "../tax/taxLogic";
import { calculateInvoiceTotals } from "./utils/invoiceTotals";
import type { GstAmountType } from "../tax/amountType";

export type ValidationResult = { valid: boolean; errors: string[] };

function requireNonEmpty(
  v: string | undefined | null,
  label: string,
  errors: string[]
) {
  if (!v || !String(v).trim()) errors.push(`${label} is required.`);
}

function moneyEq(a: number, b: number): boolean {
  return roundMoney(a) === roundMoney(b);
}

export function validateInvoiceItem(item: InvoiceItem, index: number): string[] {
  const errors: string[] = [];
  const p = `Item ${index + 1}`;
  if (item.sourceType !== "ORDER_MATTRESS" && item.sourceType !== "PRODUCT_MASTER") {
    errors.push(`${p}: invalid source type.`);
  }
  if (item.sourceType === "ORDER_MATTRESS" && !item.orderItemId) {
    errors.push(`${p}: order item reference is required for mattress lines.`);
  }
  if (item.sourceType === "PRODUCT_MASTER" && !item.productId) {
    errors.push(`${p}: product id is required for product lines.`);
  }
  if (!item.description?.trim()) errors.push(`${p}: description is required.`);
  if (!(item.quantity > 0)) errors.push(`${p}: quantity must be positive.`);
  if (item.rate < 0) errors.push(`${p}: rate cannot be negative.`);
  if (item.lineAmount < 0) errors.push(`${p}: line amount cannot be negative.`);
  if (item.discountAmount < 0) errors.push(`${p}: discount cannot be negative.`);
  if (item.taxableAmount < 0) errors.push(`${p}: taxable amount cannot be negative.`);
  if (item.gst) {
    if (item.gst.cgstAmount < 0 || item.gst.sgstAmount < 0 || item.gst.igstAmount < 0) {
      errors.push(`${p}: GST amounts cannot be negative.`);
    }
    if (item.gst.totalTax < 0) errors.push(`${p}: total tax cannot be negative.`);
    if (item.gst.taxability === "TAXABLE") {
      if (!item.gst.hsnSacCode?.trim()) {
        errors.push(`${p}: HSN/SAC required for taxable items.`);
      }
      if (item.gst.gstRate == null || item.gst.gstRate < 0) {
        errors.push(`${p}: GST rate required for taxable items.`);
      }
    }
    const sumTax = roundMoney(
      item.gst.cgstAmount + item.gst.sgstAmount + item.gst.igstAmount
    );
    if (sumTax !== roundMoney(item.gst.totalTax)) {
      errors.push(`${p}: GST component sum does not match total tax.`);
    }
  } else {
    errors.push(`${p}: GST breakdown is required.`);
  }
  return errors;
}

/**
 * Validate draft totals against calculateInvoiceTotals (single source of truth).
 * Line taxableAmount stays pre–invoice-discount; invoice taxable can be lower.
 */
export function validateInvoiceDraft(
  draft: InvoiceDraftWrite | Invoice
): ValidationResult {
  const errors: string[] = [];
  if (!INVOICE_TYPES.includes(draft.invoiceType)) {
    errors.push("Invalid invoice type.");
  }
  requireNonEmpty(draft.invoiceDate, "Invoice date", errors);
  if (draft.invoiceDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.invoiceDate)) {
      errors.push("Invoice date must be YYYY-MM-DD.");
    } else {
      const [yy, mm, dd] = draft.invoiceDate.split("-").map(Number);
      const dt = new Date(Date.UTC(yy, mm - 1, dd));
      if (
        dt.getUTCFullYear() !== yy ||
        dt.getUTCMonth() !== mm - 1 ||
        dt.getUTCDate() !== dd
      ) {
        errors.push("Invoice date is not a valid calendar date.");
      }
    }
  }
  requireNonEmpty(draft.supplierSnapshot?.legalName, "Supplier name", errors);
  requireNonEmpty(draft.supplierSnapshot?.gstin, "Supplier GSTIN", errors);
  requireNonEmpty(draft.recipientSnapshot?.name, "Recipient name", errors);
  requireNonEmpty(draft.placeOfSupply, "Place of supply", errors);

  if (draft.invoiceType === "B2B") {
    requireNonEmpty(draft.recipientSnapshot?.gstin, "Recipient GSTIN (B2B)", errors);
  }

  if (!draft.items?.length) {
    errors.push("Invoice must have at least one item.");
  } else {
    draft.items.forEach((it, i) => errors.push(...validateInvoiceItem(it, i)));
  }

  const hasMattress = (draft.items || []).some(
    (i) => i.sourceType === "ORDER_MATTRESS"
  );
  if (hasMattress && !draft.orderId) {
    errors.push("orderId is required when invoice contains mattress lines.");
  }

  if (draft.subtotal < 0 || draft.discount < 0 || draft.taxableAmount < 0) {
    errors.push("Subtotal, discount and taxable amount cannot be negative.");
  }
  if (draft.gst) {
    if (
      draft.gst.cgstAmount < 0 ||
      draft.gst.sgstAmount < 0 ||
      draft.gst.igstAmount < 0 ||
      draft.gst.totalTax < 0
    ) {
      errors.push("Invoice GST totals cannot be negative.");
    }
  }
  if (draft.grandTotal < 0) errors.push("Grand total cannot be negative.");

  // Invoice-level totals must match central calculator (handles discount + amountType)
  if (draft.items?.length) {
    const amountType: GstAmountType =
      draft.amountType === "INCLUSIVE" ? "INCLUSIVE" : "EXCLUSIVE";
    const expected = calculateInvoiceTotals(
      draft.items,
      Number(draft.discount) || 0,
      amountType
    );

    if (!moneyEq(draft.subtotal, expected.subtotal)) {
      errors.push("Invoice subtotal does not match line amounts.");
    }
    if (!moneyEq(draft.discount, expected.discount)) {
      errors.push("Invoice discount does not match applied discount.");
    }
    if (!moneyEq(draft.taxableAmount, expected.taxableAmount)) {
      errors.push(
        "Invoice taxable amount does not match discounted taxable total."
      );
    }
    if (!moneyEq(draft.gst?.totalTax || 0, expected.gst.totalTax)) {
      errors.push("Invoice tax total does not match discounted GST total.");
    }
    if (!moneyEq(draft.gst?.cgstAmount || 0, expected.gst.cgstAmount)) {
      errors.push("Invoice CGST does not match expected CGST.");
    }
    if (!moneyEq(draft.gst?.sgstAmount || 0, expected.gst.sgstAmount)) {
      errors.push("Invoice SGST does not match expected SGST.");
    }
    if (!moneyEq(draft.gst?.igstAmount || 0, expected.gst.igstAmount)) {
      errors.push("Invoice IGST does not match expected IGST.");
    }
    if (!moneyEq(draft.grandTotal, expected.grandTotal)) {
      errors.push("Grand total does not match taxable amount plus tax.");
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateIssue(invoice: Invoice): ValidationResult {
  const base = validateInvoiceDraft(invoice);
  const errors = [...base.errors];
  if (invoice.status !== "DRAFT") {
    errors.push("Only DRAFT invoices can be issued.");
  }
  if (invoice.financialYear && !isValidFinancialYearLabel(invoice.financialYear)) {
    errors.push("Invalid financial year.");
  }
  return { valid: errors.length === 0, errors };
}

export function validateCancel(
  invoice: Invoice,
  reason: string | undefined
): ValidationResult {
  const errors: string[] = [];
  if (invoice.status !== "ISSUED") {
    errors.push("Only ISSUED invoices can be cancelled.");
  }
  if (!canTransitionInvoiceStatus(invoice.status, "CANCELLED")) {
    errors.push("Invalid status transition.");
  }
  requireNonEmpty(reason, "Cancellation reason", errors);
  return { valid: errors.length === 0, errors };
}

export function assertStatusTransition(from: InvoiceStatus, to: InvoiceStatus): void {
  if (!canTransitionInvoiceStatus(from, to)) {
    throw new Error(`Cannot transition invoice from ${from} to ${to}.`);
  }
}

export function isValidInvoiceType(v: string): v is InvoiceType {
  return (INVOICE_TYPES as string[]).includes(v);
}
