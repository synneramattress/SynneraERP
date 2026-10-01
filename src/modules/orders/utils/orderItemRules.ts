/**
 * Party Create Order rules — uses shared product catalog.
 * Rate Master remains independent for pricing data in Firestore.
 */

import type { OrderItem } from "../orderTypes";
import {
  MATTRESS_TYPE_LABEL_LIST,
  MATTRESS_TYPE_LABELS as SHARED_MATTRESS_LABELS,
  mattressTypeKeyFromLabel as sharedMattressKeyFromLabel,
  type MattressTypeKey,
} from "@/lib/catalog/mattressTypes";
import {
  standardThicknessOptions as sharedThicknessOptions,
  thicknessLabel as sharedThicknessLabel,
  parseThicknessInches as sharedParseThickness,
  isCustomThicknessValid as sharedCustomThicknessValid,
  getAllowedThicknessRange as sharedGetAllowedThicknessRange,
  customThicknessInvalidMessage as sharedCustomThicknessInvalidMessage,
} from "@/lib/catalog/thickness";
import {
  WARRANTY_LABELS as SHARED_WARRANTY_LABELS,
  warrantyOptionsForItem as sharedWarrantyOptions,
  normWarrantyKey,
  isFoam3YearThicknessOk,
  foamWarrantyBlockedMessage as sharedFoamMsg,
} from "@/lib/catalog/warranty";
import {
  fabricLabelsForMattressType,
  normalizeFabric,
} from "@/lib/catalog/fabric";
import {
  isJobWorkCustomThicknessValid,
  jobWorkCustomThicknessInvalidMessage,
} from "@/modules/rates/jobWorkThicknessRules";

export type PartyMattressKey = MattressTypeKey;

export const ORDER_MATTRESS_TYPE_LABELS: string[] = [
  ...MATTRESS_TYPE_LABEL_LIST,
];

export const MATTRESS_TYPE_LABELS: Record<PartyMattressKey, string> = {
  ...SHARED_MATTRESS_LABELS,
};

export const WARRANTY_LABELS: Record<string, string> = {
  ...SHARED_WARRANTY_LABELS,
};

export function mattressTypeKeyFromLabel(
  label?: string
): PartyMattressKey | null {
  return sharedMattressKeyFromLabel(label);
}

export function thicknessLabel(key: string | number): string {
  return sharedThicknessLabel(key);
}

export function parseThicknessInches(
  value?: string | number | null
): number | null {
  return sharedParseThickness(value);
}

export function standardThicknessOptions(
  typeLabel?: string,
  warrantyKey?: string | null
): string[] {
  return sharedThicknessOptions(typeLabel, warrantyKey);
}

export function warrantyOptionsForItem(
  typeLabel?: string,
  thicknessInches?: number | null
): { key: string; label: string }[] {
  return sharedWarrantyOptions(typeLabel, thicknessInches);
}

export function fabricOptionsForItem(typeLabel?: string): string[] {
  const key = mattressTypeKeyFromLabel(typeLabel);
  if (!key) return [];
  return fabricLabelsForMattressType(key);
}

export function effectiveThicknessInches(item: OrderItem): number | null {
  if (item.sizeType === "custom") {
    return parseThicknessInches(item.height);
  }
  return parseThicknessInches(item.thickness);
}

export function getAllowedThicknessRange(
  typeLabel?: string | null,
  warrantyKey?: string | null
): { min: number; max: number } {
  return sharedGetAllowedThicknessRange(typeLabel, warrantyKey);
}

export function isCustomThicknessValid(
  inches: number | null,
  typeLabel?: string | null,
  warrantyKey?: string | null
): boolean {
  return sharedCustomThicknessValid(inches, typeLabel, warrantyKey);
}

export function customThicknessInvalidMessage(
  typeLabel?: string | null,
  warrantyKey?: string | null
): string {
  return sharedCustomThicknessInvalidMessage(typeLabel, warrantyKey);
}

export function fabricFromItem(item: OrderItem): string {
  const direct = String((item as any).fabric || "").trim();
  if (direct) return direct;
  const m = String(item.notes || "").match(/^\[([^\]]+)\]/);
  return m?.[1]?.trim() || "";
}

export function validateOrderItem(
  item: OrderItem,
  mode: "draft" | "submitted"
): string | null {
  const typeKey = mattressTypeKeyFromLabel(item.type);
  if (!typeKey) {
    return "Please select a valid mattress type.";
  }

  if (!item.quantity || item.quantity < 1) {
    return "Quantity must be at least 1.";
  }

  const isJw = item.itemType === "JOB_WORK";
  const isJwParty = isJw && item.fabricSource === "PARTY";
  if (
    mode === "submitted" &&
    !isJwParty &&
    !String(item.designCode || "").trim()
  ) {
    return "Fabric design selection is required.";
  }
  if (
    mode === "submitted" &&
    isJwParty &&
    !item.jobWorkFabricType &&
    !String((item as any).fabric || "").trim()
  ) {
    return "Select Fabric Type";
  }

  const fabric = fabricFromItem(item);
  const allowedFabrics = fabricOptionsForItem(item.type);
  if (fabric && allowedFabrics.length) {
    const ok = allowedFabrics.some(
      (a) => normalizeFabric(a) === normalizeFabric(fabric)
    );
    if (!ok) {
      return `Fabric ${fabric} is not available for ${item.type}.`;
    }
  }

  const inches = effectiveThicknessInches(item);
  // Job Work: no warranty rules — thickness uses type base / JW custom rules only
  const warrantyForRules = isJw ? null : item.warranty;
  const w = isJw ? "" : normWarrantyKey(item.warranty);

  if (item.sizeType === "custom") {
    if (inches != null) {
      if (isJw) {
        if (!isJobWorkCustomThicknessValid(inches)) {
          return jobWorkCustomThicknessInvalidMessage();
        }
      } else if (!isCustomThicknessValid(inches, item.type, warrantyForRules)) {
        return customThicknessInvalidMessage(item.type, warrantyForRules);
      }
    }
    if (mode === "submitted") {
      if (item.length == null || item.width == null || inches == null) {
        return "Custom size requires length, width, and height (thickness).";
      }
    }
  } else {
    const allowed = standardThicknessOptions(item.type, warrantyForRules);
    const th = item.thickness || "";
    if (mode === "submitted" && !th) {
      return "Please select mattress thickness.";
    }
    if (th && allowed.length && !allowed.includes(th)) {
      return `Thickness ${th} is not available for ${item.type}.`;
    }
  }

  if (!isJw && !isFoam3YearThicknessOk(item.type, item.warranty, inches)) {
    return sharedFoamMsg();
  }

  // Job Work (Party Fabric + Synnera Fabric): warranty not required / not validated
  if (!isJw) {
    const warrantyOpts = warrantyOptionsForItem(item.type, inches);
    if (w) {
      const ok = warrantyOpts.some(
        (o) =>
          o.key === w ||
          o.label === item.warranty ||
          `${o.key} Years` === String(item.warranty || "")
      );
      if (!ok) {
        return "Selected warranty is not available for this mattress type.";
      }
    } else if (mode === "submitted") {
      return "Please select a warranty.";
    }
  }

  return null;
}

export function validateOrderItems(
  items: OrderItem[],
  mode: "draft" | "submitted"
): string | null {
  if (!items.length) return "Add at least one mattress item.";
  for (let i = 0; i < items.length; i++) {
    const err = validateOrderItem(items[i], mode);
    if (err) return `Item ${i + 1}: ${err}`;
  }
  return null;
}

export function normalizeItemAfterChange(
  item: OrderItem,
  field: string
): OrderItem {
  const next = { ...item };

  if (field === "type" || field === "sizeType" || field === "warranty") {
    if (next.sizeType !== "custom") {
      const opts = standardThicknessOptions(next.type, next.warranty);
      if (next.thickness && !opts.includes(next.thickness)) {
        next.thickness = opts[0] || "";
      }
    }
  }

  if (
    field === "type" ||
    field === "thickness" ||
    field === "height" ||
    field === "warranty"
  ) {
    const inches = effectiveThicknessInches(next);
    const opts = warrantyOptionsForItem(next.type, inches);
    const w = normWarrantyKey(next.warranty);
    const stillOk = opts.some((o) => o.key === w);
    if (w && !stillOk) {
      next.warranty = opts[0]?.key || "";
    }
  }

  if (field === "type") {
    const fabs = fabricOptionsForItem(next.type);
    const fab = fabricFromItem(next);
    if (fab && fabs.length && !fabs.includes(fab)) {
      (next as any).fabric = fabs[0] || "";
      const rest = String(next.notes || "").replace(/^\[[^\]]+\]\s*/, "");
      next.notes = fabs[0]
        ? rest
          ? `[${fabs[0]}] ${rest}`
          : `[${fabs[0]}]`
        : rest;
    }
  }

  if (field === "sizeType" && next.sizeType === "custom") {
    next.thickness = "";
  }

  return next;
}

export function foamWarrantyBlockedMessage(_inches?: number): string {
  return sharedFoamMsg();
}
