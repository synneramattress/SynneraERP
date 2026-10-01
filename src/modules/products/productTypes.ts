/** Phase 1 — Product Master domain types */

export type Taxability =
  | "TAXABLE"
  | "EXEMPT"
  | "NIL_RATED"
  | "NON_GST";

export type ProductUnit =
  | "PCS"
  | "SET"
  | "PAIR"
  | "KG"
  | "MTR"
  | "SQFT"
  | "OTHER";

export interface ProductTaxProfile {
  taxability: Taxability;
  /** HSN or SAC code — required when TAXABLE */
  hsnSacCode?: string;
  /** GST rate percent e.g. 5, 12, 18 — required when TAXABLE */
  gstRate?: number;
  /** ISO date YYYY-MM-DD when this tax config becomes effective */
  effectiveFrom?: string;
  active: boolean;
}

export interface Product {
  id: string;
  name: string;
  sku?: string;
  description?: string;
  unit: ProductUnit | string;
  defaultSellingPrice: number;
  active: boolean;
  taxProfile: ProductTaxProfile;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: string;
  updatedBy?: string;
}

export type ProductWriteInput = {
  name: string;
  sku?: string;
  description?: string;
  unit: ProductUnit | string;
  defaultSellingPrice: number;
  active?: boolean;
  taxProfile: ProductTaxProfile;
};

/** Single common tax configuration for all mattresses (not per mattress SKU). */
export interface MattressTaxSettings {
  id: "mattressTax";
  taxability: Taxability;
  hsnSacCode?: string;
  gstRate?: number;
  effectiveFrom?: string;
  active: boolean;
  updatedAt?: unknown;
  updatedBy?: string;
}

export type MattressTaxSettingsWrite = {
  taxability: Taxability;
  hsnSacCode?: string;
  gstRate?: number;
  effectiveFrom?: string;
  active?: boolean;
};
