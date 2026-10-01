"use client";
import { T } from "@/i18n";

import { fetchOrdersAssignedToEmployee } from "@/modules/production";
import { fetchAllParties } from "@/modules/parties";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import type { Order } from "@/modules/orders";
import type { ProductionStatus } from "@/modules/production";
import {
  productionStatusLabel,
  toDateSafe,
} from "@/lib/utils";
import { OrderCard } from "@/components/shared/OrderCard";
import {
  CheckCircle2,
  Clock,
  Factory,
  Package,
  Truck,
} from "lucide-react";
import { SummaryStatusCards } from "@/components/shared/SummaryStatusCards";

function isToday(value: any): boolean {
  const d = toDateSafe(value);
  if (!d) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function EmployeeDashboardPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [partyMap, setPartyMap] = useState<
    Record<string, { shopName?: string; city?: string }>
  >({});
  const [loading, setLoading] = useState(true);

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

        const rank: Record<string, number> = {
          in_production: 0,
          assigned: 1,
          ready_to_dispatch: 2,
          queue: 3,
        };
        const pRank: Record<string, number> = { urgent: 0, high: 1, normal: 2 };
        list.sort((a, b) => {
          const ra = rank[a.productionStatus || ""] ?? 9;
          const rb = rank[b.productionStatus || ""] ?? 9;
          if (ra !== rb) return ra - rb;
          const pa = pRank[a.productionPriority || "normal"] ?? 2;
          const pb = pRank[b.productionPriority || "normal"] ?? 2;
          return pa - pb;
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

  const assigned = orders.filter((o) => o.productionStatus === "assigned").length;
  const inProd = orders.filter((o) => o.productionStatus === "in_production").length;
  const readyToday = orders.filter(
    (o) => o.productionStatus === "ready_to_dispatch" && isToday(o.readyToDispatchAt)
  ).length;
  const completed = orders.filter((o) => o.productionStatus === "ready_to_dispatch").length;

  // Active work: assigned + in_production first (exclude completed from main list focus)
  const activeOrders = orders.filter(
    (o) =>
      o.productionStatus === "assigned" ||
      o.productionStatus === "in_production" ||
      o.productionStatus === "ready_to_dispatch"
  );

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const firstName = user?.name?.split(" ")[0] || "Employee";

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          {greeting}, {firstName} 👋
        </h1>
        {/* eslint-disable-next-line react/no-unescaped-entities */}
        <p className="text-sm text-slate-500 mt-0.5"><T>Here's your production work</T></p>
      </div>

      {/* Summary cards */}
      <SummaryStatusCards
        items={[
          {
            key: "assigned",
            label: "Assigned",
            value: assigned,
            icon: Clock,
            bg: "bg-indigo-50",
            text: "text-indigo-700",
            href: "/employee/production?status=assigned",
          },
          {
            key: "in_production",
            label: "In Production",
            value: inProd,
            icon: Factory,
            bg: "bg-orange-50",
            text: "text-orange-700",
            href: "/employee/production?status=in_production",
          },
          {
            key: "ready_today",
            label: "Ready Today",
            value: readyToday,
            icon: Truck,
            bg: "bg-teal-50",
            text: "text-teal-700",
            href: "/employee/production?status=ready_to_dispatch",
          },
          {
            key: "completed",
            label: "Completed",
            value: completed,
            icon: CheckCircle2,
            bg: "bg-slate-50",
            text: "text-slate-700",
            href: "/employee/production?status=ready_to_dispatch",
          },
        ]}
      />

      {/* My Production */}
      <div>
        <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2 uppercase tracking-wide">
          <Factory className="w-4 h-4 text-[#330066]" />
          My Production
        </h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#330066] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeOrders.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm"><T>No production orders assigned yet.</T></p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {activeOrders.map((order) => {
              const status = (order.productionStatus || "assigned") as ProductionStatus;
              const shop =
                (order as any).partyShopName ||
                partyMap[order.partyId]?.shopName ||
                "";
              const city =
                (order as any).partyCity || partyMap[order.partyId]?.city || "";
              const partyName = order.partyName || order.partyEmail || "Party";
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
    </div>
  );
}
