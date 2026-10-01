import type { FabricType } from "@/lib/catalog/fabric";
import type { MattressTypeKey as CatalogMattressKey } from "@/lib/catalog/mattressTypes";
import type { ThicknessKey as CatalogThicknessKey } from "@/lib/catalog/thickness";
import type { WarrantyKey as CatalogWarrantyKey } from "@/lib/catalog/warranty";

export type { FabricType };

/** Rate Master mattress type key (= shared catalog) */
export type RateMattressTypeKey = CatalogMattressKey;
/** Rate Master warranty key (= shared catalog) */
export type RateWarrantyKey = CatalogWarrantyKey;
/** Rate Master thickness key (= shared catalog) */
export type RateThicknessKey = CatalogThicknessKey;

/** @deprecated prefer RateMattressTypeKey */
export type MattressTypeKey = RateMattressTypeKey;
/** @deprecated prefer RateWarrantyKey */
export type WarrantyKey = RateWarrantyKey;
/** @deprecated prefer RateThicknessKey */
export type ThicknessKey = RateThicknessKey;

export interface RateSettings {
  dealerMarkup?: number;
  retailMarkup?: number;
  cottonDifference?: number;
  rottoDifference?: number;
  [key: string]: unknown;
}

export interface RateMasterDoc {
  rates?: Record<string, number>;
  partyRates?: Record<string, number>;
  retailRates?: Record<string, number>;
  [key: string]: unknown;
}

/** Immutable pricing values captured on an order line at save/submit time. */
export interface OrderRateSnapshot {
  source: "admin_rate_master";
  masterRate: number;
  partyRate: number;
  retailRate?: number;
  actualSaleRate?: number;
  actualSaleAmount?: number;
  commissionAmount?: number;
  capturedAt?: unknown;
}
