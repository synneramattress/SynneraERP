/**
 * Application-facing helpers that build GstCalcInput from Product / Mattress tax config.
 * Does not perform Firestore reads by default — callers pass config explicitly
 * so historical snapshots stay immutable.
 */

import { calculateGst } from "../gstCalculator";
import type { GstCalcInput, GstCalcResult, Taxability } from "../taxTypes";
import type { ProductTaxProfile, MattressTaxSettings } from "../../products/productTypes";

export type TaxConfigSource = {
  taxability: Taxability;
  gstRate?: number;
};

export function taxConfigFromProductProfile(
  profile: ProductTaxProfile | undefined | null
): TaxConfigSource {
  if (!profile) {
    return { taxability: "NON_GST", gstRate: 0 };
  }
  return {
    taxability: profile.taxability,
    gstRate: profile.gstRate ?? 0,
  };
}

export function taxConfigFromMattressSettings(
  settings: MattressTaxSettings | undefined | null
): TaxConfigSource {
  if (!settings) {
    return { taxability: "NON_GST", gstRate: 0 };
  }
  return {
    taxability: settings.taxability,
    gstRate: settings.gstRate ?? 0,
  };
}

export function buildGstInput(opts: {
  taxableAmount: number;
  taxConfig: TaxConfigSource;
  supplierState: string;
  recipientState: string;
}): GstCalcInput {
  return {
    taxableAmount: opts.taxableAmount,
    gstRate: opts.taxConfig.gstRate ?? 0,
    taxability: opts.taxConfig.taxability,
    supplierState: opts.supplierState,
    recipientState: opts.recipientState,
  };
}

/** Convenience: product tax profile → GST result. */
export function calculateGstForProductLine(opts: {
  taxableAmount: number;
  taxProfile: ProductTaxProfile | undefined | null;
  supplierState: string;
  recipientState: string;
}): GstCalcResult {
  const taxConfig = taxConfigFromProductProfile(opts.taxProfile);
  return calculateGst(
    buildGstInput({
      taxableAmount: opts.taxableAmount,
      taxConfig,
      supplierState: opts.supplierState,
      recipientState: opts.recipientState,
    })
  );
}

/** Convenience: common mattress tax settings → GST result for an order mattress amount. */
export function calculateGstForMattressLine(opts: {
  taxableAmount: number;
  mattressTax: MattressTaxSettings | undefined | null;
  supplierState: string;
  recipientState: string;
}): GstCalcResult {
  const taxConfig = taxConfigFromMattressSettings(opts.mattressTax);
  return calculateGst(
    buildGstInput({
      taxableAmount: opts.taxableAmount,
      taxConfig,
      supplierState: opts.supplierState,
      recipientState: opts.recipientState,
    })
  );
}
