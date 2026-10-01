import type { RateSettings } from "./rateTypes";

export const DEFAULT_RATE_SETTINGS: RateSettings = {
  dealerMarkup: 10,
  retailMarkup: 50,
  cottonDifference: 0,
  rottoDifference: 0,
  currency: "INR",
};

export function calcCottonRate(jacquard: number, settings: RateSettings): number {
  return Math.max(0, jacquard - (settings.cottonDifference || 0));
}

export function calcRottoRate(jacquard: number, settings: RateSettings): number {
  return Math.max(0, jacquard - (settings.rottoDifference || 0));
}

export function calcDealerRate(master: number, settings: RateSettings): number {
  return master * (1 + (settings.dealerMarkup || 0) / 100);
}

export function calcRetailRate(master: number, settings: RateSettings): number {
  return master * (1 + (settings.retailMarkup || 0) / 100);
}

export function formatRupee(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "N/A";
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? `₹${rounded}` : `₹${rounded.toFixed(2)}`;
}

export function distributorBenefitPercent(settings: RateSettings): number {
  const master = 100;
  const dealer = calcDealerRate(master, settings);
  return dealer <= 0 ? 0 : ((dealer - master) / dealer) * 100;
}
