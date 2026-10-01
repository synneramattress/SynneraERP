/**
 * Sales pure helpers — no Firestore.
 */

import {
  SALESPERSON_ROLE,
  SALESPERSON_STATUS_ACTIVE,
  SALESPERSON_STATUS_INACTIVE,
  SALESPERSON_ID_PREFIX,
  SALESPERSON_ID_PAD,
} from "./salesDefinitions";
import type { SalespersonRecord } from "./salesTypes";

export function mapSalesperson(
  id: string,
  data: Record<string, unknown>
): SalespersonRecord {
  return {
    id,
    uid: String(data.uid || id),
    name: data.name != null ? String(data.name) : undefined,
    email: data.email != null ? String(data.email) : undefined,
    loginEmail:
      data.loginEmail != null
        ? String(data.loginEmail)
        : data.email != null
          ? String(data.email)
          : undefined,
    mobile:
      data.mobile != null
        ? String(data.mobile)
        : data.phone != null
          ? String(data.phone)
          : undefined,
    phone: data.phone != null ? String(data.phone) : undefined,
    salespersonId:
      data.salespersonId != null
        ? String(data.salespersonId)
        : data.salespersonCode != null
          ? String(data.salespersonCode)
          : undefined,
    role: data.role != null ? String(data.role) : undefined,
    status: data.status != null ? String(data.status) : undefined,
    city: data.city != null ? String(data.city) : undefined,
    internalNotes:
      data.internalNotes != null ? String(data.internalNotes) : undefined,
    compensationType:
      data.compensationType != null ? String(data.compensationType) : undefined,
    createdBy: data.createdBy != null ? String(data.createdBy) : undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    ...data,
  };
}

export function isSalespersonActive(s: SalespersonRecord): boolean {
  return (
    String(s.status || SALESPERSON_STATUS_ACTIVE).toUpperCase() !==
    SALESPERSON_STATUS_INACTIVE
  );
}

/** Regular salary (default) — not commission-only */
export function isRegularSalarySalesperson(s: SalespersonRecord): boolean {
  const ct = String(s.compensationType || "REGULAR_SALARY").toUpperCase();
  return ct !== "COMMISSION_ONLY";
}

/** Active + Regular Salary — eligible for party assignment / assisted order */
export function isAssignableSalesperson(s: SalespersonRecord): boolean {
  return isSalespersonActive(s) && isRegularSalarySalesperson(s);
}

export function formatSalespersonOptionLabel(s: SalespersonRecord): string {
  const name = salespersonDisplayName(s);
  const code = s.salespersonId ? ` (${s.salespersonId})` : "";
  const city = s.city ? ` — ${s.city}` : "";
  return `${name}${code}${city}`;
}

export function looksLikeSalesperson(s: SalespersonRecord): boolean {
  const role = String(s.role || "").toLowerCase();
  return (
    role === SALESPERSON_ROLE ||
    role.includes("sales") ||
    !!s.salespersonId
  );
}

export function salespersonDisplayName(s: SalespersonRecord): string {
  return String(
    s.name || s.loginEmail || s.email || s.salespersonId || s.id || "Salesperson"
  );
}

export function normalizeSalespersonId(code: string): string {
  return String(code || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function sortSalespersonsByName(
  rows: SalespersonRecord[]
): SalespersonRecord[] {
  return [...rows].sort((a, b) =>
    salespersonDisplayName(a).localeCompare(
      salespersonDisplayName(b),
      undefined,
      { sensitivity: "base" }
    )
  );
}

export function countSalespersonStatuses(rows: SalespersonRecord[]): {
  total: number;
  active: number;
  inactive: number;
} {
  let active = 0;
  let inactive = 0;
  for (const r of rows) {
    if (isSalespersonActive(r)) active++;
    else inactive++;
  }
  return { total: rows.length, active, inactive };
}


export function formatSalespersonId(nextNum: number): string {
  return `${SALESPERSON_ID_PREFIX}${String(nextNum).padStart(SALESPERSON_ID_PAD, "0")}`;
}
