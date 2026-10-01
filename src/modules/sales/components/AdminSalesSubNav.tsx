"use client";

import { T } from "@/i18n";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin/sales", label: "Salespersons", match: (p: string) => p === "/admin/sales" },
  {
    href: "/admin/sales/prospects",
    label: "Prospects",
    match: (p: string) => p.startsWith("/admin/sales/prospects"),
  },
  {
    href: "/admin/sales/commissions",
    label: "Commission",
    match: (p: string) => p.startsWith("/admin/sales/commissions"),
  },
  {
    href: "/admin/sales/marketing",
    label: "Marketing Materials",
    match: (p: string) => p.startsWith("/admin/sales/marketing"),
  },
] as const;

export default function AdminSalesSubNav() {
  const pathname = usePathname() || "";
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-0.5">
      {ITEMS.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${
              active
                ? "bg-[#330066] text-white"
                : "bg-white border border-slate-200 text-slate-600"
            }`}
          >
            <T>{item.label}</T>
          </Link>
        );
      })}
    </div>
  );
}
