/** Transport domain types */

export type TransportDetail = {
  id: string;
  transportName: string;
  rajkotOfficeAddress: string;
  contactNumber: string;
  servingCities: string[];
  adminNotes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type TransportWriteInput = Omit<
  TransportDetail,
  "id" | "createdAt" | "updatedAt"
>;
