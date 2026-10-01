import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  ORDERS_COLLECTION,
  saveOrderWithId,
  stripUndefined,
  type Order,
  type OrderItem,
  type OrderStatus,
} from "@/modules/orders";
import { allocateOrderNumber } from "@/lib/orderNumber";
import { validateOrderItems } from "@/modules/orders/utils/orderItemRules";
import { fetchRateTables, fetchRateSettings } from "@/modules/rates";
import {
  applyRetailPricingToItem,
  sumRetailTotal,
  validateRetailItemsAgainstPartyRate,
} from "../retailPricing";

export type RetailCustomerInput = {
  name: string;
  contact: string;
  address: string;
  city: string;
};

export type SaveRetailOrderInput = {
  orderId?: string;
  salespersonId: string;
  salespersonName: string;
  /** Existing master id when selected — NOT created at submit */
  customerId?: string | null;
  customer: RetailCustomerInput;
  /** Full GST payload stored on order until Admin approval finalizes Customer Master */
  customerMasterDraft?: Record<string, unknown> | null;
  deliveryDate?: string;
  notes?: string;
  items: OrderItem[];
  status: "draft" | "submitted";
  retailFollowUpId?: string | null;
};

/**
 * Reprice items from trusted Rate Master, enforce party-rate floor, save order.
 */
export async function saveRetailOrder(
  input: SaveRetailOrderInput
): Promise<{ orderId: string; orderNumber?: string }> {
  if (!input.salespersonId) throw new Error("Not authenticated");
  if (!input.customer?.name?.trim() || !input.customer?.contact?.trim()) {
    throw new Error("Customer name and contact are required.");
  }
  if (!input.customer?.address?.trim() || !input.customer?.city?.trim()) {
    throw new Error("Customer address and city are required.");
  }
  if (!input.items?.length) {
    throw new Error("Add at least one mattress item.");
  }

  // Server/service boundary validation: do not rely on the Sales UI alone.
  // This keeps shared mattress type → warranty → size/thickness → fabric rules
  // authoritative for both draft and submitted retail orders.
  const itemRuleError = validateOrderItems(input.items, input.status);
  if (itemRuleError) throw new Error(itemRuleError);

  const [rateTables, settings] = await Promise.all([
    fetchRateTables(),
    fetchRateSettings(),
  ]);

  const pricedItems = input.items.map((it) =>
    applyRetailPricingToItem(it, rateTables, settings)
  );

  const rateErr = validateRetailItemsAgainstPartyRate(pricedItems);
  if (rateErr) throw new Error(rateErr);

  // Ensure every item has party/retail snapshot
  for (const it of pricedItems) {
    if (it.partyRate == null || it.retailRate == null || it.actualSaleRate == null) {
      throw new Error("Could not resolve rates for one or more items. Check type/thickness.");
    }
  }

  const totalQuantity = pricedItems.reduce(
    (s, it) => s + (Number(it.quantity) || 0),
    0
  );
  const totalAmount = sumRetailTotal(pricedItems);

  const orderId = input.orderId || doc(collection(db, ORDERS_COLLECTION)).id;
  let orderNumber: string | undefined;

  const cleanItems = pricedItems.map((it) => {
    const {
      belowPartyRate: _b,
      ...rest
    } = it as OrderItem & { belowPartyRate?: boolean };
    return stripUndefined({
      ...rest,
      quantity: Number(it.quantity) || 1,
    }) as OrderItem;
  });

  const base: Record<string, unknown> = {
    partyId: input.salespersonId, // ownership key for rules + list scoping
    partyName: input.salespersonName,
    partyEmail: "",
    orderType: "RETAIL",
    salespersonId: input.salespersonId,
    salespersonName: input.salespersonName,
    customer: {
      name: input.customer.name.trim(),
      contact: input.customer.contact.trim(),
      address: input.customer.address.trim(),
      city: input.customer.city.trim(),
    },
    ...(input.customerId
      ? { customerId: input.customerId }
      : {}),
    ...(input.customerMasterDraft
      ? { customerMasterDraft: input.customerMasterDraft }
      : {}),
    customerName: input.customer.name.trim(),
    customerContact: input.customer.contact.trim(),
    customerCity: input.customer.city.trim(),
    deliveryDate: (input.deliveryDate || "").trim() || null,
    notes: (input.notes || "").trim() || "",
    items: cleanItems,
    totalQuantity,
    totalAmount,
    status: input.status,
    updatedAt: serverTimestamp(),
    ...(input.retailFollowUpId
      ? { retailFollowUpId: input.retailFollowUpId }
      : {}),
  };

  if (input.status === "submitted") {
    base.submittedAt = serverTimestamp();
    base.rateSnapshotAt = serverTimestamp();
    orderNumber = await allocateOrderNumber();
    base.orderNumber = orderNumber;
  }

  if (!input.orderId) {
    base.createdAt = serverTimestamp();
  }

  await saveOrderWithId(orderId, stripUndefined(base) as any);
  return { orderId, orderNumber };
}

export async function fetchRetailOrdersForSalesperson(
  salespersonId: string
): Promise<Order[]> {
  const snap = await getDocs(
    query(
      collection(db, ORDERS_COLLECTION),
      where("salespersonId", "==", salespersonId),
      where("orderType", "==", "RETAIL")
    )
  );
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
  rows.sort((a, b) => {
    const ta = (a.createdAt as any)?.toMillis?.() || 0;
    const tb = (b.createdAt as any)?.toMillis?.() || 0;
    return tb - ta;
  });
  return rows;
}

export async function fetchAllRetailOrders(): Promise<Order[]> {
  const snap = await getDocs(
    query(collection(db, ORDERS_COLLECTION), where("orderType", "==", "RETAIL"))
  );
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
  rows.sort((a, b) => {
    const ta = (a.createdAt as any)?.toMillis?.() || 0;
    const tb = (b.createdAt as any)?.toMillis?.() || 0;
    return tb - ta;
  });
  return rows;
}


/** Normalize phone to digits for matching */
export function normalizeMobile(phone: string): string {
  let d = String(phone || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d;
}

/** Existing RETAIL orders for this salesperson matching customer mobile */
export async function findRetailOrdersByMobile(
  salespersonId: string,
  mobile: string
): Promise<Order[]> {
  const target = normalizeMobile(mobile);
  if (target.length < 8) return [];
  const all = await fetchRetailOrdersForSalesperson(salespersonId);
  return all.filter((o) => {
    const c = normalizeMobile(
      o.customerContact || o.customer?.contact || ""
    );
    return c && c === target;
  });
}
