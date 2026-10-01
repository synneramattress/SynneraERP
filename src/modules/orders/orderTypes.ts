/**
 * Orders domain types — owned by modules/orders
 */

import type { OrderRateSnapshot } from "@/modules/rates/rateTypes";
import type { Address } from "@/types/address";

export type OrderStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "assigned"
  | "in_production"
  | "ready_to_dispatch";

export type SizeType = "regular" | "custom";

/** PARTY = dealer/distributor order; RETAIL = salesperson retail sale */
export type OrderType = "PARTY" | "RETAIL";

/** How the party gave the order to the salesperson (Assisted Order channel) */
export type OrderReceivedVia =
  | "PHONE_CALL"
  | "WHATSAPP_TEXT"
  | "WHATSAPP_VOICE"
  | "WHATSAPP_PHOTO"
  | "SALES_VISIT"
  | "OTHER";

export interface OrderItem {
  id: string;
  type: string;
  sizeType: SizeType;
  regularSize?: string;
  length?: number;
  width?: number;
  height?: number;
  thickness?: string;
  /** Warranty years key from Rate Master e.g. "3" | "5" | "7" | "10" | "12" */
  warranty?: string;
  quantity: number;
  notes?: string;
  designId?: string;
  designCode?: string;
  designName?: string;
  /** Fabric key (jacquard | cotton | rotto) — also encoded in notes as [Fabric] */
  fabric?: string;

  // ── Job Work / OEM (per-item) ──
  /** REGULAR (default) | JOB_WORK */
  itemType?: "REGULAR" | "JOB_WORK";
  /** Only when itemType === JOB_WORK */
  fabricSource?: "PARTY" | "SYNNERA";
  /** Fabric type used for Job Work rate lookup (jacquard | cotton | rotto) */
  jobWorkFabricType?: "jacquard" | "cotton" | "rotto";
  /** Resolved Job Work rate (per piece) at order time */
  jobWorkRate?: number;
  /** Immutable Job Work rate snapshot */
  jobWorkRateSnapshot?: {
    rate: number;
    fabricType: "jacquard" | "cotton" | "rotto";
    fabricSource: "PARTY" | "SYNNERA";
    thickness: string;
    key: string;
    capturedAt?: unknown;
  };

  // ── Pricing snapshot (sq.ft × Rate Master rate) — Party + Admin ──
  /** Calculated square feet (2 dp) after length/width staircase */
  sqFt?: number;
  /** Rate Master / party rate per sq.ft used at order time (party orders) */
  rate?: number;
  /** Line amount = sqFt × rate × quantity (2 dp) — party semantics */
  amount?: number;
  /** Production length after staircase rules */
  calculatedLength?: number;
  /** Production width after staircase rules */
  calculatedWidth?: number;

  // ── Retail pricing snapshot (RETAIL orders only) ──
  partyRate?: number;
  retailRate?: number;
  defaultRetailAmount?: number;
  /** Actual sale rate per sq.ft (salesperson-entered; must be >= partyRate) */
  actualSaleRate?: number;
  actualSaleAmount?: number;
  /** rate_per_sqft | total_amount */
  salesPricingMode?: "rate_per_sqft" | "total_amount";
  /** Immutable rate values captured for this order line. */
  rateSnapshot?: OrderRateSnapshot;
}

export interface RetailCustomer {
  name: string;
  contact: string;
  address: string;
  city: string;
}

/** GST-compliant customer payload captured at order submit; finalized to Customer Master only after Admin approval */
export interface CustomerMasterDraft {
  name: string;
  mobile: string;
  email?: string;
  alternateMobile?: string;
  gstRegistrationType?: "REGISTERED_REGULAR" | "UNREGISTERED";
  gstin?: string;
  pan?: string;
  billingAddress?: Address;
  shippingAddress?: Address;
  shippingSameAsBilling?: boolean;
  notes?: string;
}

export interface Order {
  orderNumber?: string;
  poNumber?: string;
  deliveryDate?: string;
  id: string;
  partyId: string;
  partyName?: string;
  partyEmail?: string;
  status: OrderStatus;
  items: OrderItem[];
  totalQuantity: number;
  /** Sum of item amounts (2 dp). Party: party amount; Retail: actual sale total */
  totalAmount?: number;
  notes?: string;
  rejectionReason?: string;
  createdAt?: any;
  updatedAt?: any;
  submittedAt?: any;
  approvedAt?: any;
  rejectedAt?: any;

  productionStatus?: "queue" | "assigned" | "in_production" | "ready_to_dispatch" | string;
  productionPriority?: "normal" | "high" | "urgent";
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  assignedAt?: any;
  assignedBy?: string;
  productionStartedAt?: any;
  productionStartedBy?: string;
  readyToDispatchAt?: any;
  readyToDispatchBy?: string;
  physicalMattressCount?: number;
  photosUploaded?: number;
  photosRequired?: number;
  partyVerifiedAt?: any;
  partyVerifiedBy?: string;

  // ── Retail sale fields ──
  orderType?: OrderType | string;
  /** e.g. SALESPERSON_ASSISTED when created by salesperson for a party */
  source?: string;
  /** How party communicated the order to salesperson (assisted only; optional) */
  orderReceivedVia?: OrderReceivedVia | string;
  salespersonId?: string;
  salespersonName?: string;
  /** Optional link to customers/{customerId} master (set when selected existing, or after Admin approval creates master) */
  customerId?: string;
  customer?: RetailCustomer;
  /** Pending GST customer data until Admin approves this retail order */
  customerMasterDraft?: CustomerMasterDraft;
  /** Set when Customer Master was finalized from this approved order */
  customerMasterFinalizedAt?: unknown;
  /** Denormalized for lists */
  customerName?: string;
  customerContact?: string;
  customerCity?: string;
  /** Retail: delivery + payment for commission eligibility */
  deliveredAt?: unknown;
  deliveryStatus?: string;
  customerPaymentReceived?: boolean;
  customerPaymentReceivedAt?: unknown;
  /** Timestamp marking when submitted-order pricing was snapshotted. */
  rateSnapshotAt?: unknown;

  /**
   * Immutable financial path once set.
   * null / missing = not yet classified (Ready to Dispatch may choose Tax Invoice or Other Order).
   * TAX_INVOICE = locked at invoice ISSUE (not draft).
   * OTHER_ORDER = locked when Other Order is confirmed + ledger debit posted.
   */
  financialDocumentType?: "TAX_INVOICE" | "OTHER_ORDER" | null;
  financialDocumentId?: string | null;
  financialClassifiedAt?: unknown;
  financialClassifiedBy?: string | null;
}


export type OrderWritePayload = {
  partyId: string;
  partyName?: string;
  partyEmail?: string;
  notes?: string;
  items: OrderItem[];
  totalQuantity: number;
  totalAmount?: number;
  status: OrderStatus | string;
  orderNumber?: string;
  submittedAt?: any;
  [key: string]: unknown;
};

export type OrderListSort = "newest" | "oldest";
