export type {
  RetailFollowUp,
  RetailFollowUpStatus,
  RetailConversation,
  RetailDashboardBucket,
  RetailLeadSource,
  SalespersonOption,
} from "./retailFollowUpTypes";

export {
  RETAIL_FOLLOWUPS_COLLECTION,
  RETAIL_CONVERSATIONS_SUB,
  RETAIL_STATUSES,
  RETAIL_STATUS_LABELS,
  RETAIL_ORDER_PREFILL_KEY,
  RETAIL_LEAD_SOURCES,
} from "./retailFollowUpDefinitions";

export {
  toMillis,
  isActiveFollowUp,
  bucketForFollowUp,
  countBuckets,
  filterByBucket,
  initials,
  formatFollowUpTime,
  formatFollowUpDate,
  combineDateAndTime,
  defaultWhatsAppMessage,
} from "./logic";
export type { WhatsAppMessageLang } from "./logic";

export {
  fetchAllRetailFollowUps,
  fetchRetailFollowUpsForSalesperson,
  fetchRetailFollowUp,
  createRetailFollowUp,
  updateRetailFollowUp,
  assignRetailFollowUp,
  fetchConversations,
  addConversation,
  convertLeadOnRetailOrderSubmit,
  fetchActiveSalespersons,
} from "./services/retailFollowUpsService";
export type { CreateRetailFollowUpInput } from "./services/retailFollowUpsService";
