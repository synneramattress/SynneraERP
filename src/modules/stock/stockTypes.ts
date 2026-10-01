/**
 * Stock domain types — Phase 2
 * Stock is increased only on Goods Receipt (not on PO create).
 */

import type { StockMovementType } from "./stockDefinitions";

export type StockMovementRecord = {
  id: string;
  materialId: string;
  materialName: string;
  unit: string;
  /** Positive = in, negative = out */
  quantity: number;
  type: StockMovementType | string;
  /** Linked GRN / PO / etc */
  referenceType?: string | null;
  referenceId?: string | null;
  referenceNumber?: string | null;
  note?: string | null;
  /** Stock after this movement */
  balanceAfter?: number;
  createdAt?: unknown;
  createdBy?: string;
  [key: string]: unknown;
};

export type MaterialStockSummary = {
  materialId: string;
  materialName: string;
  unit: string;
  category?: string;
  currentStock: number;
};
