"use client";

import Link from "next/link";
import { T } from "@/i18n";
import { useAuth } from "@/context/AuthContext";
import {
  useMasterRates,
  useMaterialCostingCalculator,
} from "@/modules/material-costing";
import { SelectionPanel } from "@/modules/material-costing/components/SelectionPanel";
import { CostBreakdownCard } from "@/modules/material-costing/components/CostBreakdownCard";
import { Settings2 } from "lucide-react";

export default function MaterialCostingPage() {
  const { user, loading: authLoading } = useAuth();
  const { rates, loading: ratesLoading } = useMasterRates(
    !authLoading && user?.role === "admin"
  );
  const calc = useMaterialCostingCalculator(rates);

  if (authLoading || ratesLoading) {
    return (
      <div className="p-6 text-sm text-slate-500">
        <T>Loading material costing…</T>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="p-8 text-center font-semibold text-rose-600">
        <T>Access Denied: Admin privileges required.</T>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 pb-24 md:p-6">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 md:text-2xl">
            <T>Material Costing</T>
          </h1>
          <p className="text-xs text-slate-500 md:text-sm">
            <T>5×6 ft reference · Live manufacturing cost per sq.ft</T>
          </p>
        </div>
        <Link
          href="/admin/material-costing/custom"
          className="inline-flex items-center gap-2 rounded-lg bg-[#330066] px-4 py-2 text-xs font-semibold text-white shadow mr-2"
        >
          Custom Builder
        </Link>
        <Link
          href="/admin/material-costing/rates"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-700"
        >
          <Settings2 className="h-4 w-4" />
          <T>Edit Master Rates</T>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-5">
        <div className="lg:col-span-3">
          <SelectionPanel
            category={calc.category}
            setCategory={calc.setCategory}
            warranty={calc.warranty}
            setWarranty={calc.setWarranty}
            thickness={calc.thickness}
            setThickness={calc.setThickness}
            fabric={calc.fabric}
            setFabric={calc.setFabric}
            availableCategories={calc.availableCategories}
            availableWarranties={calc.availableWarranties}
            availableThicknesses={calc.availableThicknesses}
            availableFabrics={calc.availableFabrics}
            coreLayersLabel={calc.coreLayersLabel}
          />
        </div>
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-4">
            <CostBreakdownCard
              result={calc.result}
              isSpring={calc.category === "spring"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
