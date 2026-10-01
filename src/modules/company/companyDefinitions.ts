export const COMPANY_SETTINGS_COLLECTION = "settings";
export const COMPANY_SETTINGS_DOC = "company";
export const COMPANY_IMAGEKIT_FOLDER = "/synnera/company";

export const DEFAULT_INVOICE_SETTINGS = {
  invoicePrefix: "SYN",
  financialYearStartMonth: 4,
  financialYearStartDay: 1,
  gstAmountType: "EXCLUSIVE" as const,
} as const;
