/**
 * Centralized retail sale pricing + Party-rate floor validation.
 * Reuses V2.11.73 mattress sq.ft + Rate Master lookups.
 */

import {
  computeItemSquareFeet,
  computeLineAmount,
  roundMoney,
  resolveRateInputs,
} from "@/lib/mattress";
import { DEFAULT_RATE_SETTINGS } from "@/modules/rates/logic";
import type { RateSettings, OrderRateSnapshot } from "@/modules/rates/rateTypes";
import { resolveRateFromTables, type RateTables } from "@/modules/rates/rateEngine";
import type { OrderItem } from "@/modules/orders";

export type RetailPricingMode = "rate_per_sqft" | "total_amount";

function resolveRateInputsForRetailItem(item: {
  type?: string;
  warranty?: string;
  thickness?: string;
  height?: number;
  sizeType?: string;
  fabric?: string;
  notes?: string;
}) {
  return resolveRateInputs(item);
}

export type RetailLinePricing = {
  sqFt: number;
  calculatedLength?: number;
  calculatedWidth?: number;
  masterRate: number;
  partyRate: number;
  retailRate: number;
  defaultRetailAmount: number;
  actualSaleRate: number;
  actualSaleAmount: number;
  salesPricingMode: RetailPricingMode;
  belowPartyRate: boolean;
};

export function resolvePartyAndRetailRates(
  item: {
    type?: string;
    warranty?: string;
    thickness?: string;
    height?: number;
    sizeType?: string;
    fabric?: string;
    notes?: string;
  },
  rateTables: RateTables,
  settings: RateSettings | null | undefined
): { partyRate: number; retailRate: number; masterRate: number } | null {
  const inputs = resolveRateInputsForRetailItem(item);
  if (!inputs) return null;
  const result = resolveRateFromTables(
    rateTables,
    inputs.typeKey,
    inputs.warranty,
    inputs.fabric,
    inputs.thickness
  );
  if (!result || result.status !== "OK" || result.master == null || result.party == null || result.retail == null) {
    return null;
  }
  return {
    masterRate: roundMoney(result.master),
    partyRate: roundMoney(result.party),
    retailRate: roundMoney(result.retail),
  };
}

/**
 * Price one retail line. actualSaleRate/Amount from user input.
 * Recomputes party/retail from trusted master rates.
 */
export function priceRetailLine(
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
    actualSaleRate?: number | null;
    actualSaleAmount?: number | null;
    salesPricingMode?: RetailPricingMode;
  },
  rateTables: RateTables,
  settings: RateSettings | null | undefined
): RetailLinePricing | null {
  const size = computeItemSquareFeet(item);
  if (!size || !size.valid) return null;
  const rates = resolvePartyAndRetailRates(item, rateTables, settings);
  if (!rates) return null;

  const qty = Math.max(1, Number(item.quantity) || 1);
  const sqFt = size.calculated.totalSquareFeet;
  const defaultRetailAmount = computeLineAmount(sqFt, rates.retailRate, qty);

  const mode: RetailPricingMode =
    item.salesPricingMode === "total_amount" ? "total_amount" : "rate_per_sqft";

  let actualSaleRate: number;
  let actualSaleAmount: number;

  if (mode === "total_amount" && item.actualSaleAmount != null && Number(item.actualSaleAmount) > 0) {
    actualSaleAmount = roundMoney(Number(item.actualSaleAmount));
    const denom = sqFt * qty;
    actualSaleRate = denom > 0 ? roundMoney(actualSaleAmount / denom) : 0;
  } else if (item.actualSaleRate != null && Number(item.actualSaleRate) > 0) {
    actualSaleRate = roundMoney(Number(item.actualSaleRate));
    actualSaleAmount = computeLineAmount(sqFt, actualSaleRate, qty);
  } else {
    // Default: sell at retail rate
    actualSaleRate = rates.retailRate;
    actualSaleAmount = defaultRetailAmount;
  }

  const belowPartyRate = actualSaleRate < rates.partyRate - 0.001;

  return {
    sqFt,
    calculatedLength: size.calculated.calculatedLength,
    calculatedWidth: size.calculated.calculatedWidth,
    masterRate: rates.masterRate,
    partyRate: rates.partyRate,
    retailRate: rates.retailRate,
    defaultRetailAmount,
    actualSaleRate,
    actualSaleAmount,
    salesPricingMode: mode,
    belowPartyRate,
  };
}

export function applyRetailPricingToItem(
  item: OrderItem,
  rateTables: RateTables,
  settings: RateSettings | null | undefined
): OrderItem & { belowPartyRate?: boolean } {
  const priced = priceRetailLine(item, rateTables, settings);
  if (!priced) return { ...item, belowPartyRate: true };
  const partyAmount = computeLineAmount(priced.sqFt, priced.partyRate, Number(item.quantity) || 1);
  const commissionAmount = roundMoney(Math.max(0, priced.actualSaleAmount - partyAmount));
  const snapshot: OrderRateSnapshot = {
    source: "admin_rate_master",
    masterRate: priced.masterRate,
    partyRate: priced.partyRate,
    retailRate: priced.retailRate,
    actualSaleRate: priced.actualSaleRate,
    actualSaleAmount: priced.actualSaleAmount,
    commissionAmount,
    capturedAt: new Date().toISOString(),
  };

  return {
    ...item,
    sqFt: priced.sqFt,
    calculatedLength: priced.calculatedLength,
    calculatedWidth: priced.calculatedWidth,
    partyRate: priced.partyRate,
    retailRate: priced.retailRate,
    defaultRetailAmount: priced.defaultRetailAmount,
    actualSaleRate: priced.actualSaleRate,
    actualSaleAmount: priced.actualSaleAmount,
    salesPricingMode: priced.salesPricingMode,
    rate: priced.actualSaleRate,
    amount: priced.actualSaleAmount,
    rateSnapshot: snapshot,
    belowPartyRate: priced.belowPartyRate,
  };
}

export function validateRetailItemsAgainstPartyRate(
  items: Array<{ belowPartyRate?: boolean; actualSaleRate?: number; partyRate?: number }>
): string | null {
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.belowPartyRate) {
      return `Item ${i + 1}: Sale rate cannot be below Party Rate.`;
    }
    if (
      it.partyRate != null &&
      it.actualSaleRate != null &&
      Number(it.actualSaleRate) < Number(it.partyRate) - 0.001
    ) {
      return `Item ${i + 1}: Sale rate cannot be below Party Rate.`;
    }
  }
  return null;
}

export function sumRetailTotal(
  items: Array<{ actualSaleAmount?: number | null }>
): number {
  return roundMoney(
    items.reduce((s, it) => s + (Number(it.actualSaleAmount) || 0), 0)
  );
}
