"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import type { Order } from "@/modules/orders";
import { displayOrderNumber, toMillisSafe } from "@/lib/utils";
import { fetchOrdersByParty, isReadyToDispatch } from "@/modules/orders";
import { ArrowLeft, ChevronRight, PackageCheck } from "lucide-react";

export default function PartyReadyListPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      try {
        const rows = (await fetchOrdersByParty(user.uid))
          .filter((o) => isReadyToDispatch(o));
        rows.sort(
          (a, b) =>
            toMillisSafe(b.readyToDispatchAt || b.updatedAt) -
            toMillisSafe(a.readyToDispatchAt || a.updatedAt)
        );
        setOrders(rows);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.uid]);

  const fmt = (v: any) => {
    const ms = toMillisSafe(v);
    if (!ms) return "—";
    return new Date(ms).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4 max-w-lg">
      <Link href="/party/dashboard" className="inline-flex items-center gap-1 text-sm text-[#330066]">
        <ArrowLeft className="w-4 h-4" /> Home
      </Link>
      <div>
        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <PackageCheck className="w-5 h-5 text-[#330066]" />
          Ready to Dispatch
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Verify completed mattresses for your orders
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#330066] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
          No orders ready to dispatch.
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/party/orders/${o.id}`}
              className="block bg-white rounded-xl border border-slate-200 px-3.5 py-3 hover:border-[#330066]/30"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {displayOrderNumber(o)}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {fmt(o.readyToDispatchAt || o.updatedAt)} · {o.totalQuantity}{" "}
                    mattress{o.totalQuantity === 1 ? "" : "es"}
                  </p>
                  <p className="text-xs text-teal-700 mt-1 font-medium">
                    Ready to Dispatch
                    {(o as any).partyVerifiedAt ? " · Verified" : ""}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 mt-1" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
