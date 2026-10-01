/** Purchase module — Phase 1–4 */

export type {
  BillImage,
  PurchaseOrderItem,
  PurchaseOrderRecord,
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderInput,
  GoodsReceiptItem,
  GoodsReceiptRecord,
  ReceiveMaterialLineInput,
  ReceiveMaterialInput,
  PurchaseReturnItem,
  PurchaseReturnRecord,
  CreatePurchaseReturnLineInput,
  CreatePurchaseReturnInput,
} from "./purchaseTypes";

export {
  PURCHASE_ORDERS_COLLECTION,
  GOODS_RECEIPTS_COLLECTION,
  PURCHASE_RETURNS_COLLECTION,
  PO_STATUS,
  PO_STATUS_LABELS,
  PO_EDITABLE_STATUSES,
  PO_CANCELLABLE_STATUSES,
  PO_RECEIVABLE_STATUSES,
} from "./purchaseDefinitions";

export type { POStatus } from "./purchaseDefinitions";

export {
  getIndianFinancialYear,
  formatPONumber,
  formatGRNNumber,
  parsePOSeq,
  calcItemAmount,
  calcPOTotal,
  normalizePOItems,
  isPOEditable,
  isPOCancellable,
  isPOReceivable,
  poStatusLabel,
  pendingQty,
  derivePOStatusAfterReceive,
  validatePOInput,
  validateReceiveInput,
  formatRupee,
  todayISODate,
} from "./logic";

export { allocatePONumber } from "./services/poNumber";
export { allocateGRNNumber } from "./services/grnNumber";
export { allocateReturnNumber, formatReturnNumber } from "./services/returnNumber";

export {
  fetchAllPurchaseOrders,
  fetchPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  cancelPurchaseOrder,
  placePurchaseOrder,
} from "./services/purchaseOrdersService";

export {
  fetchGoodsReceiptsByPO,
  fetchAllGoodsReceipts,
  fetchGoodsReceiptById,
  receiveMaterial,
} from "./services/receivingService";

export {
  fetchAllPurchaseReturns,
  fetchPurchaseReturnsByGRN,
  createPurchaseReturn,
  getReturnableByMaterial,
} from "./services/purchaseReturnService";

export {
  PURCHASE_AUDIT_COLLECTION,
  writePurchaseAudit,
  fetchRecentPurchaseAudit,
  auditActionLabel,
} from "./services/purchaseAuditService";

export type {
  PurchaseAuditAction,
  PurchaseAuditEntry,
} from "./services/purchaseAuditService";
