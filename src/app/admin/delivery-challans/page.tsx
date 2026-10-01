"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileText, RefreshCw, Search, Loader2, ChevronRight, Plus } from "lucide-react";
import { T } from "@/i18n";
import {
  listAllDeliveryChallans,
  DC_STATUS_LABELS,
  DC_SOURCE_LABELS,
  type DeliveryChallan,
  type DeliveryChallanStatus,
  type DeliveryChallanSource,
} from "@/modules/delivery-challan";

function formatDate(v: unknown): string {
  if (!v) return "—";
  try {
    const d =
      typeof (v as { toDate?: () => Date }).toDate === "function"
        ? (v as { toDate: () => Date }).toDate()
        : new Date(v as string);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function resolveSource(dc: DeliveryChallan): DeliveryChallanSource {
  if (dc.sourceType === "standalone" || dc.sourceType === "order") return dc.sourceType;
  return dc.orderId ? "order" : "standalone";
}

const STATUS_FILTERS: Array<"ALL" | DeliveryChallanStatus> = [
  "ALL",
  "generated",
  "dispatched",
  "pod_uploaded",
  "accepted",
  "objection_received",
  "cancelled",
];

type SourceFilter = "ALL" | DeliveryChallanSource;

export default function AdminDeliveryChallansPage() {
  const [rows, setRows] = useState<DeliveryChallan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("ALL");
  const [source, setSource] = useState<SourceFilter>("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await listAllDeliveryChallans(300);
      setRows(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load delivery challans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const src = resolveSource(r);
      if (source !== "ALL" && src !== source) return false;
      if (status !== "ALL" && r.status !== status) return false;
      if (!q) return true;
      const hay = [
        r.challanNumber,
        r.orderNumber,
        r.invoiceNumber,
        r.partyName,
        r.shipTo?.name,
        r.referenceNote,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search, status, source]);

  const statusCounts = useMemo(() => {
    const base = source === "ALL" ? rows : rows.filter((r) => resolveSource(r) === source);
    const c: Record<string, number> = { ALL: base.length };
    for (const r of base) {
      const s = String(r.status || "");
      c[s] = (c[s] || 0) + 1;
    }
    return c;
  }, [rows, source]);

  const sourceCounts = useMemo(() => {
    let order = 0;
    let standalone = 0;
    for (const r of rows) {
      if (resolveSource(r) === "order") order++;
      else standalone++;
    }
    return { ALL: rows.length, order, standalone };
  }, [rows]);

  return (
    <div className="w-full max-w-none sm:max-w-5xl space-y-4 px-0 pb-24">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-6 w-6 text-indigo-600 shrink-0" />
          <h1 className="text-lg font-bold text-slate-900 truncate">
            <T>Delivery Challans</T>
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => load()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white"
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <Link
            href="/admin/delivery-challans/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-bold text-white"
          >
            <Plus className="h-4 w-4" />
            <T>New</T>
          </Link>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search DC / Order / Party"
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(
          [
            ["ALL", "All"],
            ["order", "From order"],
            ["standalone", "Standalone"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSource(key)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
              source === key
                ? "bg-slate-800 text-white"
                : "bg-white border border-slate-200 text-slate-700"
            }`}
          >
            <T>{label}</T> ({sourceCounts[key] || 0})
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
              status === s
                ? "bg-indigo-600 text-white"
                : "bg-white border border-slate-200 text-slate-700"
            }`}
          >
            {s === "ALL" ? "All" : DC_STATUS_LABELS[s]}{" "}
            ({s === "ALL" ? statusCounts.ALL || 0 : statusCounts[s] || 0})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      ) : error ? (
        <p className="text-sm text-rose-600">{error}</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 space-y-3">
          <p className="text-sm text-slate-500">
            <T>No delivery challans found.</T>
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              href="/admin/delivery-challans/new?mode=order"
              className="inline-flex justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold"
            >
              <T>Create from order</T>
            </Link>
            <Link
              href="/admin/delivery-challans/new?mode=standalone"
              className="inline-flex justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white"
            >
              <T>Create standalone</T>
            </Link>
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((dc) => {
            const src = resolveSource(dc);
            return (
              <li key={dc.id}>
                <Link
                  href={`/admin/delivery-challans/${dc.id}`}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 text-sm">
                        {dc.challanNumber}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          src === "standalone"
                            ? "bg-amber-100 text-amber-900"
                            : "bg-sky-100 text-sky-900"
                        }`}
                      >
                        {DC_SOURCE_LABELS[src]}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {DC_STATUS_LABELS[dc.status] || dc.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 truncate mt-0.5">
                      {dc.partyName || dc.shipTo?.name || "—"}
                      {dc.orderNumber ? ` · ${dc.orderNumber}` : ""}
                      {` · ${formatDate(dc.createdAt)}`}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
