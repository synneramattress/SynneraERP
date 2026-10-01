import type { Address } from "@/types/address";

export type CustomerGstRegistrationType = "REGISTERED_REGULAR" | "UNREGISTERED";

export interface RetailCustomerMaster {
  id: string;
  customerCode?: string;
  name: string;
  mobile: string;
  alternateMobile?: string;
  email?: string;
  gstRegistrationType: CustomerGstRegistrationType;
  gstin?: string;
  pan?: string;
  billingAddress: Address;
  shippingAddress?: Address;
  shippingSameAsBilling?: boolean;
  salespersonId?: string;
  salespersonName?: string;
  notes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: string;
}

export type CustomerWriteInput = Partial<Omit<RetailCustomerMaster, "id" | "createdAt" | "updatedAt">> & {
  name?: string;
  mobile?: string;
  gstRegistrationType?: CustomerGstRegistrationType;
  billingAddress?: Address;
};

export type CustomerListItem = {
  id: string;
  name: string;
  mobile: string;
  city?: string;
  gstRegistrationType: CustomerGstRegistrationType;
  gstin?: string;
  salespersonId?: string;
  salespersonName?: string;
  updatedAt?: unknown;
};
