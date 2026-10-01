"use client";

import { T } from "@/i18n";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { fetchOrderById, partyStatusLabel, type Order } from "@/modules/orders";
import { formatAmountINR } from "@/lib/mattress";
import { formatOrderItemSize } from "@/modules/orders";

export default function SalespersonRetailOrderDetailPage() {
  const params = useParams();
  const orderId = params?.orderId as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const data = await fetchOrderById(orderId);
      if (!data) {
        setError("Not found");
        return;
      }
      setOrder(data);
    } catch (e) {
      console.error(e);
      setError("Could not load order");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-[#330066] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="text-center py-12 space-y-2">
        <p className="text-slate-600">{error || "Not found"}</p>
        <Link href="/salesperson/orders" className="text-sm font-semibold text-[#330066]">
          <T>Back</T>
        </Link>
      </div>
    );
  }

  const cust = order.customer;

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-8">
      <div className="flex items-center gap-2">
        <Link href="/salesperson/orders" className="p-2 -ml-2 rounded-xl hover:bg-slate-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-slate-900 truncate">
            {order.orderNumber || order.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-xs text-slate-500">
            <T>Retail Sale</T> · {partyStatusLabel(order.status)}
          </p>
        </div>
      </div>

      <section className="bg-white rounded-2xl border border-slate-100 p-4 space-y-1">
        <p className="text-sm font-bold text-slate-800"><T>Customer</T></p>
        <p className="font-semibold text-slate-900">{cust?.name || order.customerName}</p>
        <p className="text-sm text-slate-600">{cust?.contact || order.customerContact}</p>
        <p className="text-sm text-slate-600">{cust?.address}</p>
        <p className="text-sm text-slate-600">{cust?.city || order.customerCity}</p>
        {order.deliveryDate && (
          <p className="text-xs text-slate-500 mt-1">
            <T>Delivery Date</T>: {order.deliveryDate}
          </p>
        )}
        {order.salespersonName && (
          <p className="text-xs text-slate-500">
            <T>Salesperson</T>: {order.salespersonName}
          </p>
        )}
      </section>

      <section className="space-y-2">
        <p className="text-sm font-bold text-slate-800"><T>Items</T></p>
        {(order.items || []).map((it, i) => (
          <div key={it.id || i} className="bg-white rounded-2xl border border-slate-100 p-3 space-y-1">
            <p className="font-semibold text-slate-900">
              {it.type} · {formatOrderItemSize(it)} · {it.thickness}&quot;
            </p>
            <p className="text-xs text-slate-500">
              <T>Qty</T> {it.quantity}
              {it.sqFt != null ? ` · ${it.sqFt} sq.ft` : ""}
            </p>
            <div className="grid grid-cols-2 gap-1 text-xs mt-1">
              <span className="text-slate-500"><T>Party Rate</T></span>
              <span className="text-right font-medium">{formatAmountINR(it.partyRate)}</span>
              <span className="text-slate-500"><T>Retail Rate</T></span>
              <span className="text-right font-medium">{formatAmountINR(it.retailRate)}</span>
              <span className="text-slate-500"><T>Default Retail Amount</T></span>
              <span className="text-right font-medium">{formatAmountINR(it.defaultRetailAmount)}</span>
              <span className="text-slate-500"><T>Sale Rate</T></span>
              <span className="text-right font-semibold text-[#330066]">{formatAmountINR(it.actualSaleRate)}</span>
              <span className="text-slate-500"><T>Sale Amount</T></span>
              <span className="text-right font-bold text-[#330066]">{formatAmountINR(it.actualSaleAmount)}</span>
            </div>
          </div>
        ))}
      </section>

      <section className="bg-white rounded-2xl border border-slate-100 p-4">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500"><T>Total Quantity</T></span>
          <span className="font-semibold">{order.totalQuantity}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span className="font-bold"><T>Total Amount</T></span>
          <span className="font-bold text-[#330066]">{formatAmountINR(order.totalAmount)}</span>
        </div>
      </section>

      {String(order.status).toLowerCase() === "draft" && (
        <div className="flex gap-2">
          <Link
            href={`/salesperson/orders/new?orderId=${order.id}`}
            className="flex-1 text-center py-3 rounded-2xl bg-[#330066] text-white font-bold text-sm"
          >
            <T>Edit Draft</T>
          </Link>
        </div>
      )}
    </div>
  );
}
