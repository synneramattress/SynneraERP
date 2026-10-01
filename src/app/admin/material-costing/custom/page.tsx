"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  useMasterRates,
  MATERIAL_FABRIC_KEYS,
  MATERIAL_FABRIC_LABELS,
  type MaterialFabricKey,
  type SpringHeightKey,
} from "@/modules/material-costing";
import {
  calculateCustomCost,
  type CustomBuildInput,
} from "@/modules/material-costing/logic/calculateCustomCost";
import {
  fetchCustomTemplates,
  saveCustomTemplate,
  deleteCustomTemplate,
  type CustomTemplate,
  type CustomTemplateCover,
} from "@/modules/material-costing/services/customTemplatesService";
import { CORE_LAYER_THICKNESS_IN } from "@/modules/material-costing/constants/thicknessCatalog";
import { listQuiltLabels, listCoreLayerKeys } from "@/modules/material-costing/logic/materialOptions";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";

const QUILT_OPTIONS = [
  "QUILT BLACK",
  "QUILT 200",
  "QUILT 300",
  "QUILT 400",
  "QUILT 5MM 300",
  "QUILT 10MM 300",
];

function coverFromSelect(
  value: string,
  baseFabric: MaterialFabricKey
): CustomTemplateCover {
  const isQuilt = value.toUpperCase().includes("QUILT");
  return {
    material: value,
    isQuilt,
    // Always store base fabric so cost uses the single selected fabric
    baseFabric,
  };
}

export default function CustomMattressBuilderPage() {
  const { user, loading: authLoading } = useAuth();
  const { rates, loading: ratesLoading } = useMasterRates(
    !authLoading && user?.role === "admin"
  );

  const [coreLayers, setCoreLayers] = useState<string[]>(["12_yr"]);
  const [topMat, setTopMat] = useState("QUILT 300");
  const [bottomMat, setBottomMat] = useState("PC COTTON");
  const [borderMat, setBorderMat] = useState("PC COTTON");
  const [baseFabric, setBaseFabric] = useState<MaterialFabricKey>("pc_cotton");
  const [springEnabled, setSpringEnabled] = useState(false);
  const [springHeight, setSpringHeight] = useState<SpringHeightKey>("110mm");
  const [feltQuality, setFeltQuality] = useState<"hard" | "soft">("hard");
  const [sideFoamTier, setSideFoamTier] = useState<"low" | "high">("low");
  const [addLayerKey, setAddLayerKey] = useState("");
  const [templates, setTemplates] = useState<CustomTemplate[]>([]);
  const [tplName, setTplName] = useState("");
  const [tplNotes, setTplNotes] = useState("");
  const [msg, setMsg] = useState("");

  const systemLayers = useMemo(() => {
    const keys = Object.keys(rates.foamRates || {});
    const userKeys = Object.keys(rates.userAddedLayers || {});
    return Array.from(new Set([...keys, ...userKeys]));
  }, [rates]);

  useEffect(() => {
    fetchCustomTemplates()
      .then(setTemplates)
      .catch(() => setTemplates([]));
  }, []);

  const input: CustomBuildInput = useMemo(
    () => ({
      coreLayers,
      top: coverFromSelect(topMat, baseFabric),
      bottom: coverFromSelect(bottomMat, baseFabric),
      border: coverFromSelect(borderMat, baseFabric),
      springEnabled,
      springHeight,
      feltQuality,
      sideFoamTier,
    }),
    [
      coreLayers,
      topMat,
      bottomMat,
      borderMat,
      baseFabric,
      springEnabled,
      springHeight,
      feltQuality,
      sideFoamTier,
    ]
  );

  const result = useMemo(
    () => calculateCustomCost(input, rates),
    [input, rates]
  );

  const addLayer = () => {
    if (!addLayerKey) return;
    setCoreLayers((prev) => [...prev, addLayerKey]);
    setAddLayerKey("");
  };

  const move = (i: number, dir: -1 | 1) => {
    setCoreLayers((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const saveTpl = async () => {
    if (!user?.uid || !tplName.trim()) {
      setMsg("Enter template name");
      return;
    }
    if (coreLayers.length < 1) {
      setMsg("Add at least 1 core layer");
      return;
    }
    try {
      await saveCustomTemplate(
        {
          name: tplName.trim(),
          notes: tplNotes,
          coreLayers,
          top: input.top,
          bottom: input.bottom,
          border: input.border,
          springEnabled,
          springHeight,
          feltQuality,
          sideFoamTier,
        },
        user.uid
      );
      setTemplates(await fetchCustomTemplates());
      setMsg("Template saved");
      setTplName("");
    } catch (e: any) {
      setMsg(e?.message || "Save failed");
    }
  };

  const loadTpl = (t: CustomTemplate) => {
    setCoreLayers(t.coreLayers || []);
    setTopMat(t.top?.material || "QUILT 300");
    setBottomMat(t.bottom?.material || "PC COTTON");
    setBorderMat(t.border?.material || "PC COTTON");
    if (t.top?.baseFabric) setBaseFabric(t.top.baseFabric);
    setSpringEnabled(!!t.springEnabled);
    if (t.springHeight) setSpringHeight(t.springHeight);
    if (t.feltQuality) setFeltQuality(t.feltQuality);
    if (t.sideFoamTier) setSideFoamTier(t.sideFoamTier);
    setTplNotes(t.notes || "");
    setMsg(`Loaded: ${t.name}`);
  };

  if (authLoading || ratesLoading) {
    return <div className="p-6 text-sm text-slate-500">Loading…</div>;
  }
  if (!user || user.role !== "admin") {
    return (
      <div className="p-8 text-center font-semibold text-rose-600">
        Access Denied
      </div>
    );
  }

  const baseFabricLabel = MATERIAL_FABRIC_LABELS[baseFabric];
  // Top/Bottom/Border: only the selected base fabric OR any quilt (quilt uses base fabric rate)
  const coverOptions = [
    baseFabricLabel,
    ...listQuiltLabels(rates),
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 pb-24 md:p-6">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 pb-4">
        <Link
          href="/admin/material-costing"
          className="rounded-lg border border-slate-200 p-2 text-slate-600"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">Custom Mattress Builder</h1>
          <p className="text-xs text-slate-500">
            Build layer by layer · 5×6 reference · Admin only
          </p>
        </div>
        <Link
          href="/admin/material-costing/rates"
          className="text-xs font-semibold text-amber-700 underline"
        >
          Master Rates
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-4">
          {/* Core layers */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <h2 className="text-sm font-bold">Core layers (min 1)</h2>
            <ul className="space-y-1">
              {coreLayers.map((layer, i) => (
                <li
                  key={`${layer}-${i}`}
                  className="flex items-center gap-2 text-sm rounded-lg bg-slate-50 px-2 py-1.5"
                >
                  <span className="flex-1 font-medium">{layer}</span>
                  <span className="text-[10px] text-slate-400">
                    {CORE_LAYER_THICKNESS_IN[layer] ??
                      rates.userAddedLayers?.[layer]?.thicknessIn ??
                      rates.layerThicknesses?.[layer] ??
                      "?"}
                    &quot;
                  </span>
                  <button type="button" className="text-xs" onClick={() => move(i, -1)}>
                    ↑
                  </button>
                  <button type="button" className="text-xs" onClick={() => move(i, 1)}>
                    ↓
                  </button>
                  <button
                    type="button"
                    className="text-rose-600"
                    onClick={() =>
                      setCoreLayers((prev) => prev.filter((_, j) => j !== i))
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <select
                className="flex-1 rounded-lg border border-slate-200 text-sm px-2 py-2"
                value={addLayerKey}
                onChange={(e) => setAddLayerKey(e.target.value)}
              >
                <option value="">Select layer…</option>
                {systemLayers.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addLayer}
                className="inline-flex items-center gap-1 rounded-lg bg-[#330066] px-3 py-2 text-xs font-bold text-white"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
          </div>

          {/* Cover */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <h2 className="text-sm font-bold">Cover</h2>
            <p className="text-[10px] text-slate-400">
              Choose one base fabric. Top / Bottom / Border can be that fabric or a quilt (quilt cost = fabric + quilt).
            </p>
            <label className="block text-xs text-slate-500">
              Base fabric
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                value={baseFabric}
                onChange={(e) => {
                  const next = e.target.value as MaterialFabricKey;
                  setBaseFabric(next);
                  const nextLabel = MATERIAL_FABRIC_LABELS[next];
                  const isQuilt = (v: string) =>
                    v.toUpperCase().includes("QUILT");
                  // If position was plain fabric (not quilt), switch to new base fabric
                  if (!isQuilt(topMat)) setTopMat(nextLabel);
                  if (!isQuilt(bottomMat)) setBottomMat(nextLabel);
                  if (!isQuilt(borderMat)) setBorderMat(nextLabel);
                }}
              >
                {MATERIAL_FABRIC_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {MATERIAL_FABRIC_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
            {(
              [
                ["Top", topMat, setTopMat],
                ["Bottom", bottomMat, setBottomMat],
                ["Border", borderMat, setBorderMat],
              ] as const
            ).map(([label, val, setVal]) => (
              <label key={label} className="block text-xs text-slate-500">
                {label}
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                  value={val}
                  onChange={(e) => setVal(e.target.value)}
                >
                  {coverOptions.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          {/* Spring */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <label className="flex items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={springEnabled}
                onChange={(e) => setSpringEnabled(e.target.checked)}
              />
              Spring mattress path
            </label>
            {springEnabled && (
              <>
                <div className="flex flex-wrap gap-2">
                  {(["110mm", "160mm", "200mm"] as SpringHeightKey[]).map(
                    (h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setSpringHeight(h)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                          springHeight === h
                            ? "bg-[#330066] text-white"
                            : "bg-slate-100"
                        }`}
                      >
                        {h}
                      </button>
                    )
                  )}
                </div>
                <div className="flex gap-2">
                  {(["hard", "soft"] as const).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setFeltQuality(q)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${
                        feltQuality === q
                          ? "bg-amber-600 text-white"
                          : "bg-slate-100"
                      }`}
                    >
                      Felt {q}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  {(["low", "high"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSideFoamTier(t)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${
                        sideFoamTier === t
                          ? "bg-sky-600 text-white"
                          : "bg-slate-100"
                      }`}
                    >
                      Side foam {t}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Save template */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
            <h2 className="text-sm font-bold">Save as Custom Template</h2>
            <input
              className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
              placeholder="Template name"
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
            />
            <textarea
              className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
              placeholder="Notes"
              rows={2}
              value={tplNotes}
              onChange={(e) => setTplNotes(e.target.value)}
            />
            <button
              type="button"
              onClick={saveTpl}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white"
            >
              <Save className="h-3.5 w-3.5" /> Save template
            </button>
            {msg && <p className="text-xs text-slate-600">{msg}</p>}
            {templates.length > 0 && (
              <ul className="mt-2 space-y-1">
                {templates.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-2 text-xs rounded bg-slate-50 px-2 py-1.5"
                  >
                    <button
                      type="button"
                      className="flex-1 text-left font-semibold text-[#330066]"
                      onClick={() => loadTpl(t)}
                    >
                      {t.name}
                    </button>
                    <button
                      type="button"
                      className="text-rose-600"
                      onClick={async () => {
                        if (confirm("Delete template?")) {
                          await deleteCustomTemplate(t.id);
                          setTemplates(await fetchCustomTemplates());
                        }
                      }}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Breakdown */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-4 rounded-xl border border-slate-800 bg-slate-900 p-5 text-white">
            <p className="text-[10px] font-semibold uppercase text-slate-400">
              Custom build cost (5×6)
            </p>
            <p className="mt-2 text-xs text-slate-300">
              Total thickness:{" "}
              <span className="font-bold text-white">
                {result.totalThickness}&quot;
              </span>
              {result.exceedsMax && (
                <span className="ml-2 text-rose-400">Max 12&quot; exceeded</span>
              )}
            </p>
            <p className="text-[10px] text-slate-500">
              Border uses nearest {result.nearestThickness}&quot; →{" "}
              {result.borderMeters} m
            </p>
            <div className="mt-3 space-y-1 border-b border-slate-700 pb-3 text-xs text-slate-300">
              <Row label="Core" v={result.coreCostPerSqFt} />
              <Row label="Top" v={result.topCostPerSqFt} />
              <Row label="Bottom" v={result.bottomCostPerSqFt} />
              <Row label="Border" v={result.borderCostPerSqFt} />
              {springEnabled && (
                <>
                  <Row label="Spring unit" v={result.springUnitCostPerSqFt} />
                  <Row label="Felt" v={result.feltCostPerSqFt} />
                  <Row label="Side foam" v={result.sideFoamCostPerSqFt} />
                </>
              )}
              <Row label="Adhesive" v={result.adhesiveCostPerSqFt} />
              <Row label="Packing" v={result.packingCostPerSqFt} />
              <Row label="PVC" v={result.pvcCostPerSqFt} />
              <Row label="Tape" v={result.biddingTapeCostPerSqFt} />
              <Row label="Branding" v={result.brandingCostPerSqFt} />
            </div>
            <div className="mt-4 flex justify-between text-amber-400">
              <span className="text-sm font-semibold">Total / Sq.Ft</span>
              <span className="text-2xl font-bold">
                ₹{result.totalNetCostPerSqFt.toFixed(2)}
              </span>
            </div>
            <div className="mt-1 flex justify-between text-xs text-slate-400">
              <span>5×6 Mattress</span>
              <span className="font-semibold text-white">
                ₹{result.total5x6MattressCost.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="mt-4 space-y-1 text-xs text-emerald-400">
              <div className="flex justify-between">
                <span>+25%</span>
                <span>₹{result.sellingPrice25.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>+30%</span>
                <span>₹{result.sellingPrice30.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>+35%</span>
                <span>₹{result.sellingPrice35.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, v }: { label: string; v: number }) {
  if (!v) return null;
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span>₹{v.toFixed(2)}</span>
    </div>
  );
}
