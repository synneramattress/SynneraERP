import type { Address } from "@/types/address";

export interface CompanyBankDetails {
  bankName: string;
  accountName?: string;
  accountNumber: string;
  ifsc: string;
  branch?: string;
  upiId?: string;
  /** Optimized data-URL or path for UPI QR (stored in app, not ImageKit) */
  upiQrImageUrl?: string;
}

export interface CompanyAuthorizedSignatory {
  name: string;
  designation?: string;
  signatureImageUrl?: string;
  stampImageUrl?: string;
}

/** GST amount interpretation for invoice pricing (global Invoice Setting). */
export type GstAmountType = "EXCLUSIVE" | "INCLUSIVE";

export interface CompanyInvoiceSettings {
  invoicePrefix: string;
  financialYearStartMonth: number;
  financialYearStartDay: number;
  /** Default EXCLUSIVE when missing (legacy company docs). */
  gstAmountType?: GstAmountType;
}

export interface CompanyProfile {
  id: "company";
  legalName: string;
  tradeName?: string;
  gstin: string;
  /** MSME Udyam registration — printed on Delivery Challan */
  udyamNumber?: string;
  pan?: string;
  address: Address;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  authorizedSignatory: CompanyAuthorizedSignatory;
  bankDetails?: CompanyBankDetails;
  invoiceSettings: CompanyInvoiceSettings;
  updatedAt?: unknown;
  updatedBy?: string;
}

export type CompanyProfileWrite = Partial<Omit<CompanyProfile, "id">> & {
  legalName?: string;
  gstin?: string;
  address?: Address;
  authorizedSignatory?: Partial<CompanyAuthorizedSignatory>;
  bankDetails?: Partial<CompanyBankDetails> | null;
  invoiceSettings?: Partial<CompanyInvoiceSettings>;
};
