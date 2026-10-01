import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
  orderBy,
  query,
  where,
  type DocumentData,
  type UpdateData,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { PRODUCTS_COLLECTION, DEFAULT_TAX_PROFILE } from "../productDefinitions";
import type { Product, ProductWriteInput, ProductTaxProfile } from "../productTypes";
import { validateProduct } from "../productValidation";
import { normalizeSku } from "../productLogic";

function asTaxProfile(raw: unknown): ProductTaxProfile {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_TAX_PROFILE };
  }
  const t = raw as {
    taxability?: string;
    hsnSacCode?: unknown;
    gstRate?: unknown;
    effectiveFrom?: unknown;
    active?: unknown;
  };
  const taxability = t.taxability;
  return {
    taxability:
      taxability === "EXEMPT" ||
      taxability === "NIL_RATED" ||
      taxability === "NON_GST" ||
      taxability === "TAXABLE"
        ? taxability
        : "TAXABLE",
    hsnSacCode: t.hsnSacCode != null ? String(t.hsnSacCode) : undefined,
    gstRate:
      t.gstRate != null && !Number.isNaN(Number(t.gstRate))
        ? Number(t.gstRate)
        : undefined,
    effectiveFrom:
      t.effectiveFrom != null ? String(t.effectiveFrom) : undefined,
    active: t.active !== false,
  };
}

export function mapProductDoc(id: string, data: DocumentData): Product {
  return {
    id,
    name: String(data.name || ""),
    sku: data.sku != null ? String(data.sku) : undefined,
    description:
      data.description != null ? String(data.description) : undefined,
    unit: String(data.unit || "PCS"),
    defaultSellingPrice: Number(data.defaultSellingPrice) || 0,
    active: data.active !== false,
    taxProfile: asTaxProfile(data.taxProfile),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    createdBy: data.createdBy != null ? String(data.createdBy) : undefined,
    updatedBy: data.updatedBy != null ? String(data.updatedBy) : undefined,
  };
}

function productFirestorePayload(input: ProductWriteInput): DocumentData {
  const skuNorm = normalizeSku(input.sku);
  return {
    name: input.name.trim(),
    sku: skuNorm || null,
    skuNormalized: skuNorm || null,
    description: input.description?.trim() || null,
    unit: input.unit || "PCS",
    defaultSellingPrice: Number(input.defaultSellingPrice) || 0,
    active: input.active !== false,
    taxProfile: {
      taxability: input.taxProfile.taxability,
      hsnSacCode: input.taxProfile.hsnSacCode?.trim() || null,
      gstRate:
        input.taxProfile.gstRate != null
          ? Number(input.taxProfile.gstRate)
          : null,
      effectiveFrom: input.taxProfile.effectiveFrom?.trim() || null,
      active: input.taxProfile.active !== false,
    },
  };
}

/**
 * Case-insensitive SKU uniqueness among products.
 * excludeProductId: when editing, allow the product to keep its own SKU.
 */
export async function isSkuTaken(
  sku: string | undefined | null,
  excludeProductId?: string
): Promise<boolean> {
  const norm = normalizeSku(sku);
  if (!norm) return false;

  // Prefer indexed field skuNormalized
  try {
    const q = query(
      collection(db, PRODUCTS_COLLECTION),
      where("skuNormalized", "==", norm)
    );
    const snap = await getDocs(q);
    return snap.docs.some((d) => d.id !== excludeProductId);
  } catch {
    // Fallback: client-side scan if index missing
    const all = await fetchProducts();
    return all.some(
      (p) =>
        p.id !== excludeProductId &&
        normalizeSku(p.sku) === norm
    );
  }
}

export async function fetchProducts(): Promise<Product[]> {
  try {
    const q = query(collection(db, PRODUCTS_COLLECTION), orderBy("name"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapProductDoc(d.id, d.data()));
  } catch {
    const snap = await getDocs(collection(db, PRODUCTS_COLLECTION));
    const list = snap.docs.map((d) => mapProductDoc(d.id, d.data()));
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }
}

export async function fetchActiveProducts(): Promise<Product[]> {
  const all = await fetchProducts();
  return all.filter((p) => p.active);
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const snap = await getDoc(doc(db, PRODUCTS_COLLECTION, id));
  if (!snap.exists()) return null;
  return mapProductDoc(snap.id, snap.data());
}

export async function createProduct(
  input: ProductWriteInput,
  meta?: { createdBy?: string }
): Promise<string> {
  const v = validateProduct(input);
  if (!v.valid) throw new Error(v.errors[0] || "Invalid product");

  if (await isSkuTaken(input.sku)) {
    throw new Error("A product with this SKU already exists.");
  }

  const ref = doc(collection(db, PRODUCTS_COLLECTION));
  const body = productFirestorePayload(input);
  await setDoc(ref, {
    ...body,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: meta?.createdBy || null,
    updatedBy: meta?.createdBy || null,
  });
  return ref.id;
}

export async function updateProduct(
  id: string,
  input: ProductWriteInput,
  meta?: { updatedBy?: string }
): Promise<void> {
  const v = validateProduct(input);
  if (!v.valid) throw new Error(v.errors[0] || "Invalid product");

  if (await isSkuTaken(input.sku, id)) {
    throw new Error("A product with this SKU already exists.");
  }

  const body = productFirestorePayload(input);
  const patch: UpdateData<DocumentData> = {
    ...body,
    updatedAt: serverTimestamp(),
    updatedBy: meta?.updatedBy || null,
  };
  await updateDoc(doc(db, PRODUCTS_COLLECTION, id), patch);
}

export async function setProductActive(
  id: string,
  active: boolean,
  meta?: { updatedBy?: string }
): Promise<void> {
  const patch: UpdateData<DocumentData> = {
    active,
    updatedAt: serverTimestamp(),
    updatedBy: meta?.updatedBy || null,
  };
  await updateDoc(doc(db, PRODUCTS_COLLECTION, id), patch);
}

/**
 * Soft-deactivate only. Products may be referenced by future invoices —
 * hard delete is not supported from Product Master.
 */
export async function deactivateProduct(
  id: string,
  meta?: { updatedBy?: string }
): Promise<void> {
  await setProductActive(id, false, meta);
}
