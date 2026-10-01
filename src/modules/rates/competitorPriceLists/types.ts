export type CompetitorPriceList = {
  id: string;
  companyName: string;
  /** ISO date string YYYY-MM-DD */
  listDate: string;
  mediaUrl: string;
  mediaType: "image" | "pdf";
  fileName?: string;
  createdBy?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};
