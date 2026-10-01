"use client";

import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";
import { T } from "@/i18n";
import { InvoiceSettingsPanel } from "@/modules/invoicing";

export default function AdminInvoiceSettingsPage() {
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
        <Settings className="h-6 w-6 text-indigo-600" />
        <h1 className="text-xl font-semibold text-slate-900">
          <T>Invoice Settings</T>
        </h1>
      </div>
      <InvoiceSettingsPanel />
    </div>
  );
}
