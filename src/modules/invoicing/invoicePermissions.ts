import type { UserRole } from "@/types/identity";
import type { InvoiceStatus } from "./invoiceTypes";
import { isInvoiceMutable } from "./invoiceLogic";

export function canCreateInvoice(role?: UserRole | string | null): boolean {
  return role === "admin";
}

export function canEditInvoice(
  role?: UserRole | string | null,
  status?: InvoiceStatus
): boolean {
  if (role !== "admin") return false;
  if (status && !isInvoiceMutable(status)) return false;
  return true;
}

export function canIssueInvoice(role?: UserRole | string | null): boolean {
  return role === "admin";
}

export function canCancelInvoice(role?: UserRole | string | null): boolean {
  return role === "admin";
}

export function canViewAllInvoices(role?: UserRole | string | null): boolean {
  return role === "admin";
}

/** Future Phase 5: party/salesperson view own invoices */
export function canViewOwnInvoices(role?: UserRole | string | null): boolean {
  return role === "admin" || role === "party" || role === "salesperson";
}

export function canDownloadShareInvoice(role?: UserRole | string | null): boolean {
  return role === "admin" || role === "party" || role === "salesperson";
}
