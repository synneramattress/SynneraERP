"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { T, useLanguage } from "@/i18n";

export type BottomNavItem = {
  href?: string;
  label: string;
  icon: LucideIcon;
  /** Center elevated primary action (e.g. New Order) */
  primary?: boolean;
  /** Match only exact path (optional) */
  exact?: boolean;
  /** Button action instead of link (e.g. More sheet) — only when no href */
  onClick?: () => void;
};

type AppBottomNavProps = {
  items: BottomNavItem[];
  /** Hide on large screens (default true for mobile-first PWA) */
  mobileOnly?: boolean;
};

function normalizePath(p: string): string {
  if (!p) return "/";
  if (p.length > 1 && p.endsWith("/")) return p.slice(0, -1);
  return p;
}

function isActive(pathname: string, item: BottomNavItem, allItems: BottomNavItem[]): boolean {
  if (!item.href) return false;
  const href = normalizePath(item.href);
  const path = normalizePath(pathname);
  if (item.exact) return path === href;
  const matches = allItems
    .filter((i) => !i.primary && i.href)
    .filter((i) => {
      const h = normalizePath(i.href || "");
      return path === h || path.startsWith(h + "/");
    })
    .sort((a, b) => (b.href?.length || 0) - (a.href?.length || 0));
  const top = matches[0]?.href;
  if (!top) return false;
  return normalizePath(top) === href;
}

export default function AppBottomNav({
  items,
  mobileOnly = true,
}: AppBottomNavProps) {
  const pathname = usePathname();
  useLanguage();
  const wrapClass = mobileOnly ? "lg:hidden" : "";

  return (
    <nav
      data-print-hide="true"
      className={`fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 ${wrapClass}`}
      aria-label="Main navigation"
    >
      <div className="flex items-center h-16 w-full max-w-lg mx-auto px-1">
        {items.map((item, idx) => {
          const Icon = item.icon;

          if (item.primary && item.href) {
            return (
              <Link
                key={item.href + idx}
                href={item.href}
                className="relative -top-4 shrink-0 w-14 h-14 rounded-full bg-[#330066] text-white shadow-lg flex items-center justify-center border-4 border-slate-50 mx-0.5"
                aria-label={item.label}
              >
                <Icon className="w-7 h-7" />
              </Link>
            );
          }

          // More / action button — only when there is NO href
          if (item.onClick && !item.href) {
            return (
              <button
                key={item.label + idx}
                type="button"
                onClick={item.onClick}
                className="flex-1 flex flex-col items-center gap-0.5 py-2 min-w-0 text-slate-500"
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium truncate max-w-full px-0.5">
                  <T>{item.label}</T>
                </span>
              </button>
            );
          }

          if (!item.href) return null;

          const active = isActive(pathname, item, items);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 min-w-0 ${
                active ? "text-[#330066]" : "text-slate-500"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium truncate max-w-full px-0.5">
                <T>{item.label}</T>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
