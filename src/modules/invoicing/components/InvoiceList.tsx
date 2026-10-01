"use client";

import Link from "next/link";
import { T } from "@/i18n";
import type { Invoice } from "../invoiceTypes";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";

function money(n: number): string {
  return `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function InvoiceList({
  invoices,
  loading,
}: {
  invoices: Invoice[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        <T>Loading</T>…
      </div>
    );
  }

  if (!invoices.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
        <T>No invoices found</T>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-semibold"><T>Invoice number</T></th>
            <th className="px-4 py-3 font-semibold"><T>Invoice date</T></th>
            <th className="px-4 py-3 font-semibold"><T>Customer</T></th>
            <th className="px-4 py-3 font-semibold"><T>Type</T></th>
            <th className="px-4 py-3 font-semibold"><T>Order number</T></th>
            <th className="px-4 py-3 font-semibold text-right"><T>Amount</T></th>
            <th className="px-4 py-3 font-semibold"><T>Status</T></th>
            <th className="px-4 py-3 font-semibold"><T>Actions</T></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {invoices.map((inv) => (
            <tr key={inv.id} className="hover:bg-slate-50/80">
              <td className="px-4 py-3 font-medium text-slate-900">
                {inv.invoiceNumber || (
                  <span className="text-slate-400"><T>Draft</T></span>
                )}
              </td>
              <td className="px-4 py-3 text-slate-600">{inv.invoiceDate || "—"}</td>
              <td className="px-4 py-3 text-slate-800">
                {inv.recipientSnapshot?.name || "—"}
              </td>
              <td className="px-4 py-3 text-slate-600">{inv.invoiceType}</td>
              <td className="px-4 py-3 text-slate-600">
                {inv.orderNumber || "—"}
              </td>
              <td className="px-4 py-3 text-right font-medium text-slate-900">
                {money(inv.grandTotal)}
              </td>
              <td className="px-4 py-3">
                <InvoiceStatusBadge status={inv.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/admin/invoices/${inv.id}`}
                    className="text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    <T>View</T>
                  </Link>
                  {inv.status === "DRAFT" && (
                    <Link
                      href={`/admin/invoices/new?edit=${inv.id}`}
                      className="text-slate-600 hover:text-slate-900 font-medium"
                    >
                      <T>Edit</T>
                    </Link>
                  )}
                  {inv.status === "DRAFT" && (
                    <Link
                      href={`/admin/invoices/${inv.id}`}
                      className="text-emerald-700 hover:text-emerald-900 font-medium"
                    >
                      <T>Issue</T>
                    </Link>
                  )}
                  {inv.status === "ISSUED" && (
                    <Link
                      href={`/admin/invoices/${inv.id}`}
                      className="text-rose-600 hover:text-rose-800 font-medium"
                    >
                      <T>Cancel</T>
                    </Link>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
