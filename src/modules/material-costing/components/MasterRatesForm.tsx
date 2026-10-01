"use client";

import { useState } from "react";
import type { MasterRawMaterialRates, MaterialFabricKey } from "../types/materialCosting.types";
import { MATERIAL_FABRIC_LABELS } from "../types/materialCosting.types";
import { RateInput } from "./shared/RateInput";
import { SectionCard } from "./shared/SectionCard";
import { KgMatrixTable } from "./shared/KgMatrixTable";
import { DEFAULT_MASTER_RATES } from "../constants/defaults";

interface MasterRatesFormProps {
  rates: MasterRawMaterialRates;
  setRates: (r: MasterRawMaterialRates) => void;
}

export function MasterRatesForm({ rates, setRates }: MasterRatesFormProps) {
  const [feltTab, setFeltTab] = useState<"hard" | "soft">("hard");
  const [sideTab, setSideTab] = useState<"low" | "high">("low");
  const [newFoamKey, setNewFoamKey] = useState("");
  const [newFoamRate, setNewFoamRate] = useState("");
  const [newFoamThick, setNewFoamThick] = useState("");
  const [newQuiltKey, setNewQuiltKey] = useState("");
  const [newQuiltRate, setNewQuiltRate] = useState("");
  const [newQuiltThick, setNewQuiltThick] = useState("");
  const patch = (partial: Partial<MasterRawMaterialRates>) =>
    setRates({ ...rates, ...partial });

  const systemFoamKeys = new Set(Object.keys(DEFAULT_MASTER_RATES.foamRates || {}));
  const systemQuiltKeys = new Set(Object.keys(DEFAULT_MASTER_RATES.quiltRates || {}));
  const userLayers = rates.userAddedLayers || {};
  const userQuilts = rates.userAddedQuilts || {};

  const addFoam = () => {
    const key = newFoamKey.trim().toLowerCase().replace(/\s+/g, "_");
    if (!key) return;
    if (systemFoamKeys.has(key) || userLayers[key]) {
      alert("Layer key already exists");
      return;
    }
    const rate = Number(newFoamRate) || 0;
    const thicknessIn = Number(newFoamThick) || 0;
    if (thicknessIn <= 0) {
      alert("Thickness (inches) is required");
      return;
    }
    patch({
      userAddedLayers: {
        ...userLayers,
        [key]: { rate, thicknessIn, label: newFoamKey.trim() },
      },
      foamRates: { ...rates.foamRates, [key]: rate },
      layerThicknesses: { ...(rates.layerThicknesses || {}), [key]: thicknessIn },
    });
    setNewFoamKey("");
    setNewFoamRate("");
    setNewFoamThick("");
  };

  const deleteFoam = (key: string) => {
    if (!userLayers[key]) return; // system not deletable
    if (!confirm(`Delete layer "${key}"?`)) return;
    const nextUser = { ...userLayers };
    delete nextUser[key];
    const nextFoam = { ...rates.foamRates };
    delete nextFoam[key];
    const nextThick = { ...(rates.layerThicknesses || {}) };
    delete nextThick[key];
    patch({
      userAddedLayers: nextUser,
      foamRates: nextFoam,
      layerThicknesses: nextThick,
    });
  };

  const addQuilt = () => {
    const key = newQuiltKey
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_");
    if (!key) return;
    if ((rates.quiltRates || {})[key] || userQuilts[key]) {
      alert("Quilt key already exists");
      return;
    }
    const rate = Number(newQuiltRate) || 0;
    const thicknessIn = Number(newQuiltThick) || 0;
    if (thicknessIn <= 0) {
      alert("Thickness (inches) is required");
      return;
    }
    patch({
      userAddedQuilts: {
        ...userQuilts,
        [key]: { rate, thicknessIn, label: newQuiltKey.trim() },
      },
      quiltRates: { ...rates.quiltRates, [key]: rate },
    });
    setNewQuiltKey("");
    setNewQuiltRate("");
    setNewQuiltThick("");
  };

  const deleteQuilt = (key: string) => {
    if (!userQuilts[key]) return;
    if (!confirm(`Delete quilt "${key}"?`)) return;
    const nextUser = { ...userQuilts };
    delete nextUser[key];
    const nextQ = { ...rates.quiltRates };
    delete nextQ[key];
    patch({ userAddedQuilts: nextUser, quiltRates: nextQ });
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {/* 1. Foam / Layer Rates */}
      <SectionCard title="Foam / Layer Rates (₹ / sq.ft)">
        {Object.entries(rates.foamRates).map(([key, val]) => {
          const isUser = !!userLayers[key]; // only user-added deletable
          const thick =
            rates.layerThicknesses?.[key] ??
            userLayers[key]?.thicknessIn;
          return (
            <div key={key} className="flex items-end gap-1">
              <div className="flex-1 min-w-0">
                <RateInput
                  label={
                    thick != null
                      ? `${key} (${thick}")`
                      : key
                  }
                  value={val}
                  onChange={(v) => {
                    const next: MasterRawMaterialRates = {
                      ...rates,
                      foamRates: { ...rates.foamRates, [key]: v },
                    };
                    if (isUser) {
                      next.userAddedLayers = {
                        ...userLayers,
                        [key]: { ...userLayers[key], rate: v },
                      };
                    }
                    setRates(next);
                  }}
                />
              </div>
              {isUser && (
                <button
                  type="button"
                  onClick={() => deleteFoam(key)}
                  className="mb-1 shrink-0 rounded-lg border border-rose-200 px-2 py-2 text-[10px] font-semibold text-rose-600"
                >
                  Del
                </button>
              )}
            </div>
          );
        })}
        <div className="mt-3 space-y-2 rounded-lg border border-dashed border-slate-200 p-2">
          <p className="text-[10px] font-semibold text-slate-500">
            Add custom layer (deletable)
          </p>
          <input
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
            placeholder="Name e.g. softy_3"
            value={newFoamKey}
            onChange={(e) => setNewFoamKey(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
              placeholder="Rate ₹/sq.ft"
              value={newFoamRate}
              onChange={(e) => setNewFoamRate(e.target.value)}
            />
            <input
              type="number"
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
              placeholder="Thickness inch"
              value={newFoamThick}
              onChange={(e) => setNewFoamThick(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={addFoam}
            className="w-full rounded-lg bg-[#330066] py-1.5 text-xs font-bold text-white"
          >
            + Add layer
          </button>
        </div>
      </SectionCard>

      {/* 2. Fabric Rates */}
      <SectionCard title="Fabric Rates (₹ / meter)">
        {(Object.keys(rates.fabricRates) as MaterialFabricKey[]).map((key) => (
          <RateInput
            key={key}
            label={MATERIAL_FABRIC_LABELS[key]}
            value={rates.fabricRates[key]}
            onChange={(v) =>
              patch({ fabricRates: { ...rates.fabricRates, [key]: v } })
            }
          />
        ))}
      </SectionCard>

      {/* 3. Quilt Rates */}
      <SectionCard title="Quilt Rates (₹ / meter)">
        {Object.entries(rates.quiltRates).map(([key, val]) => {
          const isUser = !!userQuilts[key] || (!systemQuiltKeys.has(key) && !!userQuilts[key]);
          const thick = userQuilts[key]?.thicknessIn;
          return (
            <div key={key} className="flex items-end gap-1">
              <div className="flex-1 min-w-0">
                <RateInput
                  label={
                    thick != null
                      ? `${key.replace(/_/g, " ")} (${thick}")`
                      : key.replace(/_/g, " ")
                  }
                  value={val}
                  onChange={(v) => {
                    const next: MasterRawMaterialRates = {
                      ...rates,
                      quiltRates: { ...rates.quiltRates, [key]: v },
                    };
                    if (isUser) {
                      next.userAddedQuilts = {
                        ...userQuilts,
                        [key]: { ...userQuilts[key], rate: v },
                      };
                    }
                    setRates(next);
                  }}
                />
              </div>
              {isUser && (
                <button
                  type="button"
                  onClick={() => deleteQuilt(key)}
                  className="mb-1 shrink-0 rounded-lg border border-rose-200 px-2 py-2 text-[10px] font-semibold text-rose-600"
                >
                  Del
                </button>
              )}
            </div>
          );
        })}
        <div className="mt-3 space-y-2 rounded-lg border border-dashed border-slate-200 p-2">
          <p className="text-[10px] font-semibold text-slate-500">
            Add custom quilt (deletable)
          </p>
          <input
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
            placeholder="Name e.g. QUILT 250"
            value={newQuiltKey}
            onChange={(e) => setNewQuiltKey(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
              placeholder="Rate ₹/meter"
              value={newQuiltRate}
              onChange={(e) => setNewQuiltRate(e.target.value)}
            />
            <input
              type="number"
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
              placeholder="Thickness inch"
              value={newQuiltThick}
              onChange={(e) => setNewQuiltThick(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={addQuilt}
            className="w-full rounded-lg bg-[#330066] py-1.5 text-xs font-bold text-white"
          >
            + Add quilt
          </button>
        </div>
      </SectionCard>

      {/* 4. Spring Unit */}
      <SectionCard title="Spring Unit">
        <RateInput
          label="110 mm (₹ / spring)"
          value={rates.springUnit.rates["110mm"]}
          onChange={(v) =>
            patch({
              springUnit: {
                ...rates.springUnit,
                rates: { ...rates.springUnit.rates, "110mm": v },
              },
            })
          }
        />
        <RateInput
          label="160 mm (₹ / spring)"
          value={rates.springUnit.rates["160mm"]}
          onChange={(v) =>
            patch({
              springUnit: {
                ...rates.springUnit,
                rates: { ...rates.springUnit.rates, "160mm": v },
              },
            })
          }
        />
        <RateInput
          label="200 mm (₹ / spring)"
          value={rates.springUnit.rates["200mm"]}
          onChange={(v) =>
            patch({
              springUnit: {
                ...rates.springUnit,
                rates: { ...rates.springUnit.rates, "200mm": v },
              },
            })
          }
        />
        <RateInput
          label="Transport (₹)"
          value={rates.springUnit.transport}
          onChange={(v) =>
            patch({ springUnit: { ...rates.springUnit, transport: v } })
          }
        />
        <p className="pt-1 text-[10px] text-slate-400">
          GST fixed 18% · Springs fixed 25×20 = 500
        </p>
      </SectionCard>

      {/* 5. Felt */}
      <SectionCard title="Felt (Spring only)">
        <div className="mb-2 flex gap-2">
          {(["hard", "soft"] as const).map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setFeltTab(q)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold capitalize ${
                feltTab === q ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              {q}
            </button>
          ))}
        </div>
        {feltTab === "hard" ? (
          <>
            <RateInput
              label="Rate (₹)"
              value={rates.felt.hard?.rate ?? rates.felt.hardRate}
              onChange={(v) =>
                patch({
                  felt: {
                    ...rates.felt,
                    hardRate: v,
                    hard: {
                      rate: v,
                      rollWeightKg: rates.felt.hard?.rollWeightKg ?? rates.felt.rollWeightKg ?? 55,
                      rollLengthFeet: rates.felt.hard?.rollLengthFeet ?? rates.felt.rollLengthFeet ?? 132,
                    },
                  },
                })
              }
            />
            <RateInput
              label="Roll Weight (kg)"
              value={rates.felt.hard?.rollWeightKg ?? rates.felt.rollWeightKg ?? 55}
              onChange={(v) =>
                patch({
                  felt: {
                    ...rates.felt,
                    hard: {
                      rate: rates.felt.hard?.rate ?? rates.felt.hardRate,
                      rollWeightKg: v,
                      rollLengthFeet: rates.felt.hard?.rollLengthFeet ?? 132,
                    },
                  },
                })
              }
              suffix=""
            />
            <RateInput
              label="Roll Length (ft)"
              value={rates.felt.hard?.rollLengthFeet ?? rates.felt.rollLengthFeet ?? 132}
              onChange={(v) =>
                patch({
                  felt: {
                    ...rates.felt,
                    hard: {
                      rate: rates.felt.hard?.rate ?? rates.felt.hardRate,
                      rollWeightKg: rates.felt.hard?.rollWeightKg ?? 55,
                      rollLengthFeet: v,
                    },
                  },
                })
              }
              suffix=""
            />
            <p className="text-[10px] text-slate-400">Thickness 0.25&quot; (fixed)</p>
          </>
        ) : (
          <>
            <RateInput
              label="Rate (₹)"
              value={rates.felt.soft?.rate ?? rates.felt.softRate}
              onChange={(v) =>
                patch({
                  felt: {
                    ...rates.felt,
                    softRate: v,
                    soft: {
                      rate: v,
                      rollWeightKg: rates.felt.soft?.rollWeightKg ?? 50,
                      rollLengthFeet: rates.felt.soft?.rollLengthFeet ?? 120,
                    },
                  },
                })
              }
            />
            <RateInput
              label="Roll Weight (kg)"
              value={rates.felt.soft?.rollWeightKg ?? 50}
              onChange={(v) =>
                patch({
                  felt: {
                    ...rates.felt,
                    soft: {
                      rate: rates.felt.soft?.rate ?? rates.felt.softRate,
                      rollWeightKg: v,
                      rollLengthFeet: rates.felt.soft?.rollLengthFeet ?? 120,
                    },
                  },
                })
              }
              suffix=""
            />
            <RateInput
              label="Roll Length (ft)"
              value={rates.felt.soft?.rollLengthFeet ?? 120}
              onChange={(v) =>
                patch({
                  felt: {
                    ...rates.felt,
                    soft: {
                      rate: rates.felt.soft?.rate ?? rates.felt.softRate,
                      rollWeightKg: rates.felt.soft?.rollWeightKg ?? 50,
                      rollLengthFeet: v,
                    },
                  },
                })
              }
              suffix=""
            />
            <p className="text-[10px] text-slate-400">Thickness 0.50&quot; (fixed)</p>
          </>
        )}
      </SectionCard>

      {/* 6. Side Foam */}
      <SectionCard title="Side Foam (Spring only)">
        <div className="mb-2 flex gap-2">
          {(["low", "high"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSideTab(t)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold capitalize ${
                sideTab === t ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mb-1">Area fixed 8.4 sq.ft</p>
        {([120, 170, 210] as const).map((mm) => {
          const key = `${mm}mm_${sideTab}` as keyof typeof rates.sideFoam.rates;
          return (
            <RateInput
              key={key}
              label={`${mm} mm ${sideTab} (₹/sq.ft)`}
              value={rates.sideFoam.rates[key] ?? 0}
              onChange={(v) =>
                patch({
                  sideFoam: {
                    ...rates.sideFoam,
                    rates: { ...rates.sideFoam.rates, [key]: v },
                  },
                })
              }
            />
          );
        })}
      </SectionCard>

      {/* 7. Bidding Tape */}
      <SectionCard title="Bidding Tape">
        <div className="mb-2 flex gap-2">
          {(["50mtr", "100mtr"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() =>
                patch({ biddingTape: { ...rates.biddingTape, active: t } })
              }
              className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                rates.biddingTape.active === t
                  ? "bg-amber-600 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {t === "50mtr" ? "50 mtr (Active)" : "100 mtr"}
              {rates.biddingTape.active === t ? " ✓" : ""}
            </button>
          ))}
        </div>
        {(["50mtr", "100mtr"] as const).map((t) => (
          <div key={t} className="mb-2 rounded border border-slate-100 p-2">
            <p className="mb-1 text-[10px] font-bold uppercase text-slate-500">
              {t}
            </p>
            <RateInput
              label="Roll Price"
              value={rates.biddingTape[t].rollPrice}
              onChange={(v) =>
                patch({
                  biddingTape: {
                    ...rates.biddingTape,
                    [t]: { ...rates.biddingTape[t], rollPrice: v },
                  },
                })
              }
            />
            <RateInput
              label="Roll Length (m)"
              value={rates.biddingTape[t].rollLengthMeters}
              onChange={(v) =>
                patch({
                  biddingTape: {
                    ...rates.biddingTape,
                    [t]: { ...rates.biddingTape[t], rollLengthMeters: v },
                  },
                })
              }
              suffix=""
            />
            <RateInput
              label="Meters used / mattress"
              value={rates.biddingTape[t].metersUsed}
              onChange={(v) =>
                patch({
                  biddingTape: {
                    ...rates.biddingTape,
                    [t]: { ...rates.biddingTape[t], metersUsed: v },
                  },
                })
              }
              suffix=""
            />
          </div>
        ))}
      </SectionCard>

      {/* 8. Adhesive */}
      <SectionCard title="Adhesive" className="md:col-span-2 xl:col-span-3">
        <RateInput
          label="Rate per kg"
          value={rates.adhesive.ratePerKg}
          onChange={(v) =>
            patch({ adhesive: { ...rates.adhesive, ratePerKg: v } })
          }
        />
        <div className="mt-3">
          <KgMatrixTable
            title="kg used by Type × Thickness"
            values={rates.adhesive.kgByTypeThickness}
            onChange={(key, val) =>
              patch({
                adhesive: {
                  ...rates.adhesive,
                  kgByTypeThickness: {
                    ...rates.adhesive.kgByTypeThickness,
                    [key]: val,
                  },
                },
              })
            }
          />
        </div>
      </SectionCard>

      {/* 9. Packing */}
      <SectionCard title="Packing" className="md:col-span-2 xl:col-span-3">
        <RateInput
          label="Rate per kg"
          value={rates.packing.ratePerKg}
          onChange={(v) =>
            patch({ packing: { ...rates.packing, ratePerKg: v } })
          }
        />
        <div className="mt-3">
          <KgMatrixTable
            title="kg used by Type × Thickness"
            values={rates.packing.kgByTypeThickness}
            onChange={(key, val) =>
              patch({
                packing: {
                  ...rates.packing,
                  kgByTypeThickness: {
                    ...rates.packing.kgByTypeThickness,
                    [key]: val,
                  },
                },
              })
            }
          />
        </div>
      </SectionCard>

      {/* 10. Branding (PVC removed from Material Costing) */}
      <SectionCard title="Branding">
        <RateInput
          label="Branding (₹ / sq.ft)"
          value={rates.branding.ratePerSqFt}
          onChange={(v) =>
            patch({ branding: { ...rates.branding, ratePerSqFt: v } })
          }
        />
      </SectionCard>
    </div>
  );
}
