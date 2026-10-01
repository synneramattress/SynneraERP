/**
 * Suppliers domain types — payable / ledger + Phase 3 GST
 */

import type {
  PaymentMode,
  SupplierCategory,
  PurchaseBillType,
} from "./supplierDefinitions";

export type SupplierStatus = "ACTIVE" | "INACTIVE";

export type SupplierTransactionType = "purchase" | "payment" | "purchase_return";

export type SupplierRecord = {
  id: string;
  name: string;
  phone?: string;
  contactPerson?: string;
  phone2?: string;
  contactPerson2?: string;
  supplierCategory?: SupplierCategory | string;
  city?: string;
  notes?: string;
  /** Starting amount owed to this supplier before any transactions */
  openingBalance: number;
  status?: SupplierStatus | string;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: string;
  [key: string]: unknown;
};

export type SupplierTransaction = {
  id: string;
  type: SupplierTransactionType;
  /** Always stored as a positive number — for purchase this is total payable */
  amount: number;
  date: unknown;
  billNumber?: string | null;
  paymentMode?: PaymentMode | string | null;
  referenceNumber?: string | null;
  note?: string | null;
  /** Phase 3: GST vs Non-GST (purchase only) */
  purchaseType?: PurchaseBillType | string | null;
  /** Taxable value before GST */
  taxableAmount?: number | null;
  /** GST amount (CGST+SGST or IGST) */
  gstAmount?: number | null;
  /** GST rate percent e.g. 18 */
  gstRate?: number | null;
  /** Links back to GRN / PO when created from receiving */
  goodsReceiptId?: string | null;
  purchaseOrderId?: string | null;
  createdAt?: unknown;
  createdBy?: string;
};

export type SupplierWithBalance = SupplierRecord & {
  currentDue: number;
  purchaseTotal: number;
  paymentTotal: number;
};

export type CreateSupplierInput = {
  name: string;
  phone?: string;
  contactPerson?: string;
  phone2?: string;
  contactPerson2?: string;
  supplierCategory?: SupplierCategory | string;
  city?: string;
  notes?: string;
  openingBalance?: number;
  status?: SupplierStatus;
};

export type AddPurchaseInput = {
  billNumber: string;
  date: string; // YYYY-MM-DD
  /** Total payable (taxable + GST for GST bills) */
  amount: number;
  note?: string;
  purchaseType?: PurchaseBillType | string;
  taxableAmount?: number;
  gstAmount?: number;
  gstRate?: number;
};

export type AddPaymentInput = {
  date: string; // YYYY-MM-DD
  amount: number;
  paymentMode?: string;
  referenceNumber?: string;
  note?: string;
};
