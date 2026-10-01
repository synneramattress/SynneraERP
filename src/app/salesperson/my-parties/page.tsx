"use client";
import { T } from "@/i18n";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { fetchAssignedPartiesForSalesperson } from "@/modules/sales";
import { ChevronRight } from "lucide-react";

type PartyRow = {
  id: string;
  name?: string;
  shopName?: string;
  city?: string;
  contactNumber?: string;
  phone?: string;
  status?: string;
};

export default function MyPartiesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<PartyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      try {
        const list = await fetchAssignedPartiesForSalesperson(user.uid);
        setRows(list as PartyRow[]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.uid]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">
          <T>My Parties</T>
        </h1>
        <p className="text-sm text-slate-500">
          <T>Parties linked to you</T>
        </p>
      </div>
      {loading ? (
        <p className="text-center text-slate-400 text-sm py-8">
          <T>Loading…</T>
        </p>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-sm text-slate-500">
          <T>No parties assigned yet. Convert prospects to link parties.</T>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-slate-100 p-3 flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <p className="font-semibold truncate">
                  {p.shopName || p.name || p.id}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {[p.city, p.contactNumber || p.phone].filter(Boolean).join(" · ")}
                </p>
              </div>
              <Link
                href={`/salesperson/assisted-order?partyId=${encodeURIComponent(p.id)}`}
                className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#330066] text-white text-xs font-semibold"
              >
                <T>New Order</T>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
