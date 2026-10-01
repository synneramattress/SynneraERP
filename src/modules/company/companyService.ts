import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  COMPANY_SETTINGS_COLLECTION,
  COMPANY_SETTINGS_DOC,
  DEFAULT_INVOICE_SETTINGS,
} from "./companyDefinitions";
import type {
  CompanyProfile,
  CompanyProfileWrite,
  CompanyAuthorizedSignatory,
  CompanyInvoiceSettings,
  CompanyBankDetails,
} from "./companyTypes";
import type { Address } from "@/types/address";
import { EMPTY_ADDRESS } from "@/types/address";

/**
 * Firestore rejects undefined. Recursively strip undefined from plain objects/arrays.
 * null is kept (can clear fields with merge when needed).
 */
export function stripUndefinedDeep<T>(value: T): T {
  if (value === undefined) {
    return value;
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => stripUndefinedDeep(item))
      .filter((item) => item !== undefined) as T;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v === undefined) continue;
    out[k] = stripUndefinedDeep(v);
  }
  return out as T;
}

function asAddress(raw: unknown): Address {
  if (!raw || typeof raw !== "object") return { ...EMPTY_ADDRESS };
  const a = raw as Record<string, unknown>;
  return {
    line1: String(a.line1 || ""),
    line2: a.line2 != null ? String(a.line2) : "",
    city: String(a.city || ""),
    district: a.district != null ? String(a.district) : "",
    state: String(a.state || ""),
    stateCode: String(a.stateCode || ""),
    pincode: String(a.pincode || ""),
    country: String(a.country || "India"),
  };
}

function asSignatory(raw: unknown): CompanyAuthorizedSignatory {
  if (!raw || typeof raw !== "object") return { name: "" };
  const s = raw as Record<string, unknown>;
  return {
    name: String(s.name || ""),
    designation: s.designation != null ? String(s.designation) : undefined,
    signatureImageUrl:
      s.signatureImageUrl != null ? String(s.signatureImageUrl) : undefined,
    stampImageUrl: s.stampImageUrl != null ? String(s.stampImageUrl) : undefined,
  };
}

function asBank(raw: unknown): CompanyBankDetails | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const b = raw as Record<string, unknown>;
  const upiQr =
    b.upiQrImageUrl != null ? String(b.upiQrImageUrl) : undefined;
  // Keep bank object if any payment field or QR exists (not only classic bank trio)
  if (
    !b.bankName &&
    !b.accountNumber &&
    !b.ifsc &&
    !b.upiId &&
    !upiQr
  ) {
    return undefined;
  }
  return {
    bankName: String(b.bankName || ""),
    accountName: b.accountName != null ? String(b.accountName) : undefined,
    accountNumber: String(b.accountNumber || ""),
    ifsc: String(b.ifsc || ""),
    branch: b.branch != null ? String(b.branch) : undefined,
    upiId: b.upiId != null ? String(b.upiId) : undefined,
    upiQrImageUrl: upiQr,
  };
}

function asInvoiceSettings(raw: unknown): CompanyInvoiceSettings {
  const d = DEFAULT_INVOICE_SETTINGS;
  if (!raw || typeof raw !== "object") {
    return {
      invoicePrefix: d.invoicePrefix,
      financialYearStartMonth: d.financialYearStartMonth,
      financialYearStartDay: d.financialYearStartDay,
      gstAmountType: d.gstAmountType || "EXCLUSIVE",
    };
  }
  const s = raw as Record<string, unknown>;
  const rawMode = String(
    s.gstAmountType || d.gstAmountType || "EXCLUSIVE"
  ).toUpperCase();
  const gstAmountType =
    rawMode === "INCLUSIVE" ? "INCLUSIVE" : "EXCLUSIVE";
  return {
    invoicePrefix: String(s.invoicePrefix || d.invoicePrefix),
    financialYearStartMonth: Number(
      s.financialYearStartMonth ?? d.financialYearStartMonth
    ),
    financialYearStartDay: Number(
      s.financialYearStartDay ?? d.financialYearStartDay
    ),
    gstAmountType,
  };
}

export function mapCompanyDoc(
  data: Record<string, unknown> | undefined
): CompanyProfile {
  const d = data || {};
  return {
    id: "company",
    legalName: String(d.legalName || ""),
    tradeName: d.tradeName != null ? String(d.tradeName) : undefined,
    gstin: String(d.gstin || ""),
    udyamNumber: d.udyamNumber ? String(d.udyamNumber) : undefined,
    pan: d.pan != null ? String(d.pan) : undefined,
    address: asAddress(d.address),
    phone: d.phone != null ? String(d.phone) : undefined,
    email: d.email != null ? String(d.email) : undefined,
    website: d.website != null ? String(d.website) : undefined,
    logoUrl: d.logoUrl != null ? String(d.logoUrl) : undefined,
    authorizedSignatory: asSignatory(d.authorizedSignatory),
    bankDetails: asBank(d.bankDetails),
    invoiceSettings: asInvoiceSettings(d.invoiceSettings),
    updatedAt: d.updatedAt,
    updatedBy: d.updatedBy != null ? String(d.updatedBy) : undefined,
  };
}

export async function fetchCompanyProfile(): Promise<CompanyProfile | null> {
  try {
    const snap = await getDoc(
      doc(db, COMPANY_SETTINGS_COLLECTION, COMPANY_SETTINGS_DOC)
    );
    if (!snap.exists()) return null;
    return mapCompanyDoc(snap.data() as Record<string, unknown>);
  } catch (e) {
    console.error("fetchCompanyProfile", e);
    return null;
  }
}

export async function saveCompanyProfile(
  data: CompanyProfileWrite,
  updatedBy?: string
): Promise<void> {
  const ref = doc(db, COMPANY_SETTINGS_COLLECTION, COMPANY_SETTINGS_DOC);
  const existing = await getDoc(ref);
  const prev = existing.exists()
    ? mapCompanyDoc(existing.data() as Record<string, unknown>)
    : mapCompanyDoc(undefined);

  const next: CompanyProfile = {
    id: "company",
    legalName: data.legalName?.trim() ?? prev.legalName,
    tradeName:
      data.tradeName !== undefined
        ? data.tradeName?.trim() || undefined
        : prev.tradeName,
    gstin: (data.gstin ?? prev.gstin)?.trim().toUpperCase() || "",
    udyamNumber: (data.udyamNumber ?? prev.udyamNumber)?.trim() || undefined,
    pan:
      data.pan !== undefined
        ? data.pan?.trim().toUpperCase() || undefined
        : prev.pan,
    address: data.address
      ? {
          ...EMPTY_ADDRESS,
          ...data.address,
          stateCode: (data.address.stateCode || "").toUpperCase(),
          country: data.address.country || "India",
        }
      : prev.address,
    phone:
      data.phone !== undefined
        ? data.phone?.trim() || undefined
        : prev.phone,
    email:
      data.email !== undefined
        ? data.email?.trim() || undefined
        : prev.email,
    website:
      data.website !== undefined
        ? data.website?.trim() || undefined
        : prev.website,
    logoUrl:
      data.logoUrl !== undefined ? data.logoUrl || undefined : prev.logoUrl,
    authorizedSignatory: {
      ...prev.authorizedSignatory,
      ...(data.authorizedSignatory || {}),
      name:
        data.authorizedSignatory?.name !== undefined
          ? String(data.authorizedSignatory.name || "").trim()
          : prev.authorizedSignatory.name,
    },
    bankDetails:
      data.bankDetails === null
        ? undefined
        : data.bankDetails
          ? {
              bankName: String(
                data.bankDetails.bankName ?? prev.bankDetails?.bankName ?? ""
              ).trim(),
              accountName:
                data.bankDetails.accountName !== undefined
                  ? data.bankDetails.accountName?.trim() || undefined
                  : prev.bankDetails?.accountName,
              accountNumber: String(
                data.bankDetails.accountNumber ??
                  prev.bankDetails?.accountNumber ??
                  ""
              ).trim(),
              ifsc: String(
                data.bankDetails.ifsc ?? prev.bankDetails?.ifsc ?? ""
              )
                .trim()
                .toUpperCase(),
              branch:
                data.bankDetails.branch !== undefined
                  ? data.bankDetails.branch?.trim() || undefined
                  : prev.bankDetails?.branch,
              upiId:
                data.bankDetails.upiId !== undefined
                  ? data.bankDetails.upiId?.trim() || undefined
                  : prev.bankDetails?.upiId,
              upiQrImageUrl:
                data.bankDetails.upiQrImageUrl !== undefined
                  ? data.bankDetails.upiQrImageUrl || undefined
                  : prev.bankDetails?.upiQrImageUrl,
            }
          : prev.bankDetails,
    invoiceSettings: {
      ...prev.invoiceSettings,
      ...(data.invoiceSettings || {}),
      invoicePrefix: String(
        data.invoiceSettings?.invoicePrefix ??
          prev.invoiceSettings.invoicePrefix
      ).trim(),
      financialYearStartMonth: Number(
        data.invoiceSettings?.financialYearStartMonth ??
          prev.invoiceSettings.financialYearStartMonth
      ),
      financialYearStartDay: Number(
        data.invoiceSettings?.financialYearStartDay ??
          prev.invoiceSettings.financialYearStartDay
      ),
      gstAmountType:
        data.invoiceSettings?.gstAmountType === "INCLUSIVE" ||
        data.invoiceSettings?.gstAmountType === "EXCLUSIVE"
          ? data.invoiceSettings.gstAmountType
          : prev.invoiceSettings.gstAmountType || "EXCLUSIVE",
    },
  };

  const payload = stripUndefinedDeep({
    ...next,
    id: "company",
    updatedAt: serverTimestamp(),
    ...(updatedBy ? { updatedBy } : {}),
  });

  await setDoc(ref, payload, { merge: true });
}
