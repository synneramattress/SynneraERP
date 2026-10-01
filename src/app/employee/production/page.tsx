"use client";

import { T } from "@/i18n";

import SearchFilterBar from "@/components/shared/SearchFilterBar";
import { OrderCard } from "@/components/shared/OrderCard";

import { fetchOrdersAssignedToEmployee } from "@/modules/production";
import { fetchAllParties } from "@/modules/parties";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import type { Order } from "@/modules/orders";
import type { ProductionStatus } from "@/modules/production";
import {
  productionStatusLabel,
  displayOrderNumber,
} from "@/lib/utils";
import { Factory } from "lucide-react";


function listTime(value: any): number {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.seconds === "number") return value.seconds * 1000;
  const n = new Date(value).getTime();
  return Number.isFinite(n) ? n : 0;
}
export default function EmployeeProductionListPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [partyMap, setPartyMap] = useState<Record<string, { shopName?: string; city?: string }>>({});
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status");
  const allowed = ["all", "assigned", "in_production", "ready_to_dispatch"] as const;
  type ProdFilter = (typeof allowed)[number];
  const initialFilter: ProdFilter =
    initialStatus && (allowed as readonly string[]).includes(initialStatus)
      ? (initialStatus as ProdFilter)
      : "all";

  const [filter, setFilter] = useState<ProdFilter>(initialFilter);
  const [search, setSearch] = useState("");
  const [sortProduction, setSortProduction] = useState("priority");

  useEffect(() => {
    const s = searchParams.get("status");
    if (s && (allowed as readonly string[]).includes(s)) {
      setFilter(s as ProdFilter);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user?.uid) return;
    const load = async () => {
      setLoading(true);
      try {
        const [list, parties] = await Promise.all([
          fetchOrdersAssignedToEmployee(user.uid),
          fetchAllParties().catch(() => []),
        ]);
        const map: Record<string, { shopName?: string; city?: string }> = {};
        for (const pt of parties) {
          map[pt.id] = {
            shopName: (pt as any).shopName || (pt as any).company,
            city: (pt as any).city,
          };
        }
        setPartyMap(map);
        const pRank: Record<string, number> = { urgent: 0, high: 1, normal: 2 };
        list.sort((a, b) => {
          const pa = pRank[a.productionPriority || "normal"] ?? 2;
          const pb = pRank[b.productionPriority || "normal"] ?? 2;
          if (pa !== pb) return pa - pb;
          return 0;
        });
        setOrders(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.uid]);

  const counts = {
    all: orders.length,
    assigned: 0,
    in_production: 0,
    ready_to_dispatch: 0,
  };
  for (const o of orders) {
    const s = (o.productionStatus || "assigned") as string;
    if (s === "assigned") counts.assigned++;
    else if (s === "in_production") counts.in_production++;
    else if (s === "ready_to_dispatch") counts.ready_to_dispatch++;
  }

  const filtered = orders.filter((o) => {
    if (filter !== "all" && o.productionStatus !== filter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      displayOrderNumber(o).toLowerCase().includes(q) ||
      o.id.toLowerCase().includes(q) ||
      (o.partyName || "").toLowerCase().includes(q) ||
      (o.notes || "").toLowerCase().includes(q)
    );
  });

  const sortedOrders = [...filtered].sort((a, b) => {
    if (sortProduction === "newest") return listTime(b.createdAt) - listTime(a.createdAt);
    if (sortProduction === "oldest") return listTime(a.createdAt) - listTime(b.createdAt);
    if (sortProduction === "order_asc") return displayOrderNumber(a).localeCompare(displayOrderNumber(b), undefined, { numeric: true });
    if (sortProduction === "recent_update") return listTime(b.updatedAt) - listTime(a.updatedAt);
    const rank: Record<string, number> = { urgent: 0, high: 1, normal: 2 };
    return (rank[a.productionPriority || "normal"] ?? 2) - (rank[b.productionPriority || "normal"] ?? 2);
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
        <Factory className="w-5 h-5 text-[#330066]" /> Production
      </h1>

      <SearchFilterBar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search order, party, notes..."
        values={{ status: filter }}
        onApply={(v) => setFilter((v.status || "all") as "all" | "assigned" | "in_production" | "ready_to_dispatch")}
        filterGroups={[{ key: "status", label: "Production Status", options: [
          { value: "all", label: "All" }, { value: "assigned", label: "Assigned" },
          { value: "in_production", label: "In Production" }, { value: "ready_to_dispatch", label: "Ready to Dispatch" }
        ]}]}
        sortOptions={[
          { value: "priority", label: "Priority" }, { value: "newest", label: "Newest Orders" },
          { value: "oldest", label: "Oldest Orders" }, { value: "recent_update", label: "Recently Updated" },
          { value: "order_asc", label: "Order Number A–Z" }
        ]}
        sortValue={sortProduction}
        onSortChange={setSortProduction}
      />

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {(
          [
            ["all", "All", counts.all],
            ["assigned", "Assigned", counts.assigned],
            ["in_production", "In Production", counts.in_production],
            ["ready_to_dispatch", "Ready", counts.ready_to_dispatch],
          ] as const
        ).map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
              filter === key
                ? "bg-[#330066] text-white"
                : "bg-white border border-slate-200 text-slate-600"
            }`}
          >
            {label}{" "}
            <span className={filter === key ? "opacity-80 font-normal" : "text-slate-400 font-normal"}>
              ({count})
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-[#330066] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sortedOrders.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
          <T>No orders in this filter.</T>
        </div>
      ) : (
        <div className="space-y-2.5">
          {sortedOrders.map((order) => {
            const status = (order.productionStatus || "assigned") as ProductionStatus;
            const shop =
              (order as any).partyShopName ||
              partyMap[order.partyId]?.shopName ||
              "";
            const city =
              (order as any).partyCity || partyMap[order.partyId]?.city || "";
            const partyName = order.partyName || "Party";
            const partyLine = [partyName, shop, city]
              .map((s) => String(s || "").trim())
              .filter(Boolean)
              .filter((v, i, arr) => arr.indexOf(v) === i)
              .join(" · ");
            const qty = order.physicalMattressCount || order.totalQuantity;

            return (
              <OrderCard
                key={order.id}
                order={order}
                href={`/employee/production/${order.id}`}
                showCity={false}
                showProduct={false}
                showAmount={false}
                shortDate={false}
                statusSource="production"
                showSpeak={true}
                showPriority={true}
                statusLabel={productionStatusLabel(status)}
                subtitle={partyLine}
                quantity={Number(qty) || 0}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
