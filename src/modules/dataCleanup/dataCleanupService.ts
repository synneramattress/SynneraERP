import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import type { CleanupCounts, CleanupPreview, ClientCleanupResult } from "./dataCleanupTypes";

export const CLEANUP_VERSION = "2.15.42";
export const CONFIRMATION_PHRASE = "DELETE TEST DATA";

const CLIENT_TARGETS = [
  "orders", "productionMattresses", "invoiceOrderLocks", "customers", "prospects",
  "salesActivities", "salesFollowUps", "salesConversionRequests", "salesCommissions",
  "retailFollowUps", "retailFollowUpConversations", "transportDetails", "salespersons",
  "party/salesperson user profiles and notification tokens",
];

const TERMUX_TARGETS = [
  "invoices", "payments", "partyLedgers", "financialAuditLogs", "fcmDispatchLog", "Firebase Auth party/salesperson test users",
];

const PROTECTED = [
  "suppliers", "suppliers/{supplierId}/transactions", "settings", "rateMaster", "rateSettings", "products",
  "designs", "designCatalogues", "companyBrochure", "invoiceTerms", "admin_costing_settings",
  "custom_templates", "competitorPriceLists", "employees", "counters", "announcements", "salesMarketingMaterials",
  "admin users",
];

async function countTopLevel(name: string): Promise<number> {
  return (await getDocs(collection(db, name))).size;
}

async function countProductionMattresses(): Promise<number> {
  const orders = await getDocs(collection(db, "orders"));
  let total = 0;
  for (const order of orders.docs) {
    total += (await getDocs(collection(db, "orders", order.id, "productionMattresses"))).size;
  }
  return total;
}

async function countRetailConversations(): Promise<number> {
  const followUps = await getDocs(collection(db, "retailFollowUps"));
  let total = 0;
  for (const followUp of followUps.docs) {
    total += (await getDocs(collection(db, "retailFollowUps", followUp.id, "conversations"))).size;
  }
  return total;
}

async function countSupplierTransactions(): Promise<number> {
  const suppliers = await getDocs(collection(db, "suppliers"));
  let total = 0;
  for (const supplier of suppliers.docs) {
    total += (await getDocs(collection(db, "suppliers", supplier.id, "transactions"))).size;
  }
  return total;
}

export async function previewCleanup(): Promise<CleanupPreview> {
  if (!auth.currentUser) throw new Error("Admin authentication is required.");

  // IMPORTANT: Spark browser preview must only query collections that the existing
  // Firestore rules explicitly allow an admin to list. Financial collections,
  // notifications/FCM logs, and Firebase Auth are Termux-only.
  const users = await getDocs(collection(db, "users"));
  let partyUsers = 0;
  let salespersonUsers = 0;
  let employeeCount = 0;
  let adminUserCount = 0;
  users.forEach((d) => {
    const role = String(d.data().role || "").toLowerCase();
    if (role === "party") partyUsers++;
    else if (role === "salesperson") salespersonUsers++;
    else if (role === "employee") employeeCount++;
    else if (role === "admin") adminUserCount++;
  });

  const [
    ordersSnap, productionMattresses, invoiceOrderLocks, customers, prospects, salesActivities,
    salesFollowUps, salesConversionRequests, salesCommissions, retailFollowUps,
    retailFollowUpConversations, transportDetails, salespersons, supplierCount, supplierTransactionCount,
  ] = await Promise.all([
    getDocs(collection(db, "orders")),
    countProductionMattresses(),
    countTopLevel("invoiceOrderLocks"),
    countTopLevel("customers"),
    countTopLevel("prospects"),
    countTopLevel("salesActivities"),
    countTopLevel("salesFollowUps"),
    countTopLevel("salesConversionRequests"),
    countTopLevel("salesCommissions"),
    countTopLevel("retailFollowUps"),
    countRetailConversations(),
    countTopLevel("transportDetails"),
    countTopLevel("salespersons"),
    countTopLevel("suppliers"),
    countSupplierTransactions(),
  ]);

  return {
    version: CLEANUP_VERSION,
    mode: "SPARK_CLIENT_PLUS_TERMUX",
    generatedAt: new Date().toISOString(),
    counts: {
      orders: ordersSnap.size, productionMattresses, invoices: 0, invoiceOrderLocks, payments: 0,
      taxInvoiceLedgerEntries: 0, otherOrderLedgerEntries: 0, financialAuditLogs: 0, customers,
      parties: 0, prospects, salesActivities, salesFollowUps, salesConversionRequests, salesCommissions,
      retailFollowUps, retailFollowUpConversations, transportDetails, notifications: -1, fcmDispatchLogs: -1,
      salespersons, partyUsers, salespersonUsers, supplierCount, supplierTransactionCount, employeeCount, adminUserCount,
    },
    clientCleanupTargets: CLIENT_TARGETS,
    termuxCleanupTargets: TERMUX_TARGETS,
    protectedCollections: PROTECTED,
  };
}


async function deleteCollection(name: string): Promise<number> {
  const snap = await getDocs(collection(db, name));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  return snap.size;
}

async function deleteProductionMattresses(): Promise<number> {
  const orders = await getDocs(collection(db, "orders"));
  let total = 0;
  for (const order of orders.docs) {
    const mattresses = await getDocs(collection(db, "orders", order.id, "productionMattresses"));
    await Promise.all(mattresses.docs.map((d) => deleteDoc(d.ref)));
    total += mattresses.size;
  }
  return total;
}

async function deleteRetailConversations(): Promise<number> {
  const followUps = await getDocs(collection(db, "retailFollowUps"));
  let total = 0;
  for (const followUp of followUps.docs) {
    const conversations = await getDocs(collection(db, "retailFollowUps", followUp.id, "conversations"));
    await Promise.all(conversations.docs.map((d) => deleteDoc(d.ref)));
    total += conversations.size;
  }
  return total;
}


export async function executeClientCleanup(preview: CleanupPreview): Promise<ClientCleanupResult> {
  if (!auth.currentUser) throw new Error("Admin authentication is required.");
  if (preview.version !== CLEANUP_VERSION) throw new Error("Cleanup preview version is stale. Scan again.");
  if (preview.mode !== "SPARK_CLIENT_PLUS_TERMUX") throw new Error("Unsupported cleanup mode.");
  if (preview.counts.fcmDispatchLogs !== -1) throw new Error("Unexpected FCM dispatch log state.");

  const deleted: Partial<CleanupCounts> = {};

  // Delete nested records by their known parent paths. This avoids collection-group
  // queries, which require explicit collection-group rules and are not needed here.
  deleted.productionMattresses = await deleteProductionMattresses();
  deleted.retailFollowUpConversations = await deleteRetailConversations();

  for (const name of [
    "invoiceOrderLocks", "customers", "prospects", "salesActivities", "salesFollowUps",
    "salesConversionRequests", "salesCommissions", "retailFollowUps", "transportDetails", "salespersons",
  ]) {
    const key = name as keyof CleanupCounts;
    deleted[key] = await deleteCollection(name);
  }

  // Orders are deleted last so nested production records are already gone.
  deleted.orders = await deleteCollection("orders");

  // Delete only party/salesperson profile documents and their notification tokens.
  const users = await getDocs(collection(db, "users"));
  const removable = users.docs.filter((d) => {
    const role = String(d.data().role || "").toLowerCase();
    return role === "party" || role === "salesperson";
  });
  await Promise.all(removable.map(async (userDoc) => {
    const tokens = await getDocs(collection(db, "users", userDoc.id, "notificationTokens"));
    await Promise.all(tokens.docs.map((token) => deleteDoc(token.ref)));
    await deleteDoc(userDoc.ref);
  }));
  deleted.partyUsers = removable.filter((d) => String(d.data().role || "").toLowerCase() === "party").length;
  deleted.salespersonUsers = removable.filter((d) => String(d.data().role || "").toLowerCase() === "salesperson").length;

  const cleanupId = `CLIENT-CLEANUP-${new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}`;
  const completedAt = new Date().toISOString();
  return { cleanupId, deleted, completedAt };
}

export function cleanupErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (!error || typeof error !== "object") return "Cleanup service error.";
  const value = error as { code?: unknown; message?: unknown; details?: unknown };
  return [
    typeof value.code === "string" ? `Code: ${value.code.replace(/^functions\//, "")}` : "",
    typeof value.message === "string" ? value.message : "Cleanup service error.",
    typeof value.details === "string" ? value.details : "",
  ].filter(Boolean).join("\n");
}
