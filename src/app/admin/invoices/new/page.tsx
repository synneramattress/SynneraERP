"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, FileText } from "lucide-react";
import { T } from "@/i18n";
import { InvoiceForm } from "@/modules/invoicing";

function NewInvoiceInner() {
  const search = useSearchParams();
  const orderId = search.get("orderId") || undefined;
  const editId = search.get("edit") || undefined;

  return (
    <div className="space-y-5">
      <Link
        href="/admin/invoices"
        className="inline-flex items-center gap-1 text-sm text-indigo-600"
      >
        <ArrowLeft className="h-4 w-4" />
        <T>Back to invoices</T>
      </Link>
      <div className="flex items-center gap-2">
        <FileText className="h-6 w-6 text-indigo-600" />
        <h1 className="text-xl font-semibold text-slate-900">
          {editId ? <T>Edit Invoice</T> : <T>Create Tax Invoice</T>}
        </h1>
      </div>
      <InvoiceForm orderId={orderId} editInvoiceId={editId} />
    </div>
  );
}

export default function AdminNewInvoicePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm text-slate-500">
          <T>Loading</T>…
        </div>
      }
    >
      <NewInvoiceInner />
    </Suspense>
  );
}
