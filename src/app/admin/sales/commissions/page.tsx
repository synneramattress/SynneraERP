"use client";

import { T } from "@/i18n";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  fetchAllCommissions,
  fetchAllSalespersons,
  markCommissionPaid,
  markCommissionUnpaid,
  type SalesCommission,
  type SalespersonRecord,
} from "@/modules/sales";
import { formatAmountINR } from "@/lib/mattress";
import AdminSalesSubNav from "@/modules/sales/components/AdminSalesSubNav";

export default function AdminSalesCommissionsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<SalesCommission[]>([]);
  const [people, setPeople] = useState<SalespersonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [spFilter, setSpFilter] = useState("all");
  const [payFilter, setPayFilter] = useState<"all" | "PAID" | "UNPAID">("all");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([
        fetchAllCommissions(),
        fetchAllSalespersons(),
      ]);
      setRows(c);
      setPeople(p);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (spFilter !== "all" && r.salespersonId !== spFilter) return false;
      if (
        payFilter !== "all" &&
        String(r.paymentStatus).toUpperCase() !== payFilter
      )
        return false;
      return String(r.commissionStatus).toUpperCase() === "EARNED";
    });
  }, [rows, spFilter, payFilter]);

  const setPaid = async (id: string, paid: boolean) => {
    if (!user?.uid) return;
    setBusy(id);
    try {
      if (paid) await markCommissionPaid(id, user.uid);
      else await markCommissionUnpaid(id);
      await load();
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <AdminSalesSubNav />
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">
            <T>Commission Management</T>
          </h1>
          <p className="text-sm text-slate-500">
            <T>Retail commissions — mark paid / unpaid</T>
          </p>
        </div>
        <Link
          href="/admin/sales"
          className="text-sm font-semibold text-[#330066]"
        >
          <T>Salespeople</T>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
          value={spFilter}
          onChange={(e) => setSpFilter(e.target.value)}
        >
          <option value="all">All salespeople</option>
          {people.map((p) => (
            <option key={p.id} value={p.uid || p.id}>
              {p.name || p.salespersonId || p.id}
            </option>
          ))}
        </select>
        <select
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
          value={payFilter}
          onChange={(e) => setPayFilter(e.target.value as any)}
        >
          <option value="all">All payment</option>
          <option value="UNPAID">Unpaid</option>
          <option value="PAID">Paid</option>
        </select>
      </div>

      {loading ? (
        <p className="text-center text-slate-400 py-8">
          <T>Loading…</T>
        </p>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border p-8 text-center text-sm text-slate-500">
          <T>No earned commissions found.</T>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-2xl border border-slate-100 p-3"
            >
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold truncate">
                    {c.orderNumber || c.retailOrderId.slice(0, 10)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {c.salespersonName || c.salespersonId} ·{" "}
                    {c.customerName || "—"}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Sale {formatAmountINR(c.actualSalesAmount)} − Party{" "}
                    {formatAmountINR(c.partyRateAmount)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-[#330066]">
                    {formatAmountINR(c.commissionAmount)}
                  </p>
                  <p className="text-[10px] font-bold uppercase text-slate-500">
                    {String(c.paymentStatus)}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                {String(c.paymentStatus).toUpperCase() !== "PAID" ? (
                  <button
                    type="button"
                    disabled={busy === c.id}
                    onClick={() => setPaid(c.id, true)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold"
                  >
                    <T>Mark Paid</T>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy === c.id}
                    onClick={() => setPaid(c.id, false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700"
                  >
                    <T>Mark Unpaid</T>
                  </button>
                )}
                <Link
                  href={`/admin/orders/${c.retailOrderId}`}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-[#330066]"
                >
                  <T>View Order</T>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
