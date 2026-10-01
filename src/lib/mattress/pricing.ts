import { resolveMasterRate } from "@/modules/rates/rateLookup";
import { resolveRateFromMaster, type RateResolution, normalizeWarrantyKey } from "@/modules/rates/rateEngine";
import type { OrderRateSnapshot } from "@/modules/rates/rateTypes";
/**
 * Order-line pricing: square feet × applicable party rate.
 * Snapshot at order-creation time (past orders do not change when rates change).
 *
 * Same logic as Party Rates page:
 * - Distributor party → master/distributor rate
 * - Dealer party (default) → dealer rate = master × (1 + dealerMarkup/100)
 */

import { mattressTypeKeyFromLabel } from "@/lib/catalog/mattressTypes";
import { normalizeFabric, type FabricType } from "@/lib/catalog/fabric";
import {
  thicknessKeysForType,
  parseThicknessInches,
  type ThicknessKey,
} from "@/lib/catalog/thickness";
import { DEFAULT_RATE_SETTINGS } from "@/modules/rates/logic";
import type {
  RateMattressTypeKey,
  RateWarrantyKey,
  RateSettings,
} from "@/modules/rates/rateTypes";
import {
  computeItemSquareFeet,
  computeLineAmount,
  roundMoney,
} from "./calculations";
import type { MattressPricing } from "./types";

export type PartyRateContext = {
  /** Master rates map from fetchMasterRates() */
  masterRates: Record<string, number>;
  /** Rate settings (dealerMarkup, etc.) */
  settings?: RateSettings | null;
  /**
   * true → use master/distributor rate
   * false/undefined → use dealer rate (master + dealer markup)
   * Detected from user.partyCategory / rateCategory including "distribut"
   */
  isDistributor?: boolean;
};

/**
 * Map measured thickness inches to an exact Rate Master thickness key.
 * Standard selections must never silently use a neighbouring thickness.
 */
export function thicknessToRateKey(
  inches: number | null | undefined,
  typeKey: RateMattressTypeKey | string | null | undefined
): ThicknessKey | null {
  if (inches == null || !Number.isFinite(inches)) return null;
  const allowed = thicknessKeysForType(typeKey);
  if (!allowed.length) return null;

  // Rate Master cells are exact thickness keys. Never silently substitute
  // a neighbouring thickness for a standard selection.
  const exact = String(Number.isInteger(inches) ? inches : inches).trim() as ThicknessKey;
  return allowed.includes(exact) ? exact : null;
}

/** Same detection as Party Rates page. */
export function isDistributorParty(user: {
  partyCategory?: string;
  rateCategory?: string;
  [key: string]: unknown;
} | null | undefined): boolean {
  if (!user) return false;
  return String(user.partyCategory || user.rateCategory || "")
    .toLowerCase()
    .includes("distribut");
}

function fabricFromItem(item: {
  fabric?: string;
  notes?: string;
}): FabricType {
  if (item.fabric) return normalizeFabric(item.fabric);
  const m = String(item.notes || "").match(/^\[([^\]]+)\]/);
  return normalizeFabric(m?.[1] || "cotton");
}

function thicknessInchesFromItem(item: {
  sizeType?: string;
  thickness?: string;
  height?: number;
}): number | null {
  if (item.sizeType === "custom" && item.height != null) {
    return parseThicknessInches(item.height);
  }
  return parseThicknessInches(item.thickness);
}

/**
 * Resolve master rate for an item (robust key lookup, same spirit as rates page).
 */
export function resolveRateInputs(item: {
  type?: string;
  warranty?: string;
  thickness?: string;
  height?: number;
  sizeType?: string;
  fabric?: string;
  notes?: string;
}): {
  typeKey: RateMattressTypeKey;
  warranty: RateWarrantyKey;
  fabric: FabricType;
  thickness: ThicknessKey;
} | null {
  const typeKey = mattressTypeKeyFromLabel(item.type);
  if (!typeKey) return null;
  const warranty = normalizeWarrantyKey(item.warranty) as RateWarrantyKey;
  if (!warranty) return null;
  const inches = thicknessInchesFromItem(item);
  const thKey = thicknessToRateKey(inches, typeKey);
  if (!thKey) return null;
  return {
    typeKey,
    warranty,
    fabric: fabricFromItem(item),
    thickness: thKey,
  };
}

/** Resolve the complete current rate bundle through the shared Rate Engine. */
export function resolveItemRateBundle(
  item: {
    type?: string;
    warranty?: string;
    thickness?: string;
    height?: number;
    sizeType?: string;
    fabric?: string;
    notes?: string;
  },
  masterRates: Record<string, number>,
  settings: RateSettings | null | undefined
): RateResolution | null {
  const inputs = resolveRateInputs(item);
  if (!inputs) return null;
  return resolveRateFromMaster(
    masterRates,
    settings || DEFAULT_RATE_SETTINGS,
    inputs.typeKey,
    inputs.warranty,
    inputs.fabric,
    inputs.thickness
  );
}

export function lookupMasterRate(
  item: {
    type?: string;
    warranty?: string;
    thickness?: string;
    height?: number;
    sizeType?: string;
    fabric?: string;
    notes?: string;
  },
  masterRates: Record<string, number>
): number | null {
  const inputs = resolveRateInputs(item);
  if (!inputs) return null;
  return resolveMasterRate(
    masterRates,
    inputs.typeKey,
    inputs.warranty,
    inputs.fabric,
    inputs.thickness
  );
}

export function lookupItemRate(
  item: {
    type?: string;
    warranty?: string;
    thickness?: string;
    height?: number;
    sizeType?: string;
    fabric?: string;
    notes?: string;
  },
  ctx: PartyRateContext | Record<string, number>
): number | null {
  const context: PartyRateContext =
    ctx && typeof ctx === "object" && "masterRates" in (ctx as PartyRateContext)
      ? (ctx as PartyRateContext)
      : { masterRates: ctx as Record<string, number> };

  const result = resolveItemRateBundle(item, context.masterRates || {}, context.settings);
  if (!result || result.status !== "OK" || result.master == null || result.party == null) {
    return null;
  }
  return context.isDistributor ? result.master : result.party;
}

/**
 * Full pricing for one order line: sqFt, rate, amount (+ calculated L/W).
 */
export function priceOrderItem(
  item: {
    type?: string;
    warranty?: string;
    thickness?: string;
    height?: number;
    sizeType?: string;
    regularSize?: string;
    length?: number;
    width?: number;
    fabric?: string;
    notes?: string;
    quantity?: number;
  },
  ctx: PartyRateContext | Record<string, number>
): MattressPricing | null {
  const size = computeItemSquareFeet(item);
  if (!size || !size.valid) return null;
  const rate = lookupItemRate(item, ctx);
  if (rate == null) return null;
  const qty = Math.max(1, Number(item.quantity) || 1);
  const amount = computeLineAmount(size.calculated.totalSquareFeet, rate, qty);
  return {
    sqFt: size.calculated.totalSquareFeet,
    rate,
    amount,
    calculatedLength: size.calculated.calculatedLength,
    calculatedWidth: size.calculated.calculatedWidth,
  };
}

export function withItemPricing<T extends Record<string, unknown>>(
  item: T,
  ctx: PartyRateContext | Record<string, number>
): T & Partial<MattressPricing> & { rateSnapshot?: OrderRateSnapshot } {
  const pricing = priceOrderItem(item as any, ctx);
  if (!pricing) return { ...item };

  const context: PartyRateContext =
    ctx && typeof ctx === "object" && "masterRates" in (ctx as PartyRateContext)
      ? (ctx as PartyRateContext)
      : { masterRates: ctx as Record<string, number> };
  const bundle = resolveItemRateBundle(item as any, context.masterRates || {}, context.settings);

  const appliedPartyRate = context.isDistributor ? bundle?.master : bundle?.party;
  const snapshot =
    bundle &&
    bundle.status === "OK" &&
    bundle.master != null &&
    appliedPartyRate != null
      ? {
          source: "admin_rate_master" as const,
          masterRate: Math.round(bundle.master * 100) / 100,
          partyRate: Math.round(appliedPartyRate * 100) / 100,
          capturedAt: new Date().toISOString(),
        }
      : undefined;

  return {
    ...item,
    sqFt: pricing.sqFt,
    rate: pricing.rate,
    amount: pricing.amount,
    calculatedLength: pricing.calculatedLength,
    calculatedWidth: pricing.calculatedWidth,
    ...(snapshot ? { rateSnapshot: snapshot } : {}),
  };
}

export function sumOrderAmount(
  items: Array<{ amount?: number | null }>
): number {
  const total = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
  return roundMoney(total);
}

export function formatAmountINR(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  const v = Number(n);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(v);
}
