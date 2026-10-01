import type { Address } from "@/types/address";
import {
  validateGstin,
  validatePan,
  validateAddress,
  type ValidationResult,
} from "@/modules/company/companyValidation";
import type {
  CustomerWriteInput,
  CustomerGstRegistrationType,
} from "./customerTypes";

const MOBILE_REGEX = /^[6-9]\d{9}$/;

export function validateMobile(mobile?: string | null): string | null {
  if (!mobile?.trim()) return "Mobile number is required.";
  const digits = mobile.replace(/\D/g, "");
  const ten =
    digits.length === 12 && digits.startsWith("91")
      ? digits.slice(2)
      : digits.length === 10
        ? digits
        : digits;
  if (!MOBILE_REGEX.test(ten))
    return "Enter a valid 10-digit Indian mobile number.";
  return null;
}

export function normalizeMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return digits.slice(-10);
}

export function validateCustomer(
  data: CustomerWriteInput,
  opts: { partial?: boolean } = {}
): ValidationResult {
  const errors: string[] = [];
  const partial = opts.partial === true;
  if (!partial || data.name !== undefined) {
    if (!data.name?.trim()) errors.push("Customer name is required.");
  }
  if (!partial || data.mobile !== undefined) {
    const m = validateMobile(data.mobile);
    if (m) errors.push(m);
  }
  if (data.alternateMobile?.trim()) {
    const m2 = validateMobile(data.alternateMobile);
    if (m2) errors.push(`Alternate mobile: ${m2}`);
  }
  const gstType: CustomerGstRegistrationType =
    data.gstRegistrationType || "UNREGISTERED";
  if (gstType === "REGISTERED_REGULAR") {
    const g = validateGstin(data.gstin);
    if (g) errors.push(g);
    else if (!data.gstin?.trim() && !partial)
      errors.push("GSTIN is required for registered customers.");
  } else if (data.gstin?.trim()) {
    const g = validateGstin(data.gstin);
    if (g) errors.push(g);
  }
  const panErr = validatePan(data.pan);
  if (panErr) errors.push(panErr);

  // PIN optional. Full GST address (state + PIN) only for registered customers.
  const needFullAddr = gstType === "REGISTERED_REGULAR" && !partial;
  if (!partial || data.billingAddress) {
    errors.push(
      ...validateAddress(data.billingAddress as Address | undefined, {
        // For unregistered retail: name+mobile enough; address soft
        required: needFullAddr,
        requireFullAddress: needFullAddr,
        requirePincode: needFullAddr,
        label: "Billing address",
      })
    );
  }
  if (data.shippingSameAsBilling === false && data.shippingAddress) {
    errors.push(
      ...validateAddress(data.shippingAddress as Address | undefined, {
        required: needFullAddr,
        requireFullAddress: needFullAddr,
        requirePincode: needFullAddr,
        label: "Shipping address",
      })
    );
  }
  return { valid: errors.length === 0, errors };
}
