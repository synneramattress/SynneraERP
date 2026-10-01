/** Suppliers module — payable / ledger + Phase 3 GST */

export type {
  SupplierRecord,
  SupplierTransaction,
  SupplierWithBalance,
  SupplierStatus,
  SupplierTransactionType,
  CreateSupplierInput,
  AddPurchaseInput,
  AddPaymentInput,
} from "./supplierTypes";

export {
  SUPPLIERS_COLLECTION,
  SUPPLIER_CATEGORIES,
  SUPPLIER_TRANSACTIONS_SUBCOLLECTION,
  SUPPLIER_STATUS_ACTIVE,
  SUPPLIER_STATUS_INACTIVE,
  SUPPLIER_TX_PURCHASE,
  SUPPLIER_TX_PAYMENT,
  SUPPLIER_TX_PURCHASE_RETURN,
  PAYMENT_MODES,
  PURCHASE_BILL_TYPES,
  PURCHASE_BILL_TYPE_LABELS,
  GST_RATES,
} from "./supplierDefinitions";

export type {
  PaymentMode,
  SupplierCategory,
  PurchaseBillType,
  GstRate,
} from "./supplierDefinitions";

export {
  formatRupee,
  isSupplierActive,
  supplierDisplayName,
  sortSuppliersByName,
  calcSupplierDue,
  withBalance,
  sortTransactionsNewestFirst,
  validatePurchase,
  validatePayment,
  todayISODate,
  parseDateInput,
  splitGstFromInclusiveTotal,
  calcGstFromTaxable,
  purchaseTypeLabel,
} from "./logic";

export {
  fetchAllSuppliers,
  fetchSupplierById,
  createSupplier,
  updateSupplier,
  fetchSuppliersOrdered,
} from "./services/suppliersService";

export {
  fetchSupplierTransactions,
  addSupplierPurchase,
  addSupplierPayment,
  fetchSuppliersWithBalances,
} from "./services/supplierTransactionsService";
