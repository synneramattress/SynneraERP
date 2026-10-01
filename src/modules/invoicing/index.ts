export type {
  InvoiceSource,
  InvoiceStatus,
  InvoiceDocumentType,
  InvoiceType,
  InvoiceItemSourceType,
  InvoicePartyRef,
  InvoiceSupplierSnapshot,
  InvoiceRecipientSnapshot,
  InvoiceLineGst,
  InvoiceItem,
  InvoiceGstTotals,
  Invoice,
  InvoiceDraftWrite,
} from "./invoiceTypes";

export {
  INVOICES_COLLECTION,
  INVOICE_COUNTER_PREFIX,
  INVOICE_STATUSES,
  INVOICE_STATUS_LABELS,
  INVOICE_SOURCES,
  INVOICE_TYPES,
  INVOICE_ITEM_SOURCE_TYPES,
  DEFAULT_INVOICE_PREFIX,
} from "./invoiceDefinitions";

export {
  isOrderEligibleForMattressInvoice,
  canTransitionInvoiceStatus,
  isInvoiceMutable,
  isInvoiceIssuedImmutable,
  mattressItemsFromInvoice,
  productMasterItemsFromInvoice,
  assertDraftEditable,
  orderHasMattressLines,
  isValidFinancialYearLabel,
  findIssuedInvoiceForOrder,
  canCreateMattressInvoiceAgainstExisting,
  isReadyToDispatch,
  normalizeOrderStatus,
} from "./invoiceLogic";

export {
  getFinancialYear,
  financialYearShort,
  formatInvoiceNumber,
  invoiceCounterDocId,
} from "./invoiceNumbering";

export {
  validateInvoiceItem,
  validateInvoiceDraft,
  validateIssue,
  validateCancel,
  assertStatusTransition,
  isValidInvoiceType,
} from "./invoiceValidation";
export type { ValidationResult } from "./invoiceValidation";

export {
  snapshotSupplier,
  snapshotRecipient,
  buildMattressInvoiceItem,
  buildMattressItemsFromOrder,
  buildProductMasterInvoiceItem,
} from "./invoiceSnapshot";

export {
  resolveInvoiceRecipientFromOrder,
  mapPartyToRecipient,
  mapCustomerToRecipient,
  isRetailOrder,
} from "./resolveInvoiceRecipient";
export type {
  ResolvedInvoiceRecipient,
  ResolveInvoiceRecipientResult,
} from "./resolveInvoiceRecipient";

export { sumInvoiceItems, calculateInvoiceTotals } from "./utils/invoiceTotals";

export {
  canCreateInvoice,
  canEditInvoice,
  canIssueInvoice,
  canCancelInvoice,
  canViewAllInvoices,
  canViewOwnInvoices,
  canDownloadShareInvoice,
} from "./invoicePermissions";

export {
  fetchInvoiceById,
  fetchInvoices,
  createDraftInvoice,
  updateDraftInvoice,
  issueInvoice,
  cancelInvoice,
  enforceInvoiceSources,
} from "./services/invoicesService";

export { allocateInvoiceNumber } from "./services/invoiceNumberService";

export { InvoiceStatusBadge } from "./components/InvoiceStatusBadge";
export { InvoiceList } from "./components/InvoiceList";
export { InvoiceFilters } from "./components/InvoiceFilters";
export type { InvoiceFilterState } from "./components/InvoiceFilters";
export { useInvoices, useInvoice } from "./hooks/useInvoices";

export { InvoiceForm } from "./components/InvoiceForm";
export { ProductSelector } from "./components/ProductSelector";
export { InvoiceTotals } from "./components/InvoiceTotals";

export { recalculateProductMasterLine } from "./utils/recalculateLine";

export { InvoiceSettingsPanel } from "./settings/components/InvoiceSettingsPanel";
export { InvoiceTaxSettings as InvoiceTaxSettingsSection } from "./settings/components/InvoiceTaxSettings";
export {
  fetchInvoiceSettings,
  fetchGstAmountType,
  saveGstAmountType,
  saveInvoiceSettings,
  invoiceSettingsFromCompany,
} from "./settings/invoiceSettingsService";
export type { InvoiceSettings, InvoiceTaxSettings, InvoiceNumberingSettings, GstAmountType } from "./settings/invoiceSettingsTypes";
export { isValidGstAmountType, validateGstAmountType } from "./settings/invoiceSettingsValidation";

export { IssueInvoiceDialog } from "./components/IssueInvoiceDialog";
export { CancelInvoiceDialog } from "./components/CancelInvoiceDialog";

export { InvoiceDocument } from "./document/InvoiceDocument";
export { InvoicePrintActions } from "./document/InvoicePrintActions";
export { amountInWordsRupees, integerToIndianWords } from "./utils/amountInWords";
export {
  buildInvoicePdf,
  downloadInvoicePdf,
  getInvoicePdfBlob,
  invoicePdfFilename,
} from "./pdf/invoicePdfService";

export { InvoiceNumberingSettings as InvoiceNumberingSettingsSection } from "./settings/components/InvoiceNumberingSettings";


export type { InvoiceTermMaster, InvoiceTermSnapshot, InvoiceTermWrite, TermLocalizedText } from "./terms/termsTypes";
export { INVOICE_TERMS_COLLECTION } from "./terms/termsDefinitions";
export {
  sortTermsByOrder,
  activeTermsOnly,
  buildTermsSnapshot,
  resolveTermDisplayText,
} from "./terms/termsLogic";
export {
  fetchAllInvoiceTerms,
  createInvoiceTerm,
  updateInvoiceTerm,
  reorderInvoiceTerms,
  deleteInvoiceTerm,
} from "./terms/termsService";
export { TermsSettingsPanel } from "./terms/TermsSettingsPanel";
