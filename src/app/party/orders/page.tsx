"use client";
import { T, useLanguage } from "@/i18n";
import SearchFilterBar from "@/components/shared/SearchFilterBar";
import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import type { OrderStatus } from "@/modules/orders";
import {
  displayOrderNumber,
  toMillisSafe,
} from "@/lib/utils";
import {
  usePartyOrders,
  canPartyEdit,
} from "@/modules/orders";
import { Pencil } from "lucide-react";
import { PartyOrderCard } from "@/components/party/PartyOrderCard";

type FilterKey = "all" | "submitted" | "production" | "ready_to_dispatch" | "draft" | OrderStatus;

function norm(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export default function PartyOrdersPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const { orders, loading, error, reload } = usePartyOrders(user?.uid);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>(
    (searchParams.get("status") as FilterKey) || "all"
  );

  useEffect(() => {
    const s = searchParams.get("status") as FilterKey | null;
    if (s) setFilter(s);
  }, [searchParams]);

  const filtered = useMemo(() => {
    return orders
      .filter((o) => {
        const st = norm(o.status);
        if (filter === "all") return true;
        if (filter === "submitted") return st === "submitted";
        if (filter === "draft") return st === "draft";
        if (filter === "ready_to_dispatch")
          return (
            st === "ready_to_dispatch" ||
            norm(o.productionStatus || "") === "ready_to_dispatch"
          );
        if (filter === "production")
          return (
            ["approved", "assigned", "in_production"].includes(st) ||
            ["assigned", "in_production", "queue"].includes(
              norm(o.productionStatus || "")
            )
          );
        return st === filter;
      })
      .filter((o) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          displayOrderNumber(o).toLowerCase().includes(q) ||
          o.id.toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          toMillisSafe(b.updatedAt || b.createdAt) -
          toMillisSafe(a.updatedAt || a.createdAt)
      );
  }, [orders, filter, search]);


  const chipCounts = useMemo(() => {
    const norm = (s: string) => String(s || "").toLowerCase().replace(/\s+/g, "_");
    const counts: Record<string, number> = {
      all: orders.length,
      draft: 0,
      submitted: 0,
      production: 0,
      ready_to_dispatch: 0,
    };
    for (const o of orders) {
      const st = norm(o.status || "");
      if (st === "draft") counts.draft++;
      else if (st === "submitted") counts.submitted++;
      else if (
        st === "ready_to_dispatch" ||
        norm(o.productionStatus || "") === "ready_to_dispatch"
      )
        counts.ready_to_dispatch++;
      else if (
        ["approved", "assigned", "in_production"].includes(st) ||
        ["assigned", "in_production", "queue"].includes(norm(o.productionStatus || ""))
      )
        counts.production++;
    }
    return counts;
  }, [orders]);

  const chips: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "draft", label: "Draft" },
    { key: "submitted", label: "Pending" },
    { key: "production", label: "In Production" },
    { key: "ready_to_dispatch", label: "Ready" },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">
        <T>Orders</T>
      </h1>

      <SearchFilterBar
        search={search}
        onSearchChange={setSearch}
        placeholder={t("Search by Order ID")}
        values={{ status: filter === "all" ? "" : filter }}
        onApply={(v) => setFilter((v.status as FilterKey) || "all")}
        filterGroups={[
          {
            key: "status",
            label: "Status",
            options: chips.map((c) => ({ value: c.key, label: c.label })),
          },
        ]}
      />

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setFilter(c.key)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold ${
              filter === c.key
                ? "bg-[#330066] text-white"
                : "bg-white border border-slate-200 text-slate-700"
            }`}
          >
            <T>{c.label}</T>
            <span className={`ml-1.5 ${filter === c.key ? "opacity-90" : "text-slate-400"}`}>
              {chipCounts[c.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 rounded-xl p-3">{error}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#330066] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
          <T>No orders found.</T>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => {
            const showEdit = canPartyEdit(o.status);
            const editAction = showEdit ? (
              <Link
                href={`/party/orders/new?edit=${o.id}`}
                className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 text-[#330066]"
                title={t("Edit")}
                aria-label={t("Edit")}
                onClick={(e) => e.stopPropagation()}
              >
                <Pencil className="w-4 h-4" />
              </Link>
            ) : undefined;

            return (
              <PartyOrderCard key={o.id} order={o} editAction={editAction} />
            );
          })}
        </div>
      )}
    </div>
  );
}
