/**
 * Job Work / OEM custom thickness rules (party + synnera fabric).
 *
 * Independent of Regular warranty→thickness catalog rules.
 *
 * Custom thickness (order create):
 * - Whole inches only: 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
 * - Reject fractions (2.1, 3.5) and out of range (1, 13)
 *
 * Rate key mapping when row is not stored at that thickness:
 * - 2, 3 → 4 inch rate
 * - 4, 5, 6, 8, 10, 12 → same (already in rate master)
 * - 7 → 8 inch rate
 * - 9 → 10 inch rate
 * - 11 → 12 inch rate
 */

export const JOB_WORK_CUSTOM_THICKNESS_MIN = 2;
export const JOB_WORK_CUSTOM_THICKNESS_MAX = 12;

/** Whole inches allowed for Job Work custom size thickness */
export const JOB_WORK_CUSTOM_THICKNESS_INCHES: readonly number[] = [
  2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
];

export function parseJobWorkThicknessInches(
  value?: string | number | null
): number | null {
  if (value == null || value === "") return null;
  const n = parseFloat(String(value).replace(/inch(es)?/gi, "").trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * Valid Job Work custom thickness: integer in [2, 12].
 */
export function isJobWorkCustomThicknessValid(
  inches: number | null | undefined
): boolean {
  if (inches == null || !Number.isFinite(inches)) return false;
  if (!Number.isInteger(inches)) return false;
  return (
    inches >= JOB_WORK_CUSTOM_THICKNESS_MIN &&
    inches <= JOB_WORK_CUSTOM_THICKNESS_MAX
  );
}

/**
 * Map ordered thickness → rate-master thickness key string.
 * Call after validation for custom; safe for standard chips too.
 */
export function mapJobWorkThicknessToRateKey(
  thickness: string | number | null | undefined
): string {
  const n = parseJobWorkThicknessInches(thickness);
  if (n == null) {
    return String(thickness ?? "")
      .trim()
      .replace(/inch(es)?/gi, "")
      .trim()
      .replace(/^0+(\d)/, "$1");
  }
  // Prefer integer path; if non-integer, still map via trunc for safety
  const i = Number.isInteger(n) ? n : Math.trunc(n);
  if (i === 2 || i === 3) return "4";
  if (i === 7) return "8";
  if (i === 9) return "10";
  if (i === 11) return "12";
  return String(i);
}

/** English message key for i18n / t() */
export function jobWorkCustomThicknessInvalidMessage(): string {
  return "Job Work custom thickness must be a whole number from 2 to 12 inches.";
}
