/** Production module — Rates-style structure */

export type {
  ProdStatusOnly,
  Order,
  ProductionMattress,
  ProductionStatus,
  ProductionPriority,
  PhotoType,
  ProductionPhoto,
} from "./productionTypes";

export {
  ORDERS_COLLECTION,
  PRODUCTION_MATTRESSES_SUB,
  PRODUCTION_STATUS,
  PRODUCTION_STATUS_LABELS,
  ACTIVE_PRODUCTION_STATUSES,
} from "./productionDefinitions";

export {
  normalizeProdStatus,
  resolveProdStatus,
  productionStatusLabel,
  sortMattressesByNumber,
  sortOrdersByActivity,
} from "./logic";

export {
  fetchProductionMattresses,
  fetchOrdersAssignedToEmployee,
  assignOrderToEmployee,
  markPartyVerified,
  updateProductionOrder,
  saveProductionMattress,
  createProductionMattresses,
  fetchActiveProductionOrderCounts,
} from "./services/productionService";
