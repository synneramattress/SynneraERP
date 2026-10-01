/**
 * Purchase Orders + Goods Receipt types
 * Phase 1: PO only
 * Phase 2: Receiving → stock + supplier payable
 */

import type { POStatus } from "./purchaseDefinitions";

export type PurchaseOrderItem = {
  /** Local line id for UI */
  id: string;
  materialId: string;
  materialName: string;
  unit: string;
  /** Ordered quantity */
  quantity: number;
  rate: number;
  /** quantity * rate */
  amount: number;
  /** Cumulative received (Phase 2) */
  receivedQuantity?: number;
  notes?: string | null;
};

export type PurchaseOrderRecord = {
  id: string;
  /** e.g. PO-26/27-0001 */
  poNumber: string;
  supplierId: string;
  supplierName: string;
  status: POStatus | string;
  /** Expected delivery date YYYY-MM-DD */
  expectedDeliveryDate?: string | null;
  notes?: string | null;
  items: PurchaseOrderItem[];
  /** Sum of item amounts */
  totalAmount: number;
  /** Indian FY key e.g. "26/27" */
  financialYear: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: string;
  createdByName?: string;
  cancelledAt?: unknown;
  cancelledBy?: string;
  cancelReason?: string | null;
  [key: string]: unknown;
};

export type CreatePurchaseOrderInput = {
  supplierId: string;
  supplierName: string;
  expectedDeliveryDate?: string | null;
  notes?: string | null;
  items: Omit<PurchaseOrderItem, "id" | "amount" | "receivedQuantity">[];
  /** If true → status ordered, else draft */
  placeOrder?: boolean;
};

export type UpdatePurchaseOrderInput = {
  supplierId?: string;
  supplierName?: string;
  expectedDeliveryDate?: string | null;
  notes?: string | null;
  items?: Omit<PurchaseOrderItem, "id" | "amount" | "receivedQuantity">[];
  status?: POStatus;
};

/** One line on a Goods Receipt */
export type BillImage = {
  url: string;
  fileId?: string | null;
  name?: string | null;
};

export type GoodsReceiptItem = {
  id: string;
  /** Matches PO item id when possible */
  poItemId: string;
  materialId: string;
  materialName: string;
  unit: string;
  /** Qty received in this GRN */
  receivedQuantity: number;
  /** Rate used for payable (defaults to PO rate) */
  rate: number;
  amount: number;
};

export type GoodsReceiptRecord = {
  id: string;
  /** e.g. GRN-26/27-0001 */
  grnNumber: string;
  purchaseOrderId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  /** Supplier bill / invoice reference */
  supplierBillNumber?: string | null;
  /** Receipt date YYYY-MM-DD */
  receiptDate: string;
  notes?: string | null;
  items: GoodsReceiptItem[];
  totalAmount: number;
  financialYear: string;
  /** Linked supplier ledger purchase transaction id */
  supplierTransactionId?: string | null;
  /** Phase 3: gst | non_gst */
  purchaseType?: string | null;
  taxableAmount?: number | null;
  gstAmount?: number | null;
  gstRate?: number | null;
  /** If true, payment was auto-created (cash) */
  markedPaid?: boolean;
  paymentTransactionId?: string | null;
  /** Supplier GST / bill photos (ImageKit) */
  billImages?: BillImage[];
  createdAt?: unknown;
  createdBy?: string;
  createdByName?: string;
  [key: string]: unknown;
};

export type ReceiveMaterialLineInput = {
  poItemId: string;
  materialId: string;
  materialName: string;
  unit: string;
  /** Qty to receive now */
  receivedQuantity: number;
  /** Optional override rate; default = PO rate */
  rate?: number;
};

export type ReceiveMaterialInput = {
  purchaseOrderId: string;
  supplierBillNumber?: string | null;
  receiptDate: string; // YYYY-MM-DD
  notes?: string | null;
  items: ReceiveMaterialLineInput[];
  /** Phase 3: gst | non_gst */
  purchaseType?: "gst" | "non_gst";
  /** GST rate percent when purchaseType=gst */
  gstRate?: number;
  /**
   * How line amounts are interpreted when GST:
   * - inclusive: line amount includes GST (split by rate)
   * - exclusive: line amount is taxable (GST added on top)
   * Default: inclusive
   */
  gstAmountMode?: "inclusive" | "exclusive";
  /** For Non-GST / Cash: also create full payment now */
  markAsPaid?: boolean;
  paymentMode?: string;
  billImages?: BillImage[];
};


/** Purchase Return — Phase 4 */
export type PurchaseReturnItem = {
  id: string;
  grnItemId?: string;
  materialId: string;
  materialName: string;
  unit: string;
  returnedQuantity: number;
  rate: number;
  amount: number;
};

export type PurchaseReturnRecord = {
  id: string;
  /** e.g. PR-26/27-0001 */
  returnNumber: string;
  goodsReceiptId: string;
  grnNumber: string;
  purchaseOrderId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  returnDate: string;
  reason?: string | null;
  notes?: string | null;
  items: PurchaseReturnItem[];
  totalAmount: number;
  financialYear: string;
  supplierTransactionId?: string | null;
  createdAt?: unknown;
  createdBy?: string;
  createdByName?: string;
  [key: string]: unknown;
};

export type CreatePurchaseReturnLineInput = {
  materialId: string;
  materialName: string;
  unit: string;
  returnedQuantity: number;
  rate: number;
  grnItemId?: string;
};

export type CreatePurchaseReturnInput = {
  goodsReceiptId: string;
  returnDate: string;
  reason?: string | null;
  notes?: string | null;
  items: CreatePurchaseReturnLineInput[];
};
