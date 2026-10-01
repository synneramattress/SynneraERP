"use client";
import { T } from "@/i18n";

import SearchFilterBar from "@/components/shared/SearchFilterBar";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { RefreshCw, Factory } from "lucide-react";
import type { Order } from "@/modules/orders";
import {
  productionStatusLabel,
  toMillisSafe,
  displayOrderNumber,
} from "@/lib/utils";
import { resolveProdStatus } from "@/modules/production";
import { fetchAllOrders } from "@/modules/orders";
import { fetchAllParties } from "@/modules/parties";
import { OrderCard } from "@/components/shared/OrderCard";

type ProdFilter = "all" | "queue" | "assigned" | "in_production" | "ready_to_dispatch";

interface PartyInfo {
  name?: string;
  shopName?: string;
  city?: string;
}

function normStatus(v: unknown): string {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function isInProductionList(o: Order): boolean {
  const st = normStatus(o.status);
  if (st === "rejected" || st === "draft" || st === "submitted") return false;
  const ps = normStatus(o.productionStatus);
  if (["queue", "assigned", "in_production", "ready_to_dispatch"].includes(ps)) return true;
  if (
    st === "approved" ||
    st === "assigned" ||
    st === "in_production" ||
    st === "ready_to_dispatch"
  ) {
    return true;
  }
  return false;
}

function listTime(value: any): number {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.seconds === "number") return value.seconds * 1000;
  const n = new Date(value).getTime();
  return Number.isFinite(n) ? n : 0;
}
export default function AdminProductionPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [partyMap, setPartyMap] = useState<Record<string, PartyInfo>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const searchParams = useSearchParams();
  const initialProd = (searchParams.get("status") as ProdFilter) || "all";
  const [filter, setFilter] = useState<ProdFilter>(
    ["queue", "assigned", "in_production", "ready_to_dispatch", "all"].includes(initialProd)
      ? initialProd
      : "all"
  );
  useEffect(() => {
    const s = searchParams.get("status") as ProdFilter | null;
    if (s && ["queue", "assigned", "in_production", "ready_to_dispatch", "all"].includes(s)) {
      setFilter(s);
    }
  }, [searchParams]);

  const [sortProduction, setSortProduction] = useState<"newest" | "oldest" | "priority" | "order_asc">("newest");


  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [allOrders, parties] = await Promise.all([
        fetchAllOrders(),
        fetchAllParties().catch(() => []),
      ]);
      const data = allOrders
        .filter(isInProductionList)
        .sort((a, b) => toMillisSafe(b.updatedAt || b.approvedAt) - toMillisSafe(a.updatedAt || a.approvedAt));
      setOrders(data);

      const map: Record<string, PartyInfo> = {};
      parties.forEach((u) => {
        map[u.id] = {
          name: u.name || u.shopName,
          shopName: u.shopName || u.company,
          city: u.city,
        };
      });
      setPartyMap(map);
    } catch (err) {
      console.error(err);
      setError("Could not load production orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resolveParty = (order: Order) => {
    const fromMap = order.partyId ? partyMap[order.partyId] : undefined;
    return {
      name: order.partyName || fromMap?.name || order.partyEmail || "Party",
      shop: (order as any).shopName || fromMap?.shopName || "",
      city: (order as any).city || fromMap?.city || "",
    };
  };

  const counts = useMemo(() => {
    const c = { all: orders.length, queue: 0, assigned: 0, in_production: 0, ready_to_dispatch: 0 };
    for (const o of orders) {
      const s = resolveProdStatus(o);
      if (s in c) (c as any)[s]++;
    }
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (filter !== "all" && resolveProdStatus(o) !== filter) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const p = resolveParty(o);

      return (
        displayOrderNumber(o).toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.shop.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        (o.assignedEmployeeName || "").toLowerCase().includes(q)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, filter, searchQuery, partyMap]);

  const sortedProduction = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortProduction === "oldest") {
        return listTime(a.createdAt) - listTime(b.createdAt);
      }
      if (sortProduction === "order_asc") {
        return displayOrderNumber(a).localeCompare(
          displayOrderNumber(b),
          undefined,
          { numeric: true }
        );
      }
      if (sortProduction === "priority") {
        const rank: Record<string, number> = {
          urgent: 0,
          high: 1,
          normal: 2,
        };
        return (
          (rank[a.productionPriority || "normal"] ?? 2) -
          (rank[b.productionPriority || "normal"] ?? 2)
        );
      }
      return listTime(b.createdAt) - listTime(a.createdAt);
    });
  }, [filtered, sortProduction]);

  const filters: { key: ProdFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "queue", label: "Queue", count: counts.queue },
    { key: "assigned", label: "Assigned", count: counts.assigned },
    { key: "in_production", label: "In Production", count: counts.in_production },
    { key: "ready_to_dispatch", label: "Ready to Dispatch", count: counts.ready_to_dispatch },
  ];

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Factory className="w-5 h-5 text-[#330066]" />
            Production
          </h1>
          <p className="text-sm text-slate-500 mt-0.5"><T>Queue, assign and track production</T></p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <SearchFilterBar
        search={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Search order, party, shop, city..."
        values={{ status: filter }}
        onApply={(v) => setFilter((v.status || "all") as ProdFilter)}
        filterGroups={[{ key: "status", label: "Production Status", options: [
          { value: "all", label: "All" }, { value: "queue", label: "Queue" }, { value: "assigned", label: "Assigned" },
          { value: "in_production", label: "In Production" }, { value: "ready_to_dispatch", label: "Ready to Dispatch" }
        ]}]}
        sortOptions={[
          { value: "newest", label: "Newest Orders" }, { value: "oldest", label: "Oldest Orders" },
          { value: "priority", label: "Priority" }, { value: "order_asc", label: "Order Number A–Z" }
        ]}
        sortValue={sortProduction}
        onSortChange={(value) => setSortProduction(value as "newest" | "oldest" | "priority" | "order_asc")}
      />

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
              filter === f.key
                ? "bg-[#330066] text-white"
                : "bg-white border border-slate-200 text-slate-600"
            }`}
          >
            {f.label}{" "}
            <span className={filter === f.key ? "opacity-80 font-normal" : "text-slate-400 font-normal"}>
              ({f.count})
            </span>
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 text-sm rounded-xl p-3 border border-rose-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#330066] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sortedProduction.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500 text-sm">
          No production orders found.
        </div>
      ) : (
        <div className="space-y-3">
          {sortedProduction.map((order) => {
            const ps = resolveProdStatus(order);
            const isRetail =
              String(order.orderType || "").toUpperCase() === "RETAIL";
            const { name, shop, city } = resolveParty(order);

            const customerName =
              order.customerName || order.customer?.name || "";
            const customerCity =
              order.customerCity || order.customer?.city || "";

            const subtitle = isRetail
              ? [customerName || "—", customerCity].filter(Boolean).join(" • ")
              : [name, shop, city].filter(Boolean).join(" • ") || "—";

            const metaPrefix = isRetail
              ? (order.salespersonName || "").trim() || undefined
              : undefined;

            return (
              <OrderCard
                key={order.id}
                order={order}
                href={`/admin/production/${order.id}`}
                showCity={false}
                showProduct={true}
                showAmount={false}
                showQty={false}
                shortDate={true}
                showPriority={true}
                statusSource="production"
                statusLabel={productionStatusLabel(ps)}
                subtitle={subtitle}
                metaPrefix={metaPrefix}
                metaRight={
                  order.assignedEmployeeName
                    ? order.assignedEmployeeName
                    : undefined
                }
                // Prefer production-relevant date on line 4
                // OrderCard uses createdAt by default for date — override via quantity N/A
              />
            );
          })}
        </div>
      )}
    </div>
  );
}