/**
 * @deprecated Import from `@/modules/rates` instead.
 * Kept as a thin compatibility shim so legacy paths do not break Netlify builds.
 */
export {
  MATTRESS_TYPE_KEYS,
  MATTRESS_TYPE_LABELS,
  FABRIC_KEYS,
  FABRIC_LABELS,
  WARRANTY_LABELS,
  THICKNESS_KEYS,
  fabricsForMattress,
  rateKey,
  warrantyKeysForMattress,
  thicknessKeysForMattress,
} from "@/modules/rates";

export type {
  FabricType,
  MattressTypeKey,
  RateSettings,
  ThicknessKey,
  WarrantyKey,
  RateMasterDoc,
} from "@/modules/rates";
