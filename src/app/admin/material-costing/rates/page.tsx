"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useMasterRates } from "@/modules/material-costing";
import { MasterRatesForm } from "@/modules/material-costing/components/MasterRatesForm";
import { ArrowLeft, Save } from "lucide-react";

export default function MasterRatesPage() {
  const { user, loading: authLoading } = useAuth();
  const {
    rates,
    setRates,
    loading,
    saving,
    error,
    lastSavedAt,
    save,
  } = useMasterRates(!authLoading && user?.role === "admin");

  const [toast, setToast] = useState<"ok" | "err" | null>(null);

  if (authLoading || loading) {
    return (
      <div className="p-6 text-sm text-slate-500">Loading master rates…</div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="p-8 text-center font-semibold text-rose-600">
        Access Denied: Admin privileges required.
      </div>
    );
  }

  const handleSave = async () => {
    const ok = await save(rates, user.name || user.uid);
    setToast(ok ? "ok" : "err");
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 pb-24 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/admin/material-costing"
            className="mt-0.5 rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
            title="Back to Costing"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 md:text-2xl">
              Master Raw Material Rates
            </h1>
            <p className="text-xs text-slate-500">
              {lastSavedAt
                ? `Last saved: ${lastSavedAt.toLocaleString("en-IN")}`
                : "Edit all rates used by Material Costing"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save All Rates"}
        </button>
      </div>

      {/* Toast */}
      {toast === "ok" && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          Master rates saved successfully.
        </div>
      )}
      {(toast === "err" || error) && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">
          {error || "Failed to save rates."}
        </div>
      )}

      <MasterRatesForm rates={rates} setRates={setRates} />

      {/* Sticky bottom save for mobile */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save All Rates"}
        </button>
      </div>
    </div>
  );
}
