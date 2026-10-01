"use client";

import { T } from "@/i18n";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, Phone, MapPin, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  fetchCustomersForSalesperson,
  CUSTOMER_GST_TYPE_LABELS,
  type RetailCustomerMaster,
} from "@/modules/customers";
import { initials } from "@/modules/retailFollowUps";
import { telHref, whatsappHref } from "@/lib/phoneLinks";

function avatarColor(name: string): string {
  const colors = [
    "bg-violet-500",
    "bg-rose-400",
    "bg-amber-500",
    "bg-sky-500",
    "bg-emerald-500",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % colors.length;
  return colors[h];
}

function formatAddress(c: RetailCustomerMaster): string {
  const a = c.billingAddress;
  if (!a) return "";
  return [a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(", ");
}

export default function SalespersonCustomersPage() {
  const { user } = useAuth();
  const [master, setMaster] = useState<RetailCustomerMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<RetailCustomerMaster | null>(null);

  const load = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    setError("");
    try {
      setMaster(await fetchCustomersForSalesperson(user.uid));
    } catch (e) {
      console.error(e);
      setError("Could not load customers.");
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    load();
  }, [load]);

  const customers = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = [...master];
    if (term) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.mobile.includes(term) ||
          (c.billingAddress?.city || "").toLowerCase().includes(term) ||
          (c.gstin || "").toLowerCase().includes(term)
      );
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [master, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            <T>Customers</T>
          </h1>
          <p className="text-sm text-slate-500">
            <T>Customers from your retail orders</T>
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="p-2 rounded-full border border-slate-200 text-slate-500"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2.5 text-sm"
          placeholder="Search name, mobile, city…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {loading && customers.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">
          <T>Loading…</T>
        </p>
      ) : customers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
          <p className="text-sm text-slate-500">
            <T>No customers yet. They appear after you create a retail order.</T>
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {customers.map((c) => {
            const call = telHref(c.mobile);
            const wa = whatsappHref(c.mobile);
            const city = c.billingAddress?.city;
            return (
              <div
                key={c.id}
                className="flex items-start gap-3 bg-white rounded-2xl border border-slate-100 p-3 shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setViewing(c)}
                  className="flex items-start gap-3 min-w-0 flex-1 text-left"
                >
                  <div
                    className={`w-11 h-11 rounded-full ${avatarColor(
                      c.name
                    )} text-white flex items-center justify-center text-sm font-bold shrink-0`}
                  >
                    {initials(c.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">
                      {c.name}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" />
                      {c.mobile || "—"}
                    </p>
                    {city && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {city}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-500 mt-1">
                      GST: {CUSTOMER_GST_TYPE_LABELS[c.gstRegistrationType]}
                      {c.gstin ? ` · ${c.gstin}` : ""}
                    </p>
                  </div>
                </button>
                <div className="flex flex-col gap-1 shrink-0">
                  {call && (
                    <a
                      href={call}
                      className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 text-xs font-medium"
                    >
                      Call
                    </a>
                  )}
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-50 text-xs font-medium"
                    >
                      WA
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-xl">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">{viewing.name}</h2>
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="p-1.5 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <Row label="Mobile" value={viewing.mobile} />
              {viewing.alternateMobile && (
                <Row label="Alternate mobile" value={viewing.alternateMobile} />
              )}
              {viewing.email && <Row label="Email" value={viewing.email} />}
              <Row
                label="GST type"
                value={CUSTOMER_GST_TYPE_LABELS[viewing.gstRegistrationType]}
              />
              {viewing.gstin && <Row label="GSTIN" value={viewing.gstin} />}
              {viewing.pan && <Row label="PAN" value={viewing.pan} />}
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">
                  <T>Billing address</T>
                </p>
                <p className="text-slate-800">{formatAddress(viewing) || "—"}</p>
              </div>
              {viewing.shippingSameAsBilling === false &&
                viewing.shippingAddress && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">
                      <T>Shipping address</T>
                    </p>
                    <p className="text-slate-800">
                      {[
                        viewing.shippingAddress.line1,
                        viewing.shippingAddress.line2,
                        viewing.shippingAddress.city,
                        viewing.shippingAddress.state,
                        viewing.shippingAddress.pincode,
                      ]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </p>
                  </div>
                )}
              {viewing.notes && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">
                    <T>Notes</T>
                  </p>
                  <p className="text-slate-700">{viewing.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-50 pb-2">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <span className="text-slate-900 text-right font-medium">{value || "—"}</span>
    </div>
  );
}
