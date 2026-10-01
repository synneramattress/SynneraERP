"use client";

import type { MattressTypeKey } from "@/lib/catalog/mattressTypes";
import { MATTRESS_TYPE_LABELS } from "@/lib/catalog/mattressTypes";
import { isThicknessEditable } from "../../logic/isThicknessEditable";

const TYPES: MattressTypeKey[] = ["foam", "ortho", "memory", "latex", "spring"];
const THICKNESSES = [4, 5, 6, 8, 10, 12];

interface KgMatrixTableProps {
  title: string;
  values: Record<string, number>;
  onChange: (key: string, value: number) => void;
}

export function KgMatrixTable({ title, values, onChange }: KgMatrixTableProps) {
  return (
    <div className="overflow-x-auto">
      <p className="mb-2 text-xs font-semibold text-slate-600">{title}</p>
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-slate-50">
            <th className="px-2 py-1.5 text-left font-semibold text-slate-600">Type</th>
            {THICKNESSES.map((t) => (
              <th key={t} className="px-1 py-1.5 text-center font-semibold text-slate-600">
                {t}&quot;
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TYPES.map((type) => (
            <tr key={type} className="border-t border-slate-100">
              <td className="px-2 py-1 font-medium text-slate-700">
                {MATTRESS_TYPE_LABELS[type]}
              </td>
              {THICKNESSES.map((t) => {
                const key = `${type}_${t}`;
                const disabled = !isThicknessEditable(type, t);
                return (
                  <td key={t} className="px-1 py-1">
                    <input
                      type="number"
                      step="0.01"
                      disabled={disabled}
                      readOnly={disabled}
                      value={disabled ? (values[key] ?? "") : values[key] ?? ""}
                      onChange={(e) => {
                        if (disabled) return;
                        onChange(key, parseFloat(e.target.value) || 0);
                      }}
                      className="w-14 rounded border border-slate-200 px-1 py-0.5 text-center disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                      title={disabled ? "Not editable for this type/thickness" : undefined}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
