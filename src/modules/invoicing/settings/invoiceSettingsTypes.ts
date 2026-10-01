import type { GstAmountType } from "@/modules/tax";

export type { GstAmountType };

export interface InvoiceTaxSettings {
  gstAmountType: GstAmountType;
}

export interface InvoiceNumberingSettings {
  invoicePrefix: string;
  financialYearStartMonth: number;
  financialYearStartDay: number;
}

export interface InvoiceSettings {
  tax: InvoiceTaxSettings;
  numbering: InvoiceNumberingSettings;
}
