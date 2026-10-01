/**
 * Orders module — Rates-style public API
 */

export type { CustomerMasterDraft, 
  Order,
  OrderItem,
  OrderReceivedVia,
  OrderStatus,
  OrderType,
  RetailCustomer,
  OrderWritePayload,
  OrderListSort,
} from "./orderTypes";

export {
  ORDERS_COLLECTION,
  ORDER_STATUS,
  ORDER_STATUSES_PARTY_EDITABLE,
  ORDER_STATUSES_PARTY_DELETABLE,
  PARTY_ORDER_STATUS_LABELS,
} from "./orderDefinitions";

export {
  normalizeOrderStatus,
  partyStatusLabel,
  canPartyEdit,
  canPartyDelete,
  canPartyResubmit,
  isReadyToDispatch,
  sortOrdersNewestFirst,
  formatOrderItemSize,
  emptyOrderItem,
  totalOrderQuantity,
} from "./logic";

export {
  fetchOrdersByParty,
  fetchOrderById,
  deleteOrder,
  fetchAllOrders,
  saveOrder,
  updateOrderFields,
  saveOrderWithId,
  stripUndefined,
} from "./services/ordersService";

export { usePartyOrders } from "./hooks/usePartyOrders";

export {
  ORDER_MATTRESS_TYPE_LABELS,
  mattressTypeKeyFromLabel,
  thicknessLabel,
  parseThicknessInches,
  standardThicknessOptions,
  warrantyOptionsForItem,
  fabricOptionsForItem,
  effectiveThicknessInches,
  getAllowedThicknessRange,
  isCustomThicknessValid,
  customThicknessInvalidMessage,
  validateOrderItem,
  validateOrderItems,
  normalizeItemAfterChange,
  foamWarrantyBlockedMessage,
  WARRANTY_LABELS,
  MATTRESS_TYPE_LABELS,
} from "./utils/orderItemRules";

export {
  getOrderItemKind,
  getOrderItemKindLabel,
  getOrderItemKindShort,
  getOrderItemKindBadgeClass,
  countOrderItemKinds,
  getOrderKindMixLabel,
  getOrderKindMixBadgeClass,
} from "./utils/itemKindDisplay";
export type { OrderItemKind } from "./utils/itemKindDisplay";

export {
  getFinancialDocumentType,
  canChooseFinancialPath,
  canClassifyAsOtherOrder,
  otherOrderBlockReason,
  classifyOrderAsOtherOrder,
  assertOrderAllowsTaxInvoice,
} from "./services/orderFinancialClassification";
export type { FinancialDocumentType } from "./services/orderFinancialClassification";

export {
  buildOrderDispatchPdf,
  getOrderDispatchPdfBlob,
  downloadOrderDispatchPdf,
  orderDispatchPdfFilename,
} from "./pdf/orderDispatchPdfService";
export type { OrderDispatchPdfOpts } from "./pdf/orderDispatchPdfService";
