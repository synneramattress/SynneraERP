/**
 * Designs domain constants.
 */

import type { FabricType } from "@/lib/catalog/fabric";
import { FABRIC_KEYS, FABRIC_LABELS } from "@/lib/catalog/fabric";

/** Primary catalogue collection */
export const DESIGN_CATALOGUES_COLLECTION = "designCatalogues";

/** Legacy collection (fallback when catalogues empty) */
export const DESIGNS_LEGACY_COLLECTION = "designs";

/** Allowed fabric keys for catalogues (shared catalog) */
export const DESIGN_FABRIC_KEYS: FabricType[] = FABRIC_KEYS;

export const DESIGN_FABRIC_LABELS: Record<FabricType, string> = FABRIC_LABELS;

export const DESIGN_STATUS_ACTIVE = "active" as const;
export const DESIGN_STATUS_INACTIVE = "inactive" as const;
