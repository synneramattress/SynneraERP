/**
 * Pure template fill — no network.
 */

import { formatLedgerRupee } from "../ledger/ledgerLogic";
import {
  getTemplate,
  type MessageTemplateId,
} from "./messageTemplates";

export type MessageVars = {
  partyName?: string;
  amount?: number | string;
  period?: string;
  opening?: number | string;
  debit?: number | string;
  credit?: number | string;
  closing?: number | string;
  paymentDate?: string;
  paymentNumber?: string;
  invoiceNumber?: string | null;
  companyName?: string;
};

function fmt(v: number | string | undefined): string {
  if (v == null || v === "") return "—";
  if (typeof v === "number") return formatLedgerRupee(v);
  return String(v);
}

export function renderMessageTemplate(
  id: MessageTemplateId,
  vars: MessageVars
): string {
  const tpl = getTemplate(id);
  const invoicePart = vars.invoiceNumber
    ? ` against invoice ${vars.invoiceNumber}`
    : "";
  const map: Record<string, string> = {
    partyName: vars.partyName?.trim() || "Customer",
    amount: fmt(vars.amount),
    period: vars.period || "—",
    opening: fmt(vars.opening),
    debit: fmt(vars.debit),
    credit: fmt(vars.credit),
    closing: fmt(vars.closing),
    paymentDate: vars.paymentDate || "—",
    paymentNumber: vars.paymentNumber || "—",
    invoicePart,
    companyName: vars.companyName || "Synnera",
  };

  return tpl.body.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    key in map ? map[key] : ""
  );
}

/** WhatsApp prefilled text must be URI-encoded */
export function whatsappTextHref(
  phone: string | null | undefined,
  text: string
): string | null {
  if (!phone) return null;
  let d = String(phone).replace(/\D/g, "");
  if (!d) return null;
  if (d.length === 10) d = "91" + d;
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}
