/**
 * Production domain types — owned by modules/production
 */

import type { Order } from "@/modules/orders/orderTypes";

export type { Order };

export type ProductionStatus =
  | "queue"
  | "assigned"
  | "in_production"
  | "ready_to_dispatch";

export type ProductionPriority = "normal" | "high" | "urgent";

export type ProdStatusOnly = ProductionStatus;

export type PhotoType = "full" | "length" | "width" | "thickness";

export interface ProductionPhoto {
  photoType: PhotoType;
  imageUrl: string;
  imageFileId?: string;
  uploadedBy: string;
  uploadedAt: unknown;
}

export interface ProductionMattress {
  id: string;
  mattressNumber: number;
  productType: string;
  size: string;
  thickness: string;
  sourceItemId: string;
  designCode?: string;
  designName?: string;
  photos?: Partial<Record<PhotoType, ProductionPhoto>>;
  photosComplete?: boolean;
  createdAt?: unknown;
}
