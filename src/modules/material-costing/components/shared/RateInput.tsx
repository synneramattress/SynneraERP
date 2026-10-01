"use client";

interface RateInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  step?: string;
  className?: string;
}

export function RateInput({
  label,
  value,
  onChange,
  suffix = "₹",
  step = "0.01",
  className = "",
}: RateInputProps) {
  return (
    <div className={`flex items-center justify-between gap-2 text-xs ${className}`}>
      <span className="text-slate-600 truncate">{label}</span>
      <div className="flex items-center gap-1">
        {suffix && <span className="text-slate-400">{suffix}</span>}
        <input
          type="number"
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-24 rounded border border-slate-200 bg-white px-2 py-1 text-right text-xs font-medium focus:border-blue-500 focus:outline-none"
        />
      </div>
    </div>
  );
}
