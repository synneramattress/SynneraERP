/**
 * Delivery Challan CRUD + status transitions.
 * Multiple DCs per order supported.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { DELIVERY_CHALLANS_COLLECTION } from "../constants";
import type {
  DeliveryChallan,
  DeliveryChallanCreateInput,
  DeliveryChallanPod,
} from "../types";
import type { DeliveryChallanPurpose } from "../constants";
import type { Order } from "@/modules/orders/orderTypes";
import type { Invoice } from "@/modules/invoicing/invoiceTypes";
import type { CompanyProfile } from "@/modules/company/companyTypes";
import { buildDeliveryChallanCreateInput } from "../snapshot";
import { allocateDeliveryChallanNumber } from "./dcNumberService";

function itemsWithIds(
  items: DeliveryChallanCreateInput["items"]
): DeliveryChallan["items"] {
  return items.map((it, idx) => ({
    id: it.orderItemId || `line-${idx + 1}`,
    orderItemId: it.orderItemId,
    description: it.description,
    hsn: it.hsn,
    quantity: it.quantity,
    unit: it.unit || "Nos",
    taxableValue: Number(it.taxableValue) || 0,
  }));
}

/**
 * Create a new Delivery Challan (status = generated).
 */
export async function createDeliveryChallan(
  input: DeliveryChallanCreateInput
): Promise<{ id: string; challanNumber: string }> {
  const { challanNumber, financialYear, seq } =
    await allocateDeliveryChallanNumber();

  const payload: Record<string, unknown> = {
    challanNumber,
    financialYear,
    seq,
    status: "generated",
    purpose: input.purpose,
    sourceType:
      input.sourceType ||
      (input.orderId ? "order" : "standalone"),
    referenceNote: input.referenceNote || null,
    orderId: input.orderId || null,
    orderNumber: input.orderNumber || null,
    invoiceId: input.invoiceId || null,
    invoiceNumber: input.invoiceNumber || null,
    invoiceDate: input.invoiceDate || null,
    partyId: input.partyId || null,
    partyName: input.partyName || null,
    billedTo: input.billedTo || null,
    shipTo: input.shipTo,
    placeOfSupply: input.placeOfSupply,
    placeOfSupplyCode: input.placeOfSupplyCode || null,
    items: itemsWithIds(input.items),
    totalAmount: Number(input.totalAmount) || 0,
    transport: input.transport || null,
    udyamNumber: input.udyamNumber || null,
    companyGstin: input.companyGstin || null,
    companyLegalName: input.companyLegalName || null,
    pdfUrl: null,
    pod: null,
    createdAt: serverTimestamp(),
    createdBy: input.createdBy,
    updatedAt: serverTimestamp(),
    updatedBy: input.createdBy,
    dispatchedAt: null,
    dispatchedBy: null,
  };

  const ref = await addDoc(collection(db, DELIVERY_CHALLANS_COLLECTION), payload);
  return { id: ref.id, challanNumber };
}

export async function getDeliveryChallan(
  id: string
): Promise<DeliveryChallan | null> {
  const snap = await getDoc(doc(db, DELIVERY_CHALLANS_COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as DeliveryChallan;
}

export async function listDeliveryChallansForOrder(
  orderId: string
): Promise<DeliveryChallan[]> {
  const q = query(
    collection(db, DELIVERY_CHALLANS_COLLECTION),
    where("orderId", "==", orderId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DeliveryChallan);
}

export async function markDeliveryChallanDispatched(
  id: string,
  byUid: string
): Promise<void> {
  await updateDoc(doc(db, DELIVERY_CHALLANS_COLLECTION, id), {
    status: "dispatched",
    dispatchedAt: serverTimestamp(),
    dispatchedBy: byUid,
    updatedAt: serverTimestamp(),
    updatedBy: byUid,
  });
}

/**
 * Party uploads signed+stamped photo → status becomes pod_uploaded.
 * Does NOT auto-accept (locked decision).
 */
export async function uploadDeliveryChallanPod(
  id: string,
  pod: {
    signedImageUrl: string;
    uploadedBy: string;
    remark?: string | null;
  }
): Promise<void> {
  const podData: DeliveryChallanPod = {
    signedImageUrl: pod.signedImageUrl,
    uploadedAt: serverTimestamp() as Timestamp,
    uploadedBy: pod.uploadedBy,
    remark: pod.remark || null,
    rejected: false,
  };
  await updateDoc(doc(db, DELIVERY_CHALLANS_COLLECTION, id), {
    status: "pod_uploaded",
    pod: podData,
    updatedAt: serverTimestamp(),
    updatedBy: pod.uploadedBy,
  });
}

/** Admin soft-reject poor quality image → Party can re-upload */
export async function rejectDeliveryChallanPod(
  id: string,
  byUid: string,
  reason?: string | null
): Promise<void> {
  const existing = await getDeliveryChallan(id);
  if (!existing?.pod) return;

  await updateDoc(doc(db, DELIVERY_CHALLANS_COLLECTION, id), {
    status: "dispatched", // back so party can re-upload
    pod: {
      ...existing.pod,
      rejected: true,
      rejectedAt: serverTimestamp(),
      rejectedBy: byUid,
      rejectionReason: reason || null,
    },
    updatedAt: serverTimestamp(),
    updatedBy: byUid,
  });
}

export async function acceptDeliveryChallan(
  id: string,
  byUid: string
): Promise<void> {
  await updateDoc(doc(db, DELIVERY_CHALLANS_COLLECTION, id), {
    status: "accepted",
    updatedAt: serverTimestamp(),
    updatedBy: byUid,
  });
}

export async function cancelDeliveryChallan(
  id: string,
  byUid: string
): Promise<void> {
  await updateDoc(doc(db, DELIVERY_CHALLANS_COLLECTION, id), {
    status: "cancelled",
    updatedAt: serverTimestamp(),
    updatedBy: byUid,
  });
}

/**
 * Create DC from Order (+ optional Invoice) with fully snapshotted values.
 * Rates/amounts are frozen at this moment — later Rate Master changes do not affect this DC.
 */
export async function createDeliveryChallanFromOrder(opts: {
  order: Order;
  invoice?: Invoice | null;
  company?: CompanyProfile | null;
  purpose?: DeliveryChallanPurpose;
  createdBy: string;
  transport?: DeliveryChallanCreateInput["transport"];
}): Promise<{ id: string; challanNumber: string }> {
  const input = buildDeliveryChallanCreateInput({
    order: opts.order,
    invoice: opts.invoice,
    company: opts.company,
    purpose: opts.purpose,
    createdBy: opts.createdBy,
    transport: opts.transport,
  });
  return createDeliveryChallan(input);
}


export async function listAllDeliveryChallans(limitCount = 200): Promise<DeliveryChallan[]> {
  const q = query(
    collection(db, DELIVERY_CHALLANS_COLLECTION),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DeliveryChallan);
  return rows.slice(0, limitCount);
}

/** Party: DCs for their partyId that need POD upload or already uploaded */
export async function listDeliveryChallansForParty(
  partyId: string
): Promise<DeliveryChallan[]> {
  if (!partyId) return [];
  const q = query(
    collection(db, DELIVERY_CHALLANS_COLLECTION),
    where("partyId", "==", partyId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DeliveryChallan);
}


/**
 * Create standalone DC (material/tools/other) — no order required.
 */
export async function createStandaloneDeliveryChallan(
  input: DeliveryChallanCreateInput
): Promise<{ id: string; challanNumber: string }> {
  if (!input.items?.length) {
    throw new Error("Add at least one line item.");
  }
  if (!input.shipTo?.name?.trim()) {
    throw new Error("Consignee name is required.");
  }
  return createDeliveryChallan({
    ...input,
    sourceType: "standalone",
    orderId: input.orderId || null,
    orderNumber: input.orderNumber || null,
    invoiceId: null,
    invoiceNumber: null,
    invoiceDate: null,
  });
}
