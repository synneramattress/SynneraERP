"use client";

import { T } from "@/i18n";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import {
  fetchAllMarketingMaterials,
  setMarketingStatus,
  type SalesMarketingMaterial,
} from "@/modules/salesMarketing";
import AdminSalesSubNav from "@/modules/sales/components/AdminSalesSubNav";

export default function AdminMarketingMaterialsPage() {
  const [rows, setRows] = useState<SalesMarketingMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchAllMarketingMaterials());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <AdminSalesSubNav />
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">
            <T>Marketing Materials</T>
          </h1>
          <p className="text-sm text-slate-500">
            <T>Create and publish content for sales team</T>
          </p>
        </div>
        <Link
          href="/admin/sales/marketing/new"
          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#330066] text-white text-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          <T>New</T>
        </Link>
      </div>
      {loading ? (
        <p className="text-center text-slate-400 py-8">
          <T>Loading…</T>
        </p>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border p-8 text-center text-sm text-slate-500">
          <T>No materials yet.</T>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((m) => (
            <div
              key={m.id}
              className="bg-white rounded-2xl border border-slate-100 p-3 flex justify-between gap-2"
            >
              <div className="min-w-0">
                <p className="font-semibold truncate">
                  {m.title || m.en?.title || m.id}
                </p>
                <p className="text-xs text-slate-500">
                  {m.category} · {m.status}
                </p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <Link
                  href={`/admin/sales/marketing/${m.id}`}
                  className="text-xs font-semibold text-[#330066] text-right"
                >
                  <T>Edit</T>
                </Link>
                {m.status !== "published" ? (
                  <button
                    type="button"
                    className="text-xs font-semibold text-emerald-700"
                    onClick={async () => {
                      await setMarketingStatus(m.id, "published");
                      load();
                    }}
                  >
                    <T>Publish</T>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="text-xs font-semibold text-slate-600"
                    onClick={async () => {
                      await setMarketingStatus(m.id, "unpublished");
                      load();
                    }}
                  >
                    <T>Unpublish</T>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
