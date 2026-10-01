"use client";
import { T } from "@/i18n";
import React, { useCallback, useEffect, useState } from "react";
import {
  fetchRecentPurchaseAudit,
  auditActionLabel,
  formatRupee,
  type PurchaseAuditEntry,
} from "@/modules/purchase";
import { RefreshCw, Loader2, Shield } from "lucide-react";

export default function PurchaseAuditPage() {
  const [rows, setRows] = useState<PurchaseAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await fetchRecentPurchaseAudit(150));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load audit.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function formatWhen(v: unknown): string {
    if (!v) return "—";
    try {
      const any = v as { toDate?: () => Date; seconds?: number };
      if (typeof any.toDate === "function") {
        return any.toDate().toLocaleString("en-IN");
      }
      if (typeof any.seconds === "number") {
        return new Date(any.seconds * 1000).toLocaleString("en-IN");
      }
    } catch {
      /* ignore */
    }
    return "—";
  }

  return (
    <div className="pb-24 px-3 pt-3 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-semibold text-gray-900">
          <T>Purchase Audit</T>
        </h1>
        <button
          type="button"
          onClick={load}
          className="p-2 rounded-lg bg-gray-100 text-gray-600"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        Immutable log of PO, receive, return, and supplier payment actions.
      </p>

      {error && (
        <div className="mb-3 p-3 rounded-xl bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Shield className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">
            <T>No audit entries yet</T>
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="p-3 rounded-xl bg-white border border-gray-100 shadow-sm"
            >
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-gray-900">
                    {auditActionLabel(r.action)}
                    {r.entityNumber ? ` · ${r.entityNumber}` : ""}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {r.supplierName || r.entityType}
                    {r.summary ? ` · ${r.summary}` : ""}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {formatWhen(r.createdAt)}
                    {r.actorName ? ` · ${r.actorName}` : ""}
                  </p>
                </div>
                {r.amount != null && (
                  <p className="text-sm font-medium text-gray-800 shrink-0">
                    {formatRupee(r.amount)}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
