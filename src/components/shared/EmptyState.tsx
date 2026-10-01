import type { ReactNode } from "react";

export default function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
      {icon && <div className="mb-2 flex justify-center text-slate-300">{icon}</div>}
      <p className="font-medium text-slate-600">{title}</p>
      {description && <p className="text-xs mt-1">{description}</p>}
    </div>
  );
}
