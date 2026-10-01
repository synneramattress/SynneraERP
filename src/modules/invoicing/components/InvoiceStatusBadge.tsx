"use client";

import { T } from "@/i18n";
import type { InvoiceStatus } from "../invoiceTypes";
import { INVOICE_STATUS_LABELS } from "../invoiceDefinitions";

const styles: Record<InvoiceStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  ISSUED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-rose-100 text-rose-800",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || styles.DRAFT}`}
    >
      <T>{INVOICE_STATUS_LABELS[status] || status}</T>
    </span>
  );
}
