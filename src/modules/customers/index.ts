export type { RetailCustomerMaster, CustomerWriteInput, CustomerListItem, CustomerGstRegistrationType } from "./customerTypes";
export { CUSTOMERS_COLLECTION, CUSTOMER_GST_TYPES, CUSTOMER_GST_TYPE_LABELS } from "./customerDefinitions";
export { validateMobile, normalizeMobile, validateCustomer } from "./customerValidation";
export {
  fetchCustomerById, fetchCustomers, fetchCustomersForSalesperson, searchCustomers,
  createCustomer, updateCustomer, mapCustomerDoc, toListItem,
} from "./customerService";
export { finalizeCustomerMasterForApprovedOrder, needsCustomerMasterFinalization, draftFromOrder, customerIdFromOrder } from "./finalizeFromOrder";
