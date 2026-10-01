"use client";
import { T } from "@/i18n";

import SearchFilterBar from "@/components/shared/SearchFilterBar";
import { OrderCard } from "@/components/shared/OrderCard";

import { fetchAllOrders } from "@/modules/orders";
import { fetchAllParties } from "@/modules/parties";
import { fetchInvoices } from "@/modules/invoicing";

import { useEffect, useState, useMemo, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { RefreshCw, ShoppingBag } from "lucide-react";
import type { Order, OrderStatus } from "@/modules/orders";
import type { User } from "@/types/identity";
import {
  displayOrderNumber,
} from "@/lib/utils";

type FilterStatus = "all" | OrderStatus | "production" | "assigned";

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

/** Employee assigned, work not yet in production */
function isAssignedStatus(o: Order): boolean {
  const ps = normStatus(o.productionStatus);
  const st = normStatus(o.status);
  if (ps === "in_production" || ps === "ready_to_dispatch") return false;
  if (st === "in_production" || st === "ready_to_dispatch") return false;
  if (ps === "assigned") return true;
  if (st === "assigned") return true;
  // Assigned employee set but still approved/queue
  if (o.assignedEmployeeId && (ps === "queue" || ps === "" || st === "approved")) {
    return true;
  }
  return false;
}

/** Actually in production floor (not merely assigned / approved / ready) */
function isProductionStatus(o: Order): boolean {
  const ps = normStatus(o.productionStatus);
  const st = normStatus(o.status);
  return ps === "in_production" || st === "in_production";
}

function listTime(value: any): number {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.seconds === "number") return value.seconds * 1000;
  const n = new Date(value).getTime();
  return Number.isFinite(n) ? n : 0;
}
export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "qty_desc" | "qty_asc">("newest");
  const [partyMap, setPartyMap] = useState<Record<string, PartyInfo>>({});
  const [issuedByOrder, setIssuedByOrder] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const searchParams = useSearchParams();
  const initialStatus = (searchParams.get("status") as FilterStatus) || "all";
  const [statusFilter, setFilterStatus] = useState<FilterStatus>(initialStatus);

  useEffect(() => {
    const s = searchParams.get("status") as FilterStatus | null;
    if (s) setFilterStatus(s);
  }, [searchParams]);


  const loadOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const [data, parties, invoices] = await Promise.all([
        fetchAllOrders(),
        fetchAllParties().catch(() => []),
        fetchInvoices({ status: "ISSUED" }).catch(() => []),
      ]);
      setOrders(data.filter((order) => normStatus(order.status) !== "draft"));

      const map: Record<string, PartyInfo> = {};
      parties.forEach((u) => {
        map[u.id] = {
          name: u.name || u.shopName,
          shopName: u.shopName || u.company,
          city: u.city,
        };
      });
      setPartyMap(map);

      const invMap: Record<string, string> = {};
      for (const inv of invoices) {
        if (inv.orderId && inv.status === "ISSUED") {
          invMap[inv.orderId] = inv.invoiceNumber || "ISSUED";
        }
      }
      setIssuedByOrder(invMap);
    } catch (err) {
      console.error(err);
      setError("Could not load orders. Check Firestore rules.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const resolveParty = (order: Order) => {
    const fromMap = order.partyId ? partyMap[order.partyId] : undefined;
    return {
      name: order.partyName || fromMap?.name || order.partyEmail || "Party",
      shop: (order as any).shopName || (order as any).partyShopName || fromMap?.shopName || "",
      city: (order as any).city || (order as any).partyCity || fromMap?.city || "",
    };
  };

  // Counts from full dataset (ignore search) – case-insensitive
  const counts = useMemo(() => {
    const c: Record<string, number> = {
      all: orders.length,
      submitted: 0,
      approved: 0,
      rejected: 0,
      assigned: 0,
      production: 0,
      ready_to_dispatch: 0,
    };
    for (const o of orders) {
      const st = normStatus(o.status);
      const ps = normStatus(o.productionStatus);
      if (st === "submitted") c.submitted++;
      if (st === "approved") c.approved++;
      if (st === "rejected") c.rejected++;
      if (isAssignedStatus(o)) c.assigned++;
      if (isProductionStatus(o)) c.production++;
      if (ps === "ready_to_dispatch" || st === "ready_to_dispatch") {
        c.ready_to_dispatch++;
      }
    }
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    return orders.filter((order) => {
      const st = normStatus(order.status);
      const ps = normStatus(order.productionStatus);

      if (statusFilter === "submitted" && st !== "submitted") return false;
      if (statusFilter === "approved" && st !== "approved") return false;
      if (statusFilter === "rejected" && st !== "rejected") return false;
      if (statusFilter === "assigned" && !isAssignedStatus(order)) return false;
      if (statusFilter === "production" && !isProductionStatus(order)) return false;
      if (
        statusFilter === "ready_to_dispatch" &&
        ps !== "ready_to_dispatch" &&
        st !== "ready_to_dispatch"
      ) {
        return false;
      }

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const p = resolveParty(order);
      const on = displayOrderNumber(order).toLowerCase();

      return (
        on.includes(q) ||
        order.id.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.shop.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        (order.partyEmail || "").toLowerCase().includes(q)
      );
    });
  }, [orders, statusFilter, searchQuery, partyMap]);

  const sortedOrders = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortOrder === "oldest") {
        return listTime(a.createdAt) - listTime(b.createdAt);
      }
      if (sortOrder === "qty_desc") {
        return (b.totalQuantity || 0) - (a.totalQuantity || 0);
      }
      if (sortOrder === "qty_asc") {
        return (a.totalQuantity || 0) - (b.totalQuantity || 0);
      }
      return listTime(b.createdAt) - listTime(a.createdAt);
    });
  }, [filtered, sortOrder]);

  const filters: { key: FilterStatus; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "submitted", label: "Pending", count: counts.submitted },
    { key: "approved", label: "Approved", count: counts.approved },
    { key: "assigned", label: "Assigned", count: counts.assigned },
    { key: "production", label: "Production", count: counts.production },
    { key: "ready_to_dispatch", label: "Ready", count: counts.ready_to_dispatch },
    { key: "rejected", label: "Rejected", count: counts.rejected },
  ];

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#330066]" />
            Orders
          </h1>
          <p className="text-sm text-slate-500 mt-0.5"><T>View and manage party orders</T></p>
        </div>
        <button
          onClick={loadOrders}
          disabled={loading}
          className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <SearchFilterBar
        search={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Search order #, party, shop, city..."
        values={{ status: statusFilter }}
        onApply={(v) => setFilterStatus((v.status || "all") as FilterStatus)}
        filterGroups={[{ key: "status", label: "Status", options: [
          { value: "all", label: "All" }, { value: "submitted", label: "Pending" }, { value: "approved", label: "Approved" },
          { value: "assigned", label: "Assigned" },
          { value: "production", label: "Production" }, { value: "ready_to_dispatch", label: "Ready to Dispatch" },
          { value: "rejected", label: "Rejected" }
        ]}]}
        sortOptions={[
          { value: "newest", label: "Newest Orders" }, { value: "oldest", label: "Oldest Orders" },
          { value: "qty_desc", label: "Highest Quantity" }, { value: "qty_asc", label: "Lowest Quantity" }
        ]}
        sortValue={sortOrder}
        onSortChange={(value) => setSortOrder(value as "newest" | "oldest" | "qty_desc" | "qty_asc")}
      />

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilterStatus(f.key)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
              statusFilter === f.key
                ? "bg-[#330066] text-white"
                : "bg-white border border-slate-200 text-slate-600"
            }`}
          >
            {f.label}{" "}
            <span className={statusFilter === f.key ? "opacity-80 font-normal" : "text-slate-400 font-normal"}>
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
      ) : sortedOrders.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500 text-sm">
          No orders found.
        </div>
      ) : (
        <div className="space-y-3">
          {sortedOrders.map((order) => {
            const isRetail = String(order.orderType || "").toUpperCase() === "RETAIL";
            const { name, shop, city } = resolveParty(order);
            const partyLine = [name, shop, city].filter(Boolean).join(" • ") || "—";
            const customerName =
              order.customerName || order.customer?.name || "";
            const customerCity =
              order.customerCity || order.customer?.city || "";

            const subtitle = isRetail
              ? [customerName || "—", customerCity].filter(Boolean).join(" • ")
              : partyLine;

            const metaPrefix = isRetail
              ? (order.salespersonName || order.salespersonId || "Sales").trim()
              : undefined;

            // Financial path pill: Invoice | Other Order | None
            const finType = String(order.financialDocumentType || "").toUpperCase();
            const issuedNo = issuedByOrder[order.id];
            const isTax =
              finType === "TAX_INVOICE" || Boolean(issuedNo);
            const isOther = finType === "OTHER_ORDER";

            let financialBadge: ReactNode;
            if (isOther) {
              financialBadge = (
                <span className="inline-flex items-center text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-teal-50 text-teal-800">
                  <T>Other Order</T>
                </span>
              );
            } else if (isTax) {
              financialBadge = (
                <span className="inline-flex items-center text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800">
                  <T>Invoice</T>
                </span>
              );
            } else {
              financialBadge = (
                <span className="inline-flex items-center text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  <T>None</T>
                </span>
              );
            }

            return (
              <OrderCard
                key={order.id}
                order={order}
                href={`/admin/orders/${order.id}`}
                showCity={false}
                showProduct={isRetail}
                showAmount={true}
                shortDate={true}
                subtitle={subtitle}
                metaPrefix={metaPrefix}
                extraBadge={financialBadge}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}