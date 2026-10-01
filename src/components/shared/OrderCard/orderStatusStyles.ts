/** Shared light semantic status styles for Order cards */

export type OrderStatusStyle = {
  bg: string;
  text: string;
  dot: string;
  label: string;
};

const MAP: Record<string, OrderStatusStyle> = {
  draft: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    dot: "bg-slate-500",
    label: "Draft",
  },
  submitted: {
    bg: "bg-sky-50",
    text: "text-sky-800",
    dot: "bg-sky-500",
    label: "Submitted",
  },
  approved: {
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    dot: "bg-emerald-500",
    label: "Approved",
  },
  rejected: {
    bg: "bg-rose-50",
    text: "text-rose-800",
    dot: "bg-rose-500",
    label: "Rejected",
  },
  assigned: {
    bg: "bg-violet-50",
    text: "text-violet-800",
    dot: "bg-violet-500",
    label: "Assigned",
  },
  in_production: {
    bg: "bg-violet-50",
    text: "text-violet-800",
    dot: "bg-violet-500",
    label: "In Production",
  },
  ready_to_dispatch: {
    bg: "bg-teal-50",
    text: "text-teal-800",
    dot: "bg-teal-500",
    label: "Ready to Dispatch",
  },
  dispatched: {
    bg: "bg-indigo-50",
    text: "text-indigo-800",
    dot: "bg-indigo-500",
    label: "Dispatched",
  },
  delivered: {
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    dot: "bg-emerald-500",
    label: "Delivered",
  },
  cancelled: {
    bg: "bg-slate-100",
    text: "text-slate-600",
    dot: "bg-slate-400",
    label: "Cancelled",
  },
  // Production-focused aliases
  queue: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    dot: "bg-slate-500",
    label: "Queue",
  },
};

export function orderStatusStyle(
  status: string | undefined | null
): OrderStatusStyle {
  const key = String(status || "draft")
    .toLowerCase()
    .replace(/\s+/g, "_");
  return (
    MAP[key] || {
      bg: "bg-slate-100",
      text: "text-slate-700",
      dot: "bg-slate-400",
      label: String(status || "—")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
    }
  );
}

/** @deprecated Use orderStatusStyle */
export const salesOrderStatusStyle = orderStatusStyle;
export type SalesOrderStatusStyle = OrderStatusStyle;
