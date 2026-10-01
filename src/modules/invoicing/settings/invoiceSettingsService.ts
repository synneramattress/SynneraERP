import {
  fetchCompanyProfile,
  saveCompanyProfile,
  type CompanyProfile,
} from "@/modules/company";
import {
  normalizeGstAmountType,
  type GstAmountType,
} from "@/modules/tax";
import { validateGstAmountType } from "./invoiceSettingsValidation";
import type {
  InvoiceSettings,
  InvoiceTaxSettings,
  InvoiceNumberingSettings,
} from "./invoiceSettingsTypes";

const DEFAULT_TAX: InvoiceTaxSettings = { gstAmountType: "EXCLUSIVE" };
const DEFAULT_NUMBERING: InvoiceNumberingSettings = {
  invoicePrefix: "SYN",
  financialYearStartMonth: 4,
  financialYearStartDay: 1,
};

export function invoiceSettingsFromCompany(
  company: CompanyProfile | null | undefined
): InvoiceSettings {
  const inv = company?.invoiceSettings;
  const mode = normalizeGstAmountType(inv?.gstAmountType);
  return {
    tax: { gstAmountType: mode },
    numbering: {
      invoicePrefix: inv?.invoicePrefix || DEFAULT_NUMBERING.invoicePrefix,
      financialYearStartMonth:
        inv?.financialYearStartMonth ??
        DEFAULT_NUMBERING.financialYearStartMonth,
      financialYearStartDay:
        inv?.financialYearStartDay ?? DEFAULT_NUMBERING.financialYearStartDay,
    },
  };
}

export async function fetchInvoiceSettings(): Promise<InvoiceSettings> {
  const company = await fetchCompanyProfile();
  return invoiceSettingsFromCompany(company);
}

export async function fetchGstAmountType(): Promise<GstAmountType> {
  const s = await fetchInvoiceSettings();
  return s.tax.gstAmountType;
}

export async function saveInvoiceSettings(
  input: {
    gstAmountType: GstAmountType;
    invoicePrefix: string;
    financialYearStartMonth: number;
    financialYearStartDay: number;
  },
  meta?: { updatedBy?: string }
): Promise<InvoiceSettings> {
  const gstAmountType = validateGstAmountType(input.gstAmountType);
  const invoicePrefix = String(input.invoicePrefix || "SYN")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10) || "SYN";
  const financialYearStartMonth = Math.min(
    12,
    Math.max(1, Number(input.financialYearStartMonth) || 4)
  );
  const financialYearStartDay = Math.min(
    28,
    Math.max(1, Number(input.financialYearStartDay) || 1)
  );

  await saveCompanyProfile(
    {
      invoiceSettings: {
        invoicePrefix,
        financialYearStartMonth,
        financialYearStartDay,
        gstAmountType,
      },
    },
    meta?.updatedBy
  );

  return {
    tax: { gstAmountType },
    numbering: {
      invoicePrefix,
      financialYearStartMonth,
      financialYearStartDay,
    },
  };
}

/** @deprecated prefer saveInvoiceSettings — kept for callers that only change mode */
export async function saveGstAmountType(
  value: GstAmountType,
  meta?: { updatedBy?: string }
): Promise<InvoiceSettings> {
  const current = await fetchInvoiceSettings();
  return saveInvoiceSettings(
    {
      gstAmountType: value,
      invoicePrefix: current.numbering.invoicePrefix,
      financialYearStartMonth: current.numbering.financialYearStartMonth,
      financialYearStartDay: current.numbering.financialYearStartDay,
    },
    meta
  );
}

export { DEFAULT_TAX, DEFAULT_NUMBERING };
