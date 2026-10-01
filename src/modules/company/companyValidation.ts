import type { Address } from "@/types/address";
import type { CompanyProfileWrite } from "./companyTypes";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i;
const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/i;

export type ValidationResult = { valid: boolean; errors: string[] };

export function validateGstin(gstin?: string | null): string | null {
  if (!gstin?.trim()) return null;
  if (!GSTIN_REGEX.test(gstin.trim().toUpperCase())) {
    return "GSTIN must be 15 characters in valid format (e.g. 24AAAAA0000A1Z5).";
  }
  return null;
}

export function validatePan(pan?: string | null): string | null {
  if (!pan?.trim()) return null;
  if (!PAN_REGEX.test(pan.trim().toUpperCase())) {
    return "PAN must be 10 characters (e.g. ABCDE1234F).";
  }
  return null;
}

export function validatePincode(pincode?: string | null): string | null {
  // Empty is valid — PIN is optional unless caller enforces requirePincode
  if (!pincode?.trim()) return null;
  if (!PINCODE_REGEX.test(pincode.trim())) {
    return "PIN code must be a 6-digit Indian PIN.";
  }
  return null;
}

export function validateIfsc(ifsc?: string | null): string | null {
  if (!ifsc?.trim()) return null;
  if (!IFSC_REGEX.test(ifsc.trim().toUpperCase())) {
    return "IFSC must be 11 characters (e.g. SBIN0001234).";
  }
  return null;
}

export function validateAddress(
  address: Address | undefined,
  opts: {
    required?: boolean;
    label?: string;
    /** Require state + state code (GST full address). Default false. */
    requireFullAddress?: boolean;
    /** Require 6-digit PIN. Default false (PIN optional). */
    requirePincode?: boolean;
  } = {}
): string[] {
  const errors: string[] = [];
  const label = opts.label || "Address";
  if (!address) {
    if (opts.required) errors.push(`${label} is required.`);
    return errors;
  }
  const hasAny =
    Boolean(address.line1?.trim()) ||
    Boolean(address.city?.trim()) ||
    Boolean(address.pincode?.trim()) ||
    Boolean(address.state?.trim());

  if (opts.required || hasAny) {
    if (opts.required || address.line1 || address.city) {
      if (!address.line1?.trim()) errors.push(`${label}: line 1 is required.`);
      if (!address.city?.trim()) errors.push(`${label}: city is required.`);
    }
    if (opts.requireFullAddress) {
      if (!address.state?.trim()) errors.push(`${label}: state is required.`);
      if (!address.stateCode?.trim())
        errors.push(`${label}: state code is required.`);
    } else {
      // Optional state: if one is filled without the other, still OK for retail
    }
    // PIN optional unless requirePincode; if present must be valid format
    if (address.pincode?.trim()) {
      const pinErr = validatePincode(address.pincode);
      if (pinErr) errors.push(`${label}: ${pinErr}`);
    } else if (opts.requirePincode) {
      errors.push(`${label}: PIN code is required.`);
    }
  }
  return errors;
}

export function validateCompanyProfile(
  data: CompanyProfileWrite,
  opts: { requireGst?: boolean } = {}
): ValidationResult {
  const errors: string[] = [];
  if (!data.legalName?.trim()) errors.push("Legal business name is required.");
  if (opts.requireGst || data.gstin?.trim()) {
    const g = validateGstin(data.gstin);
    if (g) errors.push(g);
    else if (opts.requireGst && !data.gstin?.trim()) {
      errors.push("GSTIN is required for a GST-registered business.");
    }
  }
  const panErr = validatePan(data.pan);
  if (panErr) errors.push(panErr);
  const needFull = Boolean(opts.requireGst || data.gstin?.trim());
  errors.push(
    ...validateAddress(data.address, {
      required: needFull,
      requireFullAddress: needFull,
      requirePincode: needFull,
      label: "Registered address",
    })
  );
  if (data.bankDetails?.ifsc) {
    const ifscErr = validateIfsc(data.bankDetails.ifsc);
    if (ifscErr) errors.push(ifscErr);
  }
  if (
    data.bankDetails?.accountNumber &&
    !/^\d{9,18}$/.test(data.bankDetails.accountNumber.trim())
  ) {
    errors.push("Account number should be 9–18 digits.");
  }
  return { valid: errors.length === 0, errors };
}
