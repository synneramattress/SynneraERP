/** Stock module — Phase 2 */

export type {
  StockMovementRecord,
  MaterialStockSummary,
} from "./stockTypes";

export {
  STOCK_MOVEMENTS_COLLECTION,
  STOCK_MOVEMENT_TYPE,
} from "./stockDefinitions";

export type { StockMovementType } from "./stockDefinitions";

export { formatStockQty, sortStockByName } from "./logic";

export {
  getMaterialStock,
  applyStockIn,
  applyStockOut,
  fetchStockSummary,
  fetchRecentMovements,
} from "./services/stockService";
