/**
 * Delivery Challan domain types — locked 2026-09-30
 * Multiple DCs per order supported. Tax Invoice link is conditional.
 */

import type { DeliveryChallanStatus, DeliveryChallanPurpose, DeliveryChallanSource } from "./constants";

export interface DeliveryChallanItem {
  id: string;
  /** Order line id when linked to order */
  orderItemId?: string;
  description: string;
  hsn?: string;
  quantity: number;
  unit?: string;
  /** Taxable / total value only — no individual rate on DC */
  taxableValue: number;
}

export interface DeliveryChallanAddress {
  name: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  pincode?: string;
  gstin?: string;
  mobile?: string;
}

export interface DeliveryChallanTransport {
  vehicleNumber?: string | null;
  transporterName?: string | null;
  lrNumber?: string | null;
  ewayBillNo?: string | null;
  driverName?: string | null;
  driverMobile?: string | null;
}

/** Party-uploaded proof of delivery (photo of signed+stamped+ticked DC) */
export interface DeliveryChallanPod {
  signedImageUrl: string;
  uploadedAt: unknown; // Firestore Timestamp
  uploadedBy: string;
  /** Optional free-text remark from party */
  remark?: string | null;
  /** Admin soft-reject */
  rejected?: boolean;
  rejectedAt?: unknown;
  rejectedBy?: string;
  rejectionReason?: string | null;
}

export interface DeliveryChallan {
  id: string;
  challanNumber: string;
  financialYear: string;
  seq: number;

  status: DeliveryChallanStatus;
  purpose: DeliveryChallanPurpose;

  /** order = from sales/production order; standalone = material/tools/other */
  sourceType?: DeliveryChallanSource | null;

  /** Optional free-text reference (PO, job card, related order #) */
  referenceNote?: string | null;

  /** Linked order (when sourceType = order) */
  orderId?: string | null;
  orderNumber?: string | null;

  /** Conditional — only when Tax Invoice exists */
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  invoiceDate?: unknown | null;

  partyId?: string | null;
  partyName?: string | null;

  /** Billed To — only filled when different from shipTo */
  billedTo?: DeliveryChallanAddress | null;
  shipTo: DeliveryChallanAddress;

  placeOfSupply: string;
  placeOfSupplyCode?: string;

  items: DeliveryChallanItem[];
  totalAmount: number;

  transport?: DeliveryChallanTransport | null;

  /** Copied from company at generation time */
  udyamNumber?: string | null;
  companyGstin?: string | null;
  companyLegalName?: string | null;

  pdfUrl?: string | null;

  /** Party upload of signed physical DC */
  pod?: DeliveryChallanPod | null;

  createdAt?: unknown;
  createdBy?: string;
  updatedAt?: unknown;
  updatedBy?: string;
  dispatchedAt?: unknown | null;
  dispatchedBy?: string | null;
}

export type DeliveryChallanCreateInput = {
  purpose: DeliveryChallanPurpose;
  sourceType?: DeliveryChallanSource;
  referenceNote?: string | null;
  orderId?: string | null;
  orderNumber?: string | null;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  invoiceDate?: Date | null;
  partyId?: string | null;
  partyName?: string | null;
  billedTo?: DeliveryChallanAddress | null;
  shipTo: DeliveryChallanAddress;
  placeOfSupply: string;
  placeOfSupplyCode?: string;
  items: Omit<DeliveryChallanItem, "id">[];
  totalAmount: number;
  transport?: DeliveryChallanTransport | null;
  udyamNumber?: string | null;
  companyGstin?: string | null;
  companyLegalName?: string | null;
  createdBy: string;
};
