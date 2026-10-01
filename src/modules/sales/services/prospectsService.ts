import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  serverTimestamp,
  setDoc,
  addDoc,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  PROSPECTS_COLLECTION,
  SALES_ACTIVITIES_COLLECTION,
  SALES_FOLLOWUPS_COLLECTION,
  SALES_CONVERSION_REQUESTS_COLLECTION,
  type ProspectStatus,
  type FollowUpMethod,
  type CallOutcome,
} from "../salesDefinitions";
import type {
  Prospect,
  SalesActivity,
  SalesFollowUp,
  SalesConversionRequest,
} from "../prospectTypes";

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

export async function fetchProspectsForSalesperson(
  salespersonId: string
): Promise<Prospect[]> {
  const snap = await getDocs(
    query(
      collection(db, PROSPECTS_COLLECTION),
      where("assignedSalespersonId", "==", salespersonId)
    )
  );
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Prospect));
  rows.sort((a, b) => {
    const ta = (a.updatedAt as any)?.toMillis?.() || (a.createdAt as any)?.toMillis?.() || 0;
    const tb = (b.updatedAt as any)?.toMillis?.() || (b.createdAt as any)?.toMillis?.() || 0;
    return tb - ta;
  });
  return rows;
}

export async function fetchAllProspects(): Promise<Prospect[]> {
  const snap = await getDocs(collection(db, PROSPECTS_COLLECTION));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Prospect));
}

export async function fetchProspectById(id: string): Promise<Prospect | null> {
  const snap = await getDoc(doc(db, PROSPECTS_COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Prospect;
}

/** Duplicate mobile check among prospects (optional excludeId) */
export async function findProspectsByMobile(
  mobile: string,
  excludeId?: string
): Promise<Prospect[]> {
  const cleaned = String(mobile || "").replace(/\D/g, "");
  if (cleaned.length < 8) return [];
  const snap = await getDocs(
    query(collection(db, PROSPECTS_COLLECTION), where("mobile", "==", mobile.trim()))
  );
  return snap.docs
    .filter((d) => d.id !== excludeId)
    .map((d) => ({ id: d.id, ...d.data() } as Prospect));
}

export type CreateProspectInput = {
  shopName: string;
  businessName?: string;
  contactPerson: string;
  mobile: string;
  alternateMobile?: string;
  city: string;
  area?: string;
  address?: string;
  addressLine1?: string;
  businessType: string;
  notes?: string;
  expectedRequirement?: string;
  interestedProducts?: string;
  nextFollowUpDate?: string;
  nextFollowUpMethod?: FollowUpMethod | string;
  salespersonId: string;
  salespersonName?: string;
};

export async function createProspect(
  input: CreateProspectInput
): Promise<{ id: string; duplicateWarning?: string }> {
  const dups = await findProspectsByMobile(input.mobile);
  let duplicateWarning: string | undefined;
  if (dups.length) {
    duplicateWarning = `Similar prospect exists: ${dups[0].shopName} (${dups[0].city})`;
  }

  const ref = doc(collection(db, PROSPECTS_COLLECTION));
  const data = stripUndefined({
    shopName: input.shopName.trim(),
    businessName: (input.businessName || "").trim() || null,
    contactPerson: input.contactPerson.trim(),
    mobile: input.mobile.trim(),
    alternateMobile: (input.alternateMobile || "").trim() || null,
    city: input.city.trim(),
    area: (input.area || "").trim() || null,
    address: (input.addressLine1 || input.address || "").trim() || null,
    addressLine1: (input.addressLine1 || input.address || "").trim() || null,
    businessType: input.businessType,
    status: "NEW" as ProspectStatus,
    createdBySalespersonId: input.salespersonId,
    createdBySalespersonName: input.salespersonName || null,
    assignedSalespersonId: input.salespersonId,
    assignedSalespersonName: input.salespersonName || null,
    notes: (input.notes || "").trim() || null,
    expectedRequirement: (input.expectedRequirement || "").trim() || null,
    interestedProducts: (input.interestedProducts || "").trim() || null,
    nextFollowUpDate: input.nextFollowUpDate || null,
    nextFollowUpMethod: input.nextFollowUpMethod || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: input.salespersonId,
  });
  await setDoc(ref, data);

  if (input.nextFollowUpDate) {
    await scheduleFollowUp({
      prospectId: ref.id,
      shopName: input.shopName.trim(),
      city: input.city.trim(),
      method: (input.nextFollowUpMethod as FollowUpMethod) || "call",
      dueDate: input.nextFollowUpDate,
      notes: input.notes,
      assignedSalespersonId: input.salespersonId,
      assignedSalespersonName: input.salespersonName,
      createdBy: input.salespersonId,
    });
  }

  return { id: ref.id, duplicateWarning };
}

export async function updateProspect(
  id: string,
  data: Record<string, unknown>,
  updatedBy: string
): Promise<void> {
  // Never allow client to change createdBySalespersonId
  const { createdBySalespersonId: _c, createdBySalespersonName: _n, ...safe } =
    data as any;
  await updateDoc(doc(db, PROSPECTS_COLLECTION, id), {
    ...stripUndefined(safe),
    updatedAt: serverTimestamp(),
    updatedBy,
  });
}

export async function reassignProspect(
  id: string,
  assignedSalespersonId: string,
  assignedSalespersonName: string,
  assignedBy: string
): Promise<void> {
  await updateDoc(doc(db, PROSPECTS_COLLECTION, id), {
    assignedSalespersonId,
    assignedSalespersonName,
    assignedBy,
    updatedAt: serverTimestamp(),
    updatedBy: assignedBy,
  });
}

export async function recordCallActivity(opts: {
  prospectId: string;
  contactPerson?: string;
  outcome: CallOutcome | string;
  notes?: string;
  nextFollowUpDate?: string;
  createdBy: string;
  createdByName?: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, SALES_ACTIVITIES_COLLECTION), stripUndefined({
    prospectId: opts.prospectId,
    type: "call",
    outcome: opts.outcome,
    contactPerson: opts.contactPerson || null,
    notes: opts.notes || null,
    nextFollowUpDate: opts.nextFollowUpDate || null,
    createdBy: opts.createdBy,
    createdByName: opts.createdByName || null,
    createdAt: serverTimestamp(),
    startedAt: serverTimestamp(),
  }));

  const statusPatch: Record<string, unknown> = {
    status: opts.outcome === "interested" ? "INTERESTED" : "CONTACTED",
    updatedAt: serverTimestamp(),
    updatedBy: opts.createdBy,
  };
  if (opts.nextFollowUpDate) {
    statusPatch.nextFollowUpDate = opts.nextFollowUpDate;
    statusPatch.nextFollowUpMethod = "call";
    statusPatch.status = "FOLLOW_UP";
  }
  await updateDoc(doc(db, PROSPECTS_COLLECTION, opts.prospectId), statusPatch as any);

  if (opts.nextFollowUpDate) {
    const p = await fetchProspectById(opts.prospectId);
    await scheduleFollowUp({
      prospectId: opts.prospectId,
      shopName: p?.shopName,
      city: p?.city,
      method: "call",
      dueDate: opts.nextFollowUpDate,
      notes: opts.notes,
      assignedSalespersonId: p?.assignedSalespersonId || opts.createdBy,
      assignedSalespersonName: p?.assignedSalespersonName,
      createdBy: opts.createdBy,
    });
  }
  return ref.id;
}

export async function startVisit(opts: {
  prospectId: string;
  createdBy: string;
  createdByName?: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, SALES_ACTIVITIES_COLLECTION), {
    prospectId: opts.prospectId,
    type: "visit",
    outcome: "started",
    startedAt: serverTimestamp(),
    createdBy: opts.createdBy,
    createdByName: opts.createdByName || null,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, PROSPECTS_COLLECTION, opts.prospectId), {
    status: "CONTACTED",
    updatedAt: serverTimestamp(),
    updatedBy: opts.createdBy,
  });
  return ref.id;
}

export async function endVisit(opts: {
  activityId: string;
  prospectId: string;
  notes?: string;
  outcome?: string;
  nextFollowUpDate?: string;
  endedBy: string;
}): Promise<void> {
  const actRef = doc(db, SALES_ACTIVITIES_COLLECTION, opts.activityId);
  const snap = await getDoc(actRef);
  const startedAt = snap.data()?.startedAt;
  let durationMinutes: number | null = null;
  if (startedAt?.toMillis) {
    durationMinutes = Math.max(
      0,
      Math.round((Date.now() - startedAt.toMillis()) / 60000)
    );
  }
  await updateDoc(actRef, stripUndefined({
    outcome: opts.outcome || "completed",
    notes: opts.notes || null,
    endedAt: serverTimestamp(),
    durationMinutes,
    nextFollowUpDate: opts.nextFollowUpDate || null,
  }));

  const patch: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
    updatedBy: opts.endedBy,
  };
  if (opts.outcome === "interested") patch.status = "INTERESTED";
  if (opts.nextFollowUpDate) {
    patch.nextFollowUpDate = opts.nextFollowUpDate;
    patch.nextFollowUpMethod = "visit";
    patch.status = "FOLLOW_UP";
  }
  await updateDoc(doc(db, PROSPECTS_COLLECTION, opts.prospectId), patch as any);

  if (opts.nextFollowUpDate) {
    const p = await fetchProspectById(opts.prospectId);
    await scheduleFollowUp({
      prospectId: opts.prospectId,
      shopName: p?.shopName,
      city: p?.city,
      method: "visit",
      dueDate: opts.nextFollowUpDate,
      notes: opts.notes,
      assignedSalespersonId: p?.assignedSalespersonId || opts.endedBy,
      assignedSalespersonName: p?.assignedSalespersonName,
      createdBy: opts.endedBy,
    });
  }
}

export async function fetchActivitiesForProspect(
  prospectId: string
): Promise<SalesActivity[]> {
  const snap = await getDocs(
    query(
      collection(db, SALES_ACTIVITIES_COLLECTION),
      where("prospectId", "==", prospectId)
    )
  );
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SalesActivity));
  rows.sort((a, b) => {
    const ta = (a.createdAt as any)?.toMillis?.() || 0;
    const tb = (b.createdAt as any)?.toMillis?.() || 0;
    return tb - ta;
  });
  return rows;
}

export async function scheduleFollowUp(opts: {
  prospectId: string;
  shopName?: string;
  city?: string;
  method: FollowUpMethod | string;
  dueDate: string;
  notes?: string;
  assignedSalespersonId: string;
  assignedSalespersonName?: string;
  createdBy: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, SALES_FOLLOWUPS_COLLECTION), stripUndefined({
    prospectId: opts.prospectId,
    shopName: opts.shopName || null,
    city: opts.city || null,
    method: opts.method,
    dueDate: opts.dueDate,
    notes: opts.notes || null,
    status: "pending",
    assignedSalespersonId: opts.assignedSalespersonId,
    assignedSalespersonName: opts.assignedSalespersonName || null,
    createdBy: opts.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
  await updateDoc(doc(db, PROSPECTS_COLLECTION, opts.prospectId), {
    nextFollowUpDate: opts.dueDate,
    nextFollowUpMethod: opts.method,
    status: "FOLLOW_UP",
    updatedAt: serverTimestamp(),
    updatedBy: opts.createdBy,
  });
  return ref.id;
}

export async function fetchFollowUpsForSalesperson(
  salespersonId: string
): Promise<SalesFollowUp[]> {
  const snap = await getDocs(
    query(
      collection(db, SALES_FOLLOWUPS_COLLECTION),
      where("assignedSalespersonId", "==", salespersonId)
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SalesFollowUp));
}

export async function completeFollowUp(
  id: string,
  completedBy: string
): Promise<void> {
  await updateDoc(doc(db, SALES_FOLLOWUPS_COLLECTION, id), {
    status: "completed",
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Request party conversion (admin completes party create — users create is admin-only) */
export async function requestProspectConversion(opts: {
  prospect: Prospect;
  requestedBy: string;
  requestedByName?: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, SALES_CONVERSION_REQUESTS_COLLECTION), stripUndefined({
    prospectId: opts.prospect.id,
    shopName: opts.prospect.shopName,
    contactPerson: opts.prospect.contactPerson,
    mobile: opts.prospect.mobile,
    city: opts.prospect.city,
    address: opts.prospect.address || null,
    businessType: opts.prospect.businessType,
    requestedBy: opts.requestedBy,
    requestedByName: opts.requestedByName || null,
    status: "pending",
    partyId: null,
    createdAt: serverTimestamp(),
  }));
  await updateDoc(doc(db, PROSPECTS_COLLECTION, opts.prospect.id), {
    status: "CONVERSION_REQUESTED",
    conversionRequestedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: opts.requestedBy,
  });
  await addDoc(collection(db, SALES_ACTIVITIES_COLLECTION), {
    prospectId: opts.prospect.id,
    type: "conversion",
    outcome: "requested",
    notes: "Conversion to Party requested",
    createdBy: opts.requestedBy,
    createdByName: opts.requestedByName || null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Admin: mark prospect converted and link party */
export async function completeProspectConversion(opts: {
  prospectId: string;
  partyId: string;
  completedBy: string;
  requestId?: string;
}): Promise<void> {
  await updateDoc(doc(db, PROSPECTS_COLLECTION, opts.prospectId), {
    status: "CONVERTED",
    convertedPartyId: opts.partyId,
    convertedAt: serverTimestamp(),
    convertedBy: opts.completedBy,
    updatedAt: serverTimestamp(),
    updatedBy: opts.completedBy,
  });
  if (opts.requestId) {
    await updateDoc(doc(db, SALES_CONVERSION_REQUESTS_COLLECTION, opts.requestId), {
      status: "completed",
      partyId: opts.partyId,
      completedAt: serverTimestamp(),
    });
  }
  await addDoc(collection(db, SALES_ACTIVITIES_COLLECTION), {
    prospectId: opts.prospectId,
    partyId: opts.partyId,
    type: "conversion",
    outcome: "completed",
    notes: `Converted to Party ${opts.partyId}`,
    createdBy: opts.completedBy,
    createdAt: serverTimestamp(),
  });
}

export async function fetchPendingConversionRequests(): Promise<SalesConversionRequest[]> {
  const snap = await getDocs(
    query(
      collection(db, SALES_CONVERSION_REQUESTS_COLLECTION),
      where("status", "==", "pending")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SalesConversionRequest));
}

export function followUpBucket(
  dueDate: string,
  status: string
): "today" | "overdue" | "upcoming" | "completed" {
  if (status === "completed" || status === "cancelled") return "completed";
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const key = `${y}-${m}-${d}`;
  if (dueDate < key) return "overdue";
  if (dueDate === key) return "today";
  return "upcoming";
}
