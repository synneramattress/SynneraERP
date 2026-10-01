/**
 * Zod schemas for mattress size inputs — shared by forms and API validation.
 */

import { z } from "zod";

/** Reject values with 3+ decimal places. */
function maxTwoDecimals(n: number): boolean {
  if (!Number.isFinite(n)) return false;
  const scaled = Math.round(n * 100);
  return Math.abs(n * 100 - scaled) < 1e-9;
}

/** Thickness: positive whole integer ≥ 1, no decimals. */
export const thicknessSchema = z
  .number({ invalid_type_error: "Thickness must be a number" })
  .int({ message: "Thickness must be a whole number (no decimals)" })
  .min(1, { message: "Thickness must be at least 1 inch" });

/** Length: 60.00–108.00 inclusive, max 2 decimals. */
export const lengthSchema = z
  .number({ invalid_type_error: "Length must be a number" })
  .min(60, { message: "Length must be at least 60.00 inches" })
  .max(108, { message: "Length must be at most 108.00 inches" })
  .refine((n) => Number.isFinite(n), { message: "Length must be a finite number" })
  .refine(maxTwoDecimals, {
    message: "Length allows maximum 2 decimal places",
  });

/** Width: 1.00–108.00 inclusive, max 2 decimals. */
export const widthSchema = z
  .number({ invalid_type_error: "Width must be a number" })
  .min(1, { message: "Width must be at least 1.00 inch" })
  .max(108, { message: "Width must be at most 108.00 inches" })
  .refine((n) => Number.isFinite(n), { message: "Width must be a finite number" })
  .refine(maxTwoDecimals, {
    message: "Width allows maximum 2 decimal places",
  });

export const mattressSizeInputSchema = z.object({
  thickness: thicknessSchema.optional(),
  length: lengthSchema.optional(),
  width: widthSchema.optional(),
});

/** Full size required for area calculation (length + width). */
export const mattressSizeRequiredSchema = z.object({
  thickness: thicknessSchema.optional(),
  length: lengthSchema,
  width: widthSchema,
});

export type MattressSizeInputSchema = z.infer<typeof mattressSizeInputSchema>;
