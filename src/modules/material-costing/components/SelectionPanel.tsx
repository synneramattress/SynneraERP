"use client";

import { T } from "@/i18n";
import type { MattressTypeKey } from "@/lib/catalog/mattressTypes";
import { MATTRESS_TYPE_LABELS } from "@/lib/catalog/mattressTypes";
import { WARRANTY_LABELS } from "@/lib/catalog/warranty";
import type { MaterialFabricKey } from "../types/materialCosting.types";
import { MATERIAL_FABRIC_LABELS } from "../types/materialCosting.types";

interface SelectionPanelProps {
  category: MattressTypeKey;
  setCategory: (v: MattressTypeKey) => void;
  warranty: string;
  setWarranty: (v: string) => void;
  thickness: number;
  setThickness: (v: number) => void;
  fabric: MaterialFabricKey;
  setFabric: (v: MaterialFabricKey) => void;
  availableCategories: MattressTypeKey[];
  availableWarranties: string[];
  availableThicknesses: number[];
  availableFabrics: MaterialFabricKey[];
  coreLayersLabel: string;
}

function PillGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
  renderLabel,
}: {
  label: string;
  options: T[];
  value: T;
  onChange: (v: T) => void;
  renderLabel?: (v: T) => string;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
        <T>{label}</T>
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = opt === value;
          return (
            <button
              key={String(opt)}
              type="button"
              onClick={() => onChange(opt)}
              className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? "bg-[#330066] text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
              }`}
            >
              {active ? "✓ " : ""}
              {renderLabel ? renderLabel(opt) : String(opt)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SelectionPanel(props: SelectionPanelProps) {
  const {
    category,
    setCategory,
    warranty,
    setWarranty,
    thickness,
    setThickness,
    fabric,
    setFabric,
    availableCategories,
    availableWarranties,
    availableThicknesses,
    availableFabrics,
    coreLayersLabel,
  } = props;

  const typeLabel =
    MATTRESS_TYPE_LABELS[category as MattressTypeKey] || String(category);
  const warrantyLabel =
    WARRANTY_LABELS[warranty as keyof typeof WARRANTY_LABELS] ||
    `${warranty} Years`;
  const fabricLabel =
    MATERIAL_FABRIC_LABELS[fabric as MaterialFabricKey] || String(fabric);

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <h2 className="text-sm font-bold text-slate-900">
        <T>Cost Configuration</T>
      </h2>

      <PillGroup
        label="Mattress Type"
        options={availableCategories}
        value={category}
        onChange={setCategory}
        renderLabel={(k) =>
          MATTRESS_TYPE_LABELS[k as MattressTypeKey] || String(k)
        }
      />

      <PillGroup
        label="Warranty"
        options={availableWarranties}
        value={warranty}
        onChange={setWarranty}
        renderLabel={(w) =>
          WARRANTY_LABELS[w as keyof typeof WARRANTY_LABELS] || `${w} Years`
        }
      />

      <PillGroup
        label="Thickness"
        options={availableThicknesses}
        value={thickness}
        onChange={setThickness}
        renderLabel={(t) => `${t}"`}
      />

      <PillGroup
        label="Fabric"
        options={availableFabrics}
        value={fabric}
        onChange={setFabric}
        renderLabel={(f) =>
          MATERIAL_FABRIC_LABELS[f as MaterialFabricKey] || String(f)
        }
      />

      <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          <T>Selected Configuration</T>
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-900">
          {typeLabel.toUpperCase()} · {warrantyLabel.toUpperCase()} · {thickness}
          &quot;
        </p>
        <p className="text-xs font-medium text-slate-700">{fabricLabel}</p>
        {coreLayersLabel && (
          <p className="mt-1 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-600">
              <T>Core layers</T>:
            </span>{" "}
            {coreLayersLabel}
          </p>
        )}
      </div>
    </div>
  );
}
