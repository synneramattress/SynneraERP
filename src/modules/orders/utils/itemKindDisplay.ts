/**
 * Shared Regular / Job Work line labels for Party, Admin, Employee UIs.
 */

import type { OrderItem } from "../orderTypes";

export type OrderItemKind =
  | "REGULAR"
  | "JOB_WORK_PARTY"
  | "JOB_WORK_SYNNERA";

export function getOrderItemKind(item: Partial<OrderItem> | null | undefined): OrderItemKind {
  if (item?.itemType === "JOB_WORK") {
    return item.fabricSource === "PARTY" ? "JOB_WORK_PARTY" : "JOB_WORK_SYNNERA";
  }
  return "REGULAR";
}

/** Full badge label */
export function getOrderItemKindLabel(
  item: Partial<OrderItem> | null | undefined
): string {
  const k = getOrderItemKind(item);
  if (k === "JOB_WORK_PARTY") return "Job Work · Party Fabric";
  if (k === "JOB_WORK_SYNNERA") return "Job Work · Synnera Fabric";
  return "Regular";
}

/** Compact label for tight list cards */
export function getOrderItemKindShort(
  item: Partial<OrderItem> | null | undefined
): string {
  const k = getOrderItemKind(item);
  if (k === "JOB_WORK_PARTY") return "JW·Party";
  if (k === "JOB_WORK_SYNNERA") return "JW·Synnera";
  return "Regular";
}

/** Tailwind classes for kind pill */
export function getOrderItemKindBadgeClass(
  item: Partial<OrderItem> | null | undefined
): string {
  const k = getOrderItemKind(item);
  if (k === "JOB_WORK_PARTY") {
    return "bg-amber-50 text-amber-800 border-amber-200";
  }
  if (k === "JOB_WORK_SYNNERA") {
    return "bg-violet-50 text-violet-800 border-violet-200";
  }
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export function countOrderItemKinds(items: OrderItem[] | null | undefined): {
  regular: number;
  jobWork: number;
  total: number;
} {
  let regular = 0;
  let jobWork = 0;
  for (const it of items || []) {
    if (it?.itemType === "JOB_WORK") jobWork += 1;
    else regular += 1;
  }
  return { regular, jobWork, total: regular + jobWork };
}

/** Order-level summary chip, e.g. "Regular + Job Work" */
export function getOrderKindMixLabel(
  items: OrderItem[] | null | undefined
): string | null {
  const { regular, jobWork, total } = countOrderItemKinds(items);
  if (total === 0) return null;
  if (regular > 0 && jobWork > 0) return "Regular + Job Work";
  if (jobWork > 0) return "Job Work";
  return "Regular";
}

export function getOrderKindMixBadgeClass(
  items: OrderItem[] | null | undefined
): string {
  const { regular, jobWork } = countOrderItemKinds(items);
  if (regular > 0 && jobWork > 0) {
    return "bg-indigo-50 text-indigo-800 border-indigo-200";
  }
  if (jobWork > 0) {
    return "bg-violet-50 text-violet-800 border-violet-200";
  }
  return "bg-slate-100 text-slate-600 border-slate-200";
}
