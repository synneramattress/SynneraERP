export default function StatusBadge({
  label,
  className = "bg-slate-100 text-slate-700",
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );
}
