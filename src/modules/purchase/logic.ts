/**
 * Purchase Orders pure logic + Indian FY helpers
 */

import {
  PO_STATUS,
  PO_RECEIVABLE_STATUSES,
  type POStatus,
} from "./purchaseDefinitions";
import type {
  PurchaseOrderItem,
  CreatePurchaseOrderInput,
  ReceiveMaterialInput,
} from "./purchaseTypes";

/** Indian Financial Year label: "26/27" (Apr–Mar) */
export function getIndianFinancialYear(d = new Date()): string {
  const year = d.getFullYear();
  const month = d.getMonth(); // 0 = Jan … 3 = Apr
  if (month >= 3) {
    return `${String(year).slice(-2)}/${String(year + 1).slice(-2)}`;
  }
  return `${String(year - 1).slice(-2)}/${String(year).slice(-2)}`;
}

export function formatPONumber(fy: string, seq: number): string {
  const n = Math.max(1, Math.floor(Number(seq) || 0));
  return `PO-${fy}-${String(n).padStart(4, "0")}`;
}

export function formatGRNNumber(fy: string, seq: number): string {
  const n = Math.max(1, Math.floor(Number(seq) || 0));
  return `GRN-${fy}-${String(n).padStart(4, "0")}`;
}

export function parsePOSeq(poNumber: string, fy: string): number {
  const prefix = `PO-${fy}-`;
  if (!poNumber.startsWith(prefix)) return 0;
  const num = parseInt(poNumber.slice(prefix.length), 10);
  return Number.isFinite(num) && num > 0 ? num : 0;
}

export function calcItemAmount(qty: number, rate: number): number {
  const q = Number(qty) || 0;
  const r = Number(rate) || 0;
  return Math.round(q * r * 100) / 100;
}

export function calcPOTotal(
  items: { quantity: number; rate: number }[]
): number {
  return items.reduce(
    (sum, it) => sum + calcItemAmount(it.quantity, it.rate),
    0
  );
}

export function normalizePOItems(
  raw: Array<
    Omit<PurchaseOrderItem, "id" | "amount"> & { id?: string }
  >
): PurchaseOrderItem[] {
  return raw.map((it, idx) => {
    const quantity = Math.max(0, Number(it.quantity) || 0);
    const rate = Math.max(0, Number(it.rate) || 0);
    const receivedQuantity = Math.max(0, Number(it.receivedQuantity) || 0);
    return {
      id: String(it.id || `line-${idx + 1}-${Date.now()}`),
      materialId: String(it.materialId || ""),
      materialName: String(it.materialName || "").trim(),
      unit: String(it.unit || "pcs"),
      quantity,
      rate,
      amount: calcItemAmount(quantity, rate),
      receivedQuantity,
      notes: it.notes ? String(it.notes).trim() : null,
    };
  });
}

export function isPOEditable(status: string | undefined): boolean {
  const s = String(status || "").toLowerCase();
  return s === PO_STATUS.draft || s === PO_STATUS.ordered;
}

export function isPOCancellable(status: string | undefined): boolean {
  const s = String(status || "").toLowerCase();
  return s === PO_STATUS.draft || s === PO_STATUS.ordered;
}

export function isPOReceivable(status: string | undefined): boolean {
  const s = String(status || "").toLowerCase() as POStatus;
  return (PO_RECEIVABLE_STATUSES as string[]).includes(s);
}

export function poStatusLabel(status: string | undefined): string {
  const s = String(status || "").toLowerCase() as POStatus;
  if (s === "draft") return "Draft";
  if (s === "ordered") return "Ordered";
  if (s === "partially_received") return "Partially Received";
  if (s === "received") return "Received";
  if (s === "cancelled") return "Cancelled";
  return status || "—";
}

export function pendingQty(item: PurchaseOrderItem): number {
  const ordered = Number(item.quantity) || 0;
  const received = Number(item.receivedQuantity) || 0;
  return Math.max(0, ordered - received);
}

export function derivePOStatusAfterReceive(
  items: PurchaseOrderItem[]
): POStatus {
  let anyReceived = false;
  let allFullyReceived = true;
  for (const it of items) {
    const ordered = Number(it.quantity) || 0;
    const received = Number(it.receivedQuantity) || 0;
    if (received > 0) anyReceived = true;
    if (received < ordered - 0.0001) allFullyReceived = false;
  }
  if (allFullyReceived && anyReceived) return PO_STATUS.received;
  if (anyReceived) return PO_STATUS.partially_received;
  return PO_STATUS.ordered;
}

export function validatePOInput(
  input: CreatePurchaseOrderInput
): string | null {
  if (!input.supplierId?.trim()) return "Supplier is required.";
  if (!input.supplierName?.trim()) return "Supplier name is required.";
  if (!input.items || input.items.length === 0)
    return "At least one material item is required.";
  for (let i = 0; i < input.items.length; i++) {
    const it = input.items[i];
    if (!it.materialId?.trim())
      return `Item ${i + 1}: Material is required.`;
    if (!it.materialName?.trim())
      return `Item ${i + 1}: Material name is required.`;
    if (!(Number(it.quantity) > 0))
      return `Item ${i + 1}: Quantity must be greater than 0.`;
    if (!(Number(it.rate) >= 0))
      return `Item ${i + 1}: Rate cannot be negative.`;
  }
  return null;
}

export function validateReceiveInput(
  input: ReceiveMaterialInput,
  poItems: PurchaseOrderItem[]
): string | null {
  if (!input.purchaseOrderId?.trim()) return "Purchase order is required.";
  if (!input.receiptDate?.trim()) return "Receipt date is required.";
  if (!input.items || input.items.length === 0)
    return "Select at least one item to receive.";

  const byId = new Map(poItems.map((it) => [it.id, it]));

  for (let i = 0; i < input.items.length; i++) {
    const line = input.items[i];
    const qty = Number(line.receivedQuantity) || 0;
    if (!(qty > 0)) {
      return `Item ${i + 1}: Received quantity must be greater than 0.`;
    }
    const poItem = byId.get(line.poItemId);
    if (!poItem) {
      return `Item ${i + 1}: Does not match any PO line.`;
    }
    const pending = pendingQty(poItem);
    if (qty > pending + 0.0001) {
      return `Item ${i + 1} (${poItem.materialName}): Cannot receive more than pending (${pending}).`;
    }
    if (line.rate != null && Number(line.rate) < 0) {
      return `Item ${i + 1}: Rate cannot be negative.`;
    }
  }
  return null;
}

export function formatRupee(n: number): string {
  const v = Number(n) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(v);
}

export function todayISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
