export type {
  CompanyProfile,
  CompanyProfileWrite,
  CompanyBankDetails,
  CompanyAuthorizedSignatory,
  CompanyInvoiceSettings,
  GstAmountType,
} from "./companyTypes";

export {
  COMPANY_SETTINGS_COLLECTION,
  COMPANY_SETTINGS_DOC,
  COMPANY_IMAGEKIT_FOLDER,
  DEFAULT_INVOICE_SETTINGS,
} from "./companyDefinitions";

export {
  validateGstin,
  validatePan,
  validatePincode,
  validateIfsc,
  validateAddress,
  validateCompanyProfile,
} from "./companyValidation";
export type { ValidationResult } from "./companyValidation";

export {
  fetchCompanyProfile,
  saveCompanyProfile,
  mapCompanyDoc,
  stripUndefinedDeep,
} from "./companyService";
