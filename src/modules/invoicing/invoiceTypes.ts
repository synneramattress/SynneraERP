/**
 * Phase 3 — Invoice domain types.
 * Separate from Order; issued invoices are immutable snapshots.
 */

import type { Address } from "@/types/address";
import type { Taxability, GstAmountType } from "@/modules/tax";
import type { InvoiceTermSnapshot } from "./terms/termsTypes";

export type InvoiceSource = "PARTY" | "RETAIL";
export type InvoiceStatus = "DRAFT" | "ISSUED" | "CANCELLED";
export type InvoiceDocumentType = "TAX_INVOICE";
export type InvoiceType = "B2B" | "B2C";

/** Origin of a line item — never mix mattress Product Master selection */
export type InvoiceItemSourceType = "ORDER_MATTRESS" | "PRODUCT_MASTER";

export type InvoicePartyRef = {
  partyId?: string;
  customerId?: string;
  source: InvoiceSource;
};

/** Snapshotted supplier (Company) at issue time */
export interface InvoiceSupplierSnapshot {
  legalName: string;
  tradeName?: string;
  gstin: string;
  pan?: string;
  address: Address;
  phone?: string;
  email?: string;
  state: string;
  stateCode: string;
  /** Snapshotted combined signature+stamp (optimized data URL or path) */
  signatureImageUrl?: string;
  authorizedSignatoryName?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  ifsc?: string;
  branch?: string;
  upiId?: string;
  /** Optimized UPI QR image (data URL) */
  upiQrImageUrl?: string;
}

/** Snapshotted recipient (Party or Retail Customer) */
export interface InvoiceRecipientSnapshot {
  name: string;
  legalName?: string;
  gstin?: string;
  pan?: string;
  mobile?: string;
  email?: string;
  address: Address;
  state: string;
  stateCode: string;
  partyId?: string;
  customerId?: string;
  source: InvoiceSource;
}

export interface InvoiceLineGst {
  taxability: Taxability;
  hsnSacCode?: string;
  gstRate: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
}

export interface InvoiceItem {
  id: string;
  sourceType: InvoiceItemSourceType;
  /** Order line id when ORDER_MATTRESS */
  orderItemId?: string;
  /** Product Master id when PRODUCT_MASTER */
  productId?: string;

  description: string;
  sku?: string;
  unit: string;
  quantity: number;
  /** Unit rate (from Order for mattress; Product Master default when accessory added) */
  rate: number;
  /** quantity × rate before discount (snapshotted) */
  lineAmount: number;
  discountAmount: number;
  taxableAmount: number;

  /** Mattress-specific snapshot fields (ORDER_MATTRESS only) */
  mattressType?: string;
  sizeType?: string;
  regularSize?: string;
  length?: number;
  width?: number;
  thickness?: string;
  warranty?: string;
  fabric?: string;
  sqFt?: number;

  gst: InvoiceLineGst;
  lineTotal: number;
}

export interface InvoiceGstTotals {
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  financialYear: string;
  invoiceDate: string; // YYYY-MM-DD
  invoiceType: InvoiceType;
  documentType: InvoiceDocumentType;
  status: InvoiceStatus;

  /** Present when mattress lines come from an eligible order */
  orderId?: string;
  orderNumber?: string;
  partyRef?: InvoicePartyRef;

  /**
   * Top-level ownership for Firestore read rules (party/salesperson).
   * Copied from Order / recipient at draft/issue; not live master refs.
   */
  partyId?: string;
  salespersonId?: string;

  supplierSnapshot: InvoiceSupplierSnapshot;
  recipientSnapshot: InvoiceRecipientSnapshot;
  billingAddress: Address;
  shippingAddress: Address;
  placeOfSupply: string;
  placeOfSupplyStateCode?: string;

  items: InvoiceItem[];

  subtotal: number;
  discount: number;
  taxableAmount: number;
  gst: InvoiceGstTotals;
  grandTotal: number;

  notes?: string;

  /** Active terms copied at draft; frozen on issue */
  termsSnapshot?: InvoiceTermSnapshot[];

  /** Snapshotted GST Inclusive/Exclusive mode at draft/issue */
  amountType?: GstAmountType;

  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: string;
  issuedAt?: unknown;
  issuedBy?: string;
  cancelledAt?: unknown;
  cancelledBy?: string;
  cancellationReason?: string;
}

/** Draft write payload (before numbering on issue) */
export type InvoiceDraftWrite = {
  invoiceDate: string;
  invoiceType: InvoiceType;
  orderId?: string;
  orderNumber?: string;
  partyRef?: InvoicePartyRef;
  partyId?: string;
  salespersonId?: string;
  supplierSnapshot: InvoiceSupplierSnapshot;
  recipientSnapshot: InvoiceRecipientSnapshot;
  billingAddress: Address;
  shippingAddress: Address;
  placeOfSupply: string;
  placeOfSupplyStateCode?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  taxableAmount: number;
  gst: InvoiceGstTotals;
  grandTotal: number;
  notes?: string;
  termsSnapshot?: InvoiceTermSnapshot[];
  amountType?: GstAmountType;
};
