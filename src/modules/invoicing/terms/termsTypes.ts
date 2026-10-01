/**
 * Invoice Terms & Conditions — master + snapshot types.
 */

export type TermLocalizedText = {
  en: string;
  hi?: string;
  gu?: string;
};

export type InvoiceTermMaster = {
  id: string;
  /** Primary text (English); optional hi/gu for approved translations */
  text: string;
  textHi?: string;
  textGu?: string;
  active: boolean;
  sortOrder: number;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: string;
  updatedBy?: string;
};

/** Frozen copy on invoice (issued/draft snapshot) */
export type InvoiceTermSnapshot = {
  id: string;
  text: string;
  sortOrder: number;
};

export type InvoiceTermWrite = {
  text: string;
  textHi?: string;
  textGu?: string;
  active: boolean;
  sortOrder?: number;
};
