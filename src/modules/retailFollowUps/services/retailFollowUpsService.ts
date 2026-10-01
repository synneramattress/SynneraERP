import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  RETAIL_CONVERSATIONS_SUB,
  RETAIL_FOLLOWUPS_COLLECTION,
} from "../retailFollowUpDefinitions";
import type {
  RetailConversation,
  RetailFollowUp,
  RetailFollowUpStatus,
  SalespersonOption,
} from "../retailFollowUpTypes";
import { toMillis } from "../logic";

function col() {
  return collection(db, RETAIL_FOLLOWUPS_COLLECTION);
}

function sortFollowUps(rows: RetailFollowUp[]): RetailFollowUp[] {
  rows.sort(
    (a, b) =>
      toMillis(a.nextFollowUpAt) - toMillis(b.nextFollowUpAt) ||
      toMillis(b.updatedAt) - toMillis(a.updatedAt)
  );
  return rows;
}

export async function fetchAllRetailFollowUps(): Promise<RetailFollowUp[]> {
  const snap = await getDocs(col());
  const rows = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() } as RetailFollowUp)
  );
  return sortFollowUps(rows);
}

/** Follow-ups assigned to a salesperson (or created by them if unassigned). */
export async function fetchRetailFollowUpsForSalesperson(
  salespersonId: string
): Promise<RetailFollowUp[]> {
  const snap = await getDocs(
    query(col(), where("salespersonId", "==", salespersonId))
  );
  const rows = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() } as RetailFollowUp)
  );
  return sortFollowUps(rows);
}

export async function fetchRetailFollowUp(
  id: string
): Promise<RetailFollowUp | null> {
  const snap = await getDoc(doc(db, RETAIL_FOLLOWUPS_COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as RetailFollowUp;
}

export type CreateRetailFollowUpInput = {
  ownerId: string;
  customerName: string;
  mobile: string;
  city?: string;
  address?: string;
  addressLine1?: string;
  requirementNotes?: string;
  nextFollowUpAt: Date;
  status?: RetailFollowUpStatus;
  leadSource?: string;
  leadSourceOther?: string;
  salespersonId?: string | null;
  salespersonName?: string | null;
  assignedBy?: string | null;
};

export async function createRetailFollowUp(
  input: CreateRetailFollowUpInput
): Promise<string> {
  const ref = doc(col());
  const payload: Record<string, unknown> = {
    ownerId: input.ownerId,
    customerName: input.customerName.trim(),
    mobile: input.mobile.trim(),
    city: (input.city || "").trim(),
    address: (input.addressLine1 || input.address || "").trim(),
    addressLine1: (input.addressLine1 || input.address || "").trim(),
    status: input.status || "NEW",
    nextFollowUpAt: Timestamp.fromDate(input.nextFollowUpAt),
    requirementNotes: (input.requirementNotes || "").trim(),
    lastConversationPreview: (input.requirementNotes || "").trim().slice(0, 160),
    lastConversationAt: input.requirementNotes ? serverTimestamp() : null,
    leadSource: (input.leadSource || "").trim() || null,
    leadSourceOther:
      input.leadSource === "Other"
        ? (input.leadSourceOther || "").trim() || null
        : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (input.salespersonId) {
    payload.salespersonId = input.salespersonId;
    payload.salespersonName = (input.salespersonName || "").trim() || null;
    payload.assignedAt = serverTimestamp();
    payload.assignedBy = input.assignedBy || input.ownerId;
  } else {
    payload.salespersonId = null;
    payload.salespersonName = null;
    payload.assignedAt = null;
    payload.assignedBy = null;
  }

  await setDoc(ref, payload);
  if (input.requirementNotes?.trim()) {
    await addDoc(collection(ref, RETAIL_CONVERSATIONS_SUB), {
      note: input.requirementNotes.trim(),
      createdBy: input.ownerId,
      createdAt: serverTimestamp(),
      nextFollowUpAt: Timestamp.fromDate(input.nextFollowUpAt),
    });
  }
  return ref.id;
}

export async function updateRetailFollowUp(
  id: string,
  data: Partial<{
    customerName: string;
    mobile: string;
    city: string;
    address: string;
    addressLine1: string;
    status: RetailFollowUpStatus;
    nextFollowUpAt: Date | null;
    requirementNotes: string;
    lastConversationPreview: string;
    convertedOrderId: string;
    leadSource: string;
    leadSourceOther: string;
    salespersonId: string | null;
    salespersonName: string | null;
    assignedBy: string | null;
  }>
): Promise<void> {
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (data.customerName != null) payload.customerName = data.customerName.trim();
  if (data.mobile != null) payload.mobile = data.mobile.trim();
  if (data.city != null) payload.city = data.city.trim();
  if (data.address != null) payload.address = data.address.trim();
  if (data.addressLine1 != null) {
    payload.addressLine1 = data.addressLine1.trim();
    // Keep legacy address in sync for order prefill
    if (data.address == null) payload.address = data.addressLine1.trim();
  }
  if (data.status != null) payload.status = data.status;
  if (data.requirementNotes != null)
    payload.requirementNotes = data.requirementNotes.trim();
  if (data.lastConversationPreview != null)
    payload.lastConversationPreview = data.lastConversationPreview;
  if (data.convertedOrderId != null)
    payload.convertedOrderId = data.convertedOrderId;
  if (data.leadSource != null) {
    payload.leadSource = data.leadSource.trim() || null;
    if (data.leadSource !== "Other") {
      payload.leadSourceOther = null;
    }
  }
  if (data.leadSourceOther != null) {
    payload.leadSourceOther = data.leadSourceOther.trim() || null;
  }
  if (data.nextFollowUpAt === null) payload.nextFollowUpAt = null;
  else if (data.nextFollowUpAt instanceof Date) {
    payload.nextFollowUpAt = Timestamp.fromDate(data.nextFollowUpAt);
  }

  // Assignment handled by assignRetailFollowUp; allow direct clear via null
  if (data.salespersonId === null) {
    payload.salespersonId = null;
    payload.salespersonName = null;
    payload.assignedAt = null;
    payload.assignedBy = null;
  }

  await updateDoc(doc(db, RETAIL_FOLLOWUPS_COLLECTION, id), payload as any);
}

/** Assign or reassign a follow-up to a salesperson (or unassign). */
export async function assignRetailFollowUp(input: {
  followUpId: string;
  salespersonId: string | null;
  salespersonName?: string | null;
  assignedBy: string;
}): Promise<void> {
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (input.salespersonId) {
    payload.salespersonId = input.salespersonId;
    payload.salespersonName = (input.salespersonName || "").trim() || null;
    payload.assignedAt = serverTimestamp();
    payload.assignedBy = input.assignedBy;
  } else {
    payload.salespersonId = null;
    payload.salespersonName = null;
    payload.assignedAt = null;
    payload.assignedBy = null;
  }
  await updateDoc(
    doc(db, RETAIL_FOLLOWUPS_COLLECTION, input.followUpId),
    payload as any
  );
}

export async function fetchConversations(
  followUpId: string
): Promise<RetailConversation[]> {
  const snap = await getDocs(
    query(
      collection(
        db,
        RETAIL_FOLLOWUPS_COLLECTION,
        followUpId,
        RETAIL_CONVERSATIONS_SUB
      ),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs.map(
    (d) => ({ id: d.id, ...d.data() } as RetailConversation)
  );
}

export async function addConversation(input: {
  followUpId: string;
  note: string;
  createdBy: string;
  nextFollowUpAt?: Date | null;
}): Promise<string> {
  const note = input.note.trim();
  const convCol = collection(
    db,
    RETAIL_FOLLOWUPS_COLLECTION,
    input.followUpId,
    RETAIL_CONVERSATIONS_SUB
  );
  const payload: Record<string, unknown> = {
    note,
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
  };
  if (input.nextFollowUpAt) {
    payload.nextFollowUpAt = Timestamp.fromDate(input.nextFollowUpAt);
  }
  const ref = await addDoc(convCol, payload);

  // Load current lead — never reactivate CONVERTED / NOT_INTERESTED
  const parentSnap = await getDoc(
    doc(db, RETAIL_FOLLOWUPS_COLLECTION, input.followUpId)
  );
  const currentStatus = String(parentSnap.data()?.status || "").toUpperCase();
  const terminal =
    currentStatus === "CONVERTED" || currentStatus === "NOT_INTERESTED";

  const parentUpdate: Record<string, unknown> = {
    lastConversationPreview: note.slice(0, 160),
    lastConversationAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (!terminal) {
    parentUpdate.status = "FOLLOW_UP";
    if (input.nextFollowUpAt) {
      parentUpdate.nextFollowUpAt = Timestamp.fromDate(input.nextFollowUpAt);
    }
  }
  // Terminal leads: conversation is history only — do not change status or schedule
  await updateDoc(
    doc(db, RETAIL_FOLLOWUPS_COLLECTION, input.followUpId),
    parentUpdate as any
  );
  return ref.id;
}

/** Convert lead on successful retail order SUBMIT (not draft). */
export async function convertLeadOnRetailOrderSubmit(
  leadId: string,
  orderId: string
): Promise<void> {
  await updateDoc(doc(db, RETAIL_FOLLOWUPS_COLLECTION, leadId), {
    status: "CONVERTED",
    convertedOrderId: orderId,
    nextFollowUpAt: null,
    updatedAt: serverTimestamp(),
  });
}


/**
 * Active salespersons from users collection (admin list for assign UI).
 * Requires admin (or rules allowing list of role==salesperson).
 */
export async function fetchActiveSalespersons(): Promise<SalespersonOption[]> {
  const snap = await getDocs(
    query(collection(db, "users"), where("role", "==", "salesperson"))
  );
  const rows: SalespersonOption[] = snap.docs.map((d) => {
    const data = d.data() || {};
    return {
      uid: d.id,
      name: String(data.name || data.email || d.id),
      email: data.email ? String(data.email) : undefined,
      status: data.status ? String(data.status) : "ACTIVE",
    };
  });
  return rows
    .filter((r) => String(r.status || "ACTIVE").toUpperCase() !== "INACTIVE")
    .sort((a, b) => a.name.localeCompare(b.name));
}
