/**
 * Rate Master definitions — product keys from shared catalog;
 * pricing helpers stay here.
 */

import type { FabricType } from "@/lib/catalog/fabric";
import {
  FABRIC_KEYS as SHARED_FABRIC_KEYS,
  FABRIC_LABELS as SHARED_FABRIC_LABELS,
  fabricsForMattressType,
} from "@/lib/catalog/fabric";
import {
  MATTRESS_TYPE_KEYS as SHARED_MATTRESS_KEYS,
  MATTRESS_TYPE_LABELS as SHARED_MATTRESS_LABELS,
} from "@/lib/catalog/mattressTypes";
import {
  THICKNESS_KEYS as SHARED_THICKNESS_KEYS,
  thicknessKeysForType,
} from "@/lib/catalog/thickness";
import {
  WARRANTY_LABELS as SHARED_WARRANTY_LABELS,
  warrantyKeysForType,
} from "@/lib/catalog/warranty";
import type {
  RateMattressTypeKey,
  RateWarrantyKey,
  RateThicknessKey,
} from "./rateTypes";

export const MATTRESS_TYPE_KEYS: RateMattressTypeKey[] = [
  ...SHARED_MATTRESS_KEYS,
];

export const MATTRESS_TYPE_LABELS: Record<RateMattressTypeKey, string> = {
  ...SHARED_MATTRESS_LABELS,
};

export const FABRIC_KEYS: FabricType[] = SHARED_FABRIC_KEYS;
export const FABRIC_LABELS: Record<FabricType, string> = SHARED_FABRIC_LABELS;

export const WARRANTY_LABELS: Record<RateWarrantyKey, string> = {
  ...SHARED_WARRANTY_LABELS,
};

export const THICKNESS_KEYS: RateThicknessKey[] = [...SHARED_THICKNESS_KEYS];

export function warrantyKeysForMattress(
  type: RateMattressTypeKey
): RateWarrantyKey[] {
  return warrantyKeysForType(type) as RateWarrantyKey[];
}

export function thicknessKeysForMattress(
  type: RateMattressTypeKey,
  warranty?: RateWarrantyKey | string | null
): RateThicknessKey[] {
  return thicknessKeysForType(type, warranty) as RateThicknessKey[];
}

export function fabricsForMattress(type: RateMattressTypeKey): FabricType[] {
  return fabricsForMattressType(type);
}

export function rateKey(
  type: RateMattressTypeKey,
  warranty: RateWarrantyKey,
  fabric: FabricType,
  thickness: RateThicknessKey
): string {
  return `${type}|${warranty}|${fabric}|${thickness}`;
}

export function masterKey(
  type: RateMattressTypeKey,
  warranty: RateWarrantyKey,
  thickness: RateThicknessKey
): string {
  return rateKey(type, warranty, "jacquard", thickness);
}
