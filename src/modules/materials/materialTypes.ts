/**
 * Materials domain types — simple inventory foundation (stock later)
 */

import type { MaterialCategory, MaterialUnit } from "./materialDefinitions";

export type MaterialStatus = "ACTIVE" | "INACTIVE";

export type MaterialRecord = {
  id: string;
  name: string;
  unit: MaterialUnit | string;
  category: MaterialCategory | string;
  notes?: string;
  status?: MaterialStatus | string;
  /** Optional HSN for future GST */
  hsnCode?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: string;
  [key: string]: unknown;
};

export type CreateMaterialInput = {
  name: string;
  unit: MaterialUnit | string;
  category: MaterialCategory | string;
  notes?: string;
  hsnCode?: string;
  status?: MaterialStatus;
};

export type UpdateMaterialInput = Partial<CreateMaterialInput>;
