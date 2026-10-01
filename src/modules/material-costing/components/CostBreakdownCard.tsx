"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { T } from "@/i18n";
import type { CostingBreakdownResult } from "../types/materialCosting.types";

interface CostBreakdownCardProps {
  result: CostingBreakdownResult;
  isSpring: boolean;
}

function Row({
  label,
  value,
  hide,
}: {
  label: string;
  value: number;
  hide?: boolean;
}) {
  if (hide || value <= 0) return null;
  return (
    <div className="flex items-center justify-between gap-3 py-1 text-sm text-slate-800">
      <span className="text-slate-700">
        <T>{label}</T>
      </span>
      <span className="shrink-0 font-medium tabular-nums text-slate-900">
        ₹{value.toFixed(2)}
      </span>
    </div>
  );
}

export function CostBreakdownCard({ result, isSpring }: CostBreakdownCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          <T>Manufacturing Cost</T>
        </p>
        <p className="text-[11px] text-slate-500">
          <T>5×6 FT REFERENCE</T>
        </p>

        <div className="mt-3 space-y-0.5 border-b border-slate-100 pb-3">
          <Row label="Core Layers" value={result.coreCostPerSqFt} />
          <Row label="Top Fabric / Quilt" value={result.topCostPerSqFt} />
          <Row label="Bottom Fabric / Quilt" value={result.bottomCostPerSqFt} />
          <Row label="Border Fabric / Quilt" value={result.borderCostPerSqFt} />
          <Row
            label="Spring Unit"
            value={result.springUnitCostPerSqFt}
            hide={!isSpring}
          />
          <Row
            label="Felt (T+B)"
            value={result.feltCostPerSqFt}
            hide={!isSpring}
          />
          <Row
            label="Side Foam"
            value={result.sideFoamCostPerSqFt}
            hide={!isSpring}
          />
          <Row label="Adhesive" value={result.adhesiveCostPerSqFt} />
          <Row label="Packing" value={result.packingCostPerSqFt} />
          <Row label="Binding Tape" value={result.biddingTapeCostPerSqFt} />
          <Row label="Branding" value={result.brandingCostPerSqFt} />
        </div>

        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <T>Total / Sq.Ft</T>
          </p>
          <p className="text-2xl font-bold tabular-nums text-[#330066] md:text-3xl">
            ₹{result.totalNetCostPerSqFt.toFixed(2)}
          </p>
          <div className="mt-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="text-slate-600">
              <T>5×6 Mattress Cost</T>
            </span>
            <span className="font-semibold tabular-nums text-slate-900">
              ₹{result.total5x6MattressCost.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          <T>Selling Suggestions</T>
        </p>
        <div className="mt-2 space-y-1.5 text-sm">
          <div className="flex justify-between gap-3">
            <span className="font-medium text-slate-700">+25%</span>
            <span className="tabular-nums font-semibold text-emerald-700">
              ₹{result.sellingPrice25.toFixed(2)} / sq.ft
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="font-medium text-slate-700">+30%</span>
            <span className="tabular-nums font-semibold text-emerald-700">
              ₹{result.sellingPrice30.toFixed(2)} / sq.ft
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="font-medium text-slate-700">+35%</span>
            <span className="tabular-nums font-semibold text-emerald-700">
              ₹{result.sellingPrice35.toFixed(2)} / sq.ft
            </span>
          </div>
        </div>
      </div>

      {(result.usedTopMaterial || result.usedBottomMaterial) && (
        <div className="rounded-xl border border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => setDetailsOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-slate-700"
          >
            <span>
              <T>Material Details</T>
            </span>
            {detailsOpen ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
            )}
          </button>
          {detailsOpen && (
            <div className="space-y-1 border-t border-slate-200 px-4 pb-3 pt-2 text-xs text-slate-600">
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">
                  <T>Top</T>
                </span>
                <span className="font-medium text-slate-800">
                  {result.usedTopMaterial}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">
                  <T>Bottom</T>
                </span>
                <span className="font-medium text-slate-800">
                  {result.usedBottomMaterial}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">
                  <T>Border</T>
                </span>
                <span className="font-medium text-slate-800">
                  {result.usedBorderMaterial} ({result.borderMeters} m)
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
