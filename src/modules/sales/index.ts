/**
 * Sales module — salesperson management + field sales (prospects) + retail pricing.
 */

export {
  SALESPERSONS_COLLECTION,
  SALES_USERS_COLLECTION,
  SALESPERSON_ROLE,
  SALESPERSON_STATUS_ACTIVE,
  SALESPERSON_STATUS_INACTIVE,
  SALESPERSON_COUNTER_DOC,
  SALESPERSON_ID_PREFIX,
  PROSPECTS_COLLECTION,
  SALES_ACTIVITIES_COLLECTION,
  SALES_FOLLOWUPS_COLLECTION,
  SALES_CONVERSION_REQUESTS_COLLECTION,
  PROSPECT_STATUSES,
  PROSPECT_STATUS_LABELS,
  BUSINESS_TYPES,
  BUSINESS_TYPE_LABELS,
  CALL_OUTCOMES,
  CALL_OUTCOME_LABELS,
  FOLLOWUP_METHODS,
  FOLLOWUP_METHOD_LABELS,
} from "./salesDefinitions";

export type {
  ProspectStatus,
  BusinessType,
  CallOutcome,
  FollowUpMethod,
} from "./salesDefinitions";

export type {
  Prospect,
  SalesActivity,
  SalesFollowUp,
  SalesConversionRequest,
} from "./prospectTypes";

export type {
  SalespersonRecord,
  SalespersonStatus,
  SalespersonProfile,
  SalespersonProfileFields,
  AccountStatus,
} from "./salesTypes";

export { asSalespersonProfile } from "./salesTypes";

export {
  mapSalesperson,
  isSalespersonActive,
  isRegularSalarySalesperson,
  isAssignableSalesperson,
  formatSalespersonOptionLabel,
  looksLikeSalesperson,
  salespersonDisplayName,
  normalizeSalespersonId,
  sortSalespersonsByName,
  countSalespersonStatuses,
  formatSalespersonId,
} from "./logic";

export {
  fetchAllSalespersons,
  fetchRegularSalarySalespersons,
  isSalespersonIdTaken,
  generateSalespersonId,
  createSalespersonProfile,
  updateSalespersonStatus,
} from "./services/salespersonsService";
export type { CreateSalespersonProfileInput } from "./services/salespersonsService";

export {
  priceRetailLine,
  applyRetailPricingToItem,
  validateRetailItemsAgainstPartyRate,
  sumRetailTotal,
  resolvePartyAndRetailRates,
} from "./retailPricing";
export type { RetailPricingMode, RetailLinePricing } from "./retailPricing";

export {
  saveRetailOrder,
  fetchRetailOrdersForSalesperson,
  fetchAllRetailOrders,
  findRetailOrdersByMobile,
  normalizeMobile,
} from "./services/retailOrdersService";
export type { RetailCustomerInput, SaveRetailOrderInput } from "./services/retailOrdersService";

export {
  fetchProspectsForSalesperson,
  fetchAllProspects,
  fetchProspectById,
  findProspectsByMobile,
  createProspect,
  updateProspect,
  reassignProspect,
  recordCallActivity,
  startVisit,
  endVisit,
  fetchActivitiesForProspect,
  scheduleFollowUp,
  fetchFollowUpsForSalesperson,
  completeFollowUp,
  requestProspectConversion,
  completeProspectConversion,
  fetchPendingConversionRequests,
  followUpBucket,
} from "./services/prospectsService";
export type { CreateProspectInput } from "./services/prospectsService";


export {
  SALES_COMMISSIONS_COLLECTION,
  COMPENSATION_TYPES,
  COMMISSION_STATUSES,
  COMMISSION_PAYMENT_STATUSES,
} from "./salesDefinitions";
export type {
  CompensationType,
  CommissionStatus,
  CommissionPaymentStatus,
} from "./salesDefinitions";

export type { SalesCommission } from "./commissionTypes";

export {
  calculateCommission,
  weekRangeContaining,
  monthRangeContaining,
  shiftWeek,
  shiftMonth,
  formatWeekLabel,
  formatMonthLabel,
  summarizeCommissions,
  sumPartyRateAmount,
  sumActualSalesAmount,
  isInRange,
  toMillis as commissionToMillis,
} from "./commissionLogic";
export type { CommissionSummary } from "./commissionLogic";

export {
  commissionDocId,
  fetchCommissionById,
  fetchCommissionByOrderId,
  fetchCommissionsForSalesperson,
  fetchAllCommissions,
  ensureEarnedCommissionFromOrder,
  markCommissionPaid,
  markCommissionUnpaid,
  markRetailOrderDelivered,
  markRetailCustomerPaymentReceived,
  tryEarnCommissionForOrderId,
} from "./services/commissionService";

export {
  updateSalespersonCompensation,
  updateSalespersonProfile,
} from "./services/salespersonsService";
export type { UpdateSalespersonProfileInput } from "./services/salespersonsService";

export {
  fetchAssignedPartiesForSalesperson,
  fetchLastAssistedOrderForParty,
  cloneItemsForReorder,
  saveAssistedPartyOrder,
  buildAssistedWhatsAppText,
} from "./services/assistedOrderService";
export type {
  AssignedPartyRow,
  LastAssistedOrderSummary,
  SaveAssistedPartyOrderInput,
  SaveAssistedPartyOrderResult,
} from "./services/assistedOrderService";
