"use client";

import { T } from "@/i18n";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { fetchRetailOrdersForSalesperson } from "@/modules/sales";
import type { Order } from "@/modules/orders";
import { OrderCard } from "@/components/shared/OrderCard";

export default function SalespersonOrdersPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    setError("");
    try {
      setRows(await fetchRetailOrdersForSalesperson(user.uid));
    } catch (e) {
      console.error(e);
      setError("Could not load retail sales.");
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <Link
        href="/salesperson/orders/new"
        className="fixed z-40 right-4 bottom-24 w-14 h-14 rounded-full bg-[#330066] text-white shadow-lg flex items-center justify-center active:scale-95 transition"
        aria-label="New Order"
        title="New Order"
      >
        <Plus className="w-6 h-6" />
      </Link>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            <T>Orders</T>
          </h1>
          <p className="text-sm text-slate-500">
            <T>Your retail orders</T>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            className="p-2 rounded-full border border-slate-200 text-slate-500"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          
        </div>
      </div>

      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {loading && !rows.length ? (
        <p className="text-sm text-slate-400 text-center py-8">
          <T>Loading…</T>
        </p>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-sm text-slate-500">
          <T>No retail sales yet.</T>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((o) => {
            const isDraft = String(o.status).toLowerCase() === "draft";
            return (
              <OrderCard
                key={o.id}
                order={o}
                href={
                  isDraft
                    ? `/salesperson/orders/new?orderId=${o.id}`
                    : `/salesperson/orders/${o.id}`
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
