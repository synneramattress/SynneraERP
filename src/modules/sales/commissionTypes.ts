import type {
  CommissionPaymentStatus,
  CommissionStatus,
} from "./salesDefinitions";

export type SalesCommission = {
  id: string;
  /** Unique business key — one commission per retail order */
  retailOrderId: string;
  orderNumber?: string;
  salespersonId: string;
  salespersonName?: string;
  customerName?: string;
  partyRateAmount: number;
  actualSalesAmount: number;
  commissionAmount: number;
  commissionStatus: CommissionStatus | string;
  paymentStatus: CommissionPaymentStatus | string;
  deliveredAt?: unknown;
  customerPaymentReceivedAt?: unknown;
  earnedAt?: unknown;
  paidAt?: unknown;
  paidBy?: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
};
