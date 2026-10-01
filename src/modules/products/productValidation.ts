import type {
  ProductWriteInput,
  ProductTaxProfile,
  MattressTaxSettingsWrite,
  Taxability,
} from "./productTypes";
import { isValidEffectiveDate } from "./productLogic";

export type ValidationResult = { valid: boolean; errors: string[] };

const TAXABILITIES: Taxability[] = [
  "TAXABLE",
  "EXEMPT",
  "NIL_RATED",
  "NON_GST",
];

export function validateTaxProfile(
  tax: ProductTaxProfile | undefined,
  label = "Tax"
): string[] {
  const errors: string[] = [];
  if (!tax) {
    errors.push(`${label} profile is required.`);
    return errors;
  }
  if (!TAXABILITIES.includes(tax.taxability)) {
    errors.push(`${label}: invalid taxability.`);
  }
  if (tax.taxability === "TAXABLE") {
    if (!tax.hsnSacCode?.trim()) {
      errors.push(`${label}: HSN/SAC is required for taxable items.`);
    }
    if (tax.gstRate == null || Number.isNaN(Number(tax.gstRate))) {
      errors.push(`${label}: GST rate is required for taxable items.`);
    } else if (Number(tax.gstRate) < 0 || Number(tax.gstRate) > 100) {
      errors.push(`${label}: GST rate must be between 0 and 100.`);
    }
  } else if (tax.gstRate != null && !Number.isNaN(Number(tax.gstRate))) {
    if (Number(tax.gstRate) < 0 || Number(tax.gstRate) > 100) {
      errors.push(`${label}: GST rate must be between 0 and 100.`);
    }
  }
  if (tax.hsnSacCode?.trim()) {
    const code = tax.hsnSacCode.trim();
    if (!/^[0-9A-Za-z]{4,16}$/.test(code)) {
      errors.push(`${label}: HSN/SAC should be 4–16 alphanumeric characters.`);
    }
  }
  if (!isValidEffectiveDate(tax.effectiveFrom)) {
    errors.push(`${label}: Effective date must be a valid date (YYYY-MM-DD).`);
  }
  return errors;
}

export function validateProduct(data: ProductWriteInput): ValidationResult {
  const errors: string[] = [];
  if (!data.name?.trim()) errors.push("Product name is required.");
  if (!data.unit?.toString().trim()) errors.push("Unit is required.");
  const price = Number(data.defaultSellingPrice);
  if (Number.isNaN(price) || price < 0) {
    errors.push("Default selling price must be zero or a positive number.");
  }
  errors.push(...validateTaxProfile(data.taxProfile, "Product tax"));
  return { valid: errors.length === 0, errors };
}

export function validateMattressTax(
  data: MattressTaxSettingsWrite
): ValidationResult {
  const errors = validateTaxProfile(
    {
      taxability: data.taxability,
      hsnSacCode: data.hsnSacCode,
      gstRate: data.gstRate,
      effectiveFrom: data.effectiveFrom,
      active: data.active !== false,
    },
    "Mattress tax"
  );
  return { valid: errors.length === 0, errors };
}
