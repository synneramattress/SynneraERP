/** Stock domain constants — Phase 2 */

export const STOCK_MOVEMENTS_COLLECTION = "stockMovements";

export const STOCK_MOVEMENT_TYPE = {
  purchase_receive: "purchase_receive",
  purchase_return: "purchase_return",
  adjustment: "adjustment",
  production_consume: "production_consume",
} as const;

export type StockMovementType =
  (typeof STOCK_MOVEMENT_TYPE)[keyof typeof STOCK_MOVEMENT_TYPE];
