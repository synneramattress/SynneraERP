"use client";

import type { Address } from "@/types/address";
import { EMPTY_ADDRESS, INDIAN_STATES } from "@/types/address";

type AddressFieldsProps = {
  value: Address;
  onChange: (next: Address) => void;
  idPrefix?: string;
  disabled?: boolean;
  compact?: boolean;
  /** Mark line1, city, state as required (retail order customer step). */
  requiredCore?: boolean;
};

export default function AddressFields({
  value,
  onChange,
  idPrefix = "addr",
  disabled = false,
  compact = false,
  requiredCore = false,
}: AddressFieldsProps) {
  const v = value || EMPTY_ADDRESS;
  const set = (patch: Partial<Address>) => onChange({ ...v, ...patch });
  const fieldCls =
    "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#330066]/30 focus:border-[#330066]/40 disabled:bg-slate-50";
  const labelCls = "block text-xs font-medium text-slate-500 mb-1";
  const star = requiredCore ? " *" : "";

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div>
        <label className={labelCls} htmlFor={`${idPrefix}-line1`}>
          Address line 1{star}
        </label>
        <input
          id={`${idPrefix}-line1`}
          className={fieldCls}
          value={v.line1}
          disabled={disabled}
          onChange={(e) => set({ line1: e.target.value })}
          placeholder="Building / street"
        />
      </div>
      <div>
        <label className={labelCls} htmlFor={`${idPrefix}-line2`}>
          Address line 2
        </label>
        <input
          id={`${idPrefix}-line2`}
          className={fieldCls}
          value={v.line2 || ""}
          disabled={disabled}
          onChange={(e) => set({ line2: e.target.value })}
          placeholder="Area / landmark (optional)"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls} htmlFor={`${idPrefix}-city`}>
            City{star}
          </label>
          <input
            id={`${idPrefix}-city`}
            className={fieldCls}
            value={v.city}
            disabled={disabled}
            onChange={(e) => set({ city: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor={`${idPrefix}-district`}>
            District
          </label>
          <input
            id={`${idPrefix}-district`}
            className={fieldCls}
            value={v.district || ""}
            disabled={disabled}
            onChange={(e) => set({ district: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls} htmlFor={`${idPrefix}-state`}>
            State{star}
          </label>
          <select
            id={`${idPrefix}-state`}
            className={fieldCls}
            value={v.stateCode || ""}
            disabled={disabled}
            onChange={(e) => {
              const code = e.target.value;
              const found = INDIAN_STATES.find((s) => s.code === code);
              set({ stateCode: code, state: found?.label || v.state });
            }}
          >
            <option value="">Select state</option>
            {INDIAN_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor={`${idPrefix}-pincode`}>
            PIN code <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id={`${idPrefix}-pincode`}
            className={fieldCls}
            value={v.pincode}
            disabled={disabled}
            inputMode="numeric"
            maxLength={6}
            onChange={(e) =>
              set({ pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })
            }
          />
        </div>
      </div>
      <div>
        <label className={labelCls} htmlFor={`${idPrefix}-country`}>
          Country
        </label>
        <input
          id={`${idPrefix}-country`}
          className={fieldCls}
          value={v.country || "India"}
          disabled={disabled}
          onChange={(e) => set({ country: e.target.value })}
        />
      </div>
    </div>
  );
}
