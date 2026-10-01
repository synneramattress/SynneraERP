"use client";
import { T } from "@/i18n";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import type { Announcement } from "@/modules/announcements";
import { toMillisSafe } from "@/lib/utils";
import { fetchLiveAnnouncements } from "@/modules/announcements";
import {
  isReadyToDispatch,
  usePartyOrders,
} from "@/modules/orders";
import {
  Clock,
  Factory,
  Megaphone,
  Package,
  Plus,
  Truck,
} from "lucide-react";
import { SummaryStatusCards } from "@/components/shared/SummaryStatusCards";
import { PartyOrderCard } from "@/components/party/PartyOrderCard";
import {
  listDeliveryChallansForParty,
  type DeliveryChallan,
} from "@/modules/delivery-challan";
import { UploadSignedChallan } from "@/modules/delivery-challan/components/UploadSignedChallan";

function norm(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export default function PartyDashboardPage() {
  const { user } = useAuth();
  const { orders, loading } = usePartyOrders(user?.uid);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [pendingDcs, setPendingDcs] = useState<DeliveryChallan[]>([]);

  useEffect(() => {
    fetchLiveAnnouncements()
      .then(setAnnouncements)
      .catch(() => setAnnouncements([]));
  }, []);

  useEffect(() => {
    const partyId = user?.uid;
    if (!partyId) return;
    listDeliveryChallansForParty(partyId)
      .then((list) => {
        const need = list.filter(
          (d) =>
            d.status === "generated" ||
            d.status === "dispatched" ||
            (d.status === "pod_uploaded" && d.pod?.rejected)
        );
        setPendingDcs(need);
      })
      .catch(() => setPendingDcs([]));
  }, [user?.uid]);

  const counts = useMemo(() => {
    let pending = 0;
    let production = 0;
    let ready = 0;
    for (const o of orders) {
      const st = norm(o.status);
      const ps = norm(o.productionStatus || "");
      if (st === "submitted") pending++;
      else if (
        st === "approved" ||
        st === "assigned" ||
        st === "in_production" ||
        ps === "in_production" ||
        ps === "assigned" ||
        ps === "queue"
      ) {
        production++;
      } else if (isReadyToDispatch(o) || st === "ready_to_dispatch" || ps === "ready_to_dispatch") {
        ready++;
      }
    }
    return { pending, production, ready, total: orders.length };
  }, [orders]);

  const recent = useMemo(() => {
    return [...orders]
      .sort(
        (a, b) =>
          toMillisSafe(b.updatedAt || b.createdAt) -
          toMillisSafe(a.updatedAt || a.createdAt)
      )
      .slice(0, 4);
  }, [orders]);

  const topAnnouncement = announcements[0];
  const shop =
    (user as any)?.shopName || (user as any)?.company || user?.name || "";
  const city = (user as any)?.city || "";

  const statusCards = [
    {
      key: "pending",
      label: "Pending Approval",
      value: loading ? "—" : counts.pending,
      href: "/party/orders?status=submitted",
      icon: Clock,
      bg: "bg-amber-50",
      text: "text-amber-700",
    },
    {
      key: "production",
      label: "In Production",
      value: loading ? "—" : counts.production,
      href: "/party/orders?status=production",
      icon: Factory,
      bg: "bg-orange-50",
      text: "text-orange-700",
    },
    {
      key: "ready",
      label: "Ready to Dispatch",
      value: loading ? "—" : counts.ready,
      href: "/party/ready-to-dispatch",
      icon: Truck,
      bg: "bg-teal-50",
      text: "text-teal-700",
    },
    {
      key: "all",
      label: "All Orders",
      value: loading ? "—" : counts.total,
      href: "/party/orders",
      icon: Package,
      bg: "bg-[#330066]/5",
      text: "text-[#330066]",
    },
  ];

  return (
    <div className="space-y-6">
      {/* A1 Welcome */}
      <div>
        <p className="text-sm text-slate-500">
          <T>Welcome</T>
        </p>
        <h1 className="text-xl font-bold text-slate-900 truncate leading-tight">
          {shop || "Party"}
        </h1>
        {city ? (
          <p className="text-sm text-slate-500 mt-0.5 truncate">{city}</p>
        ) : null}
      </div>

      {/* A2 Primary CTA */}
      <Link
        href="/party/orders/new"
        className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-[#330066] text-white text-lg font-bold shadow-md active:scale-[0.99] transition"
      >
        <Plus className="w-6 h-6" strokeWidth={2.5} />
        <T>New Order</T>
      </Link>

      {/* Pending signed DC uploads */}
      {pendingDcs.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-800">
            <T>Upload Signed Challan</T>
          </h2>
          {pendingDcs.map((dc) => (
            <UploadSignedChallan
              key={dc.id}
              dc={dc}
              onUploaded={() =>
                setPendingDcs((prev) => prev.filter((x) => x.id !== dc.id))
              }
            />
          ))}
        </section>
      ) : null}

      {/* A3 Status cards */}
      <SummaryStatusCards items={statusCards} />

      {/* A4 Recent orders */}
      <section>
        <div className="flex items-center justify-between mb-3 gap-2">
          <h2 className="text-sm font-bold text-slate-800">
            <T>Recent Orders</T>
          </h2>
          <Link
            href="/party/orders"
            className="text-sm font-semibold text-[#330066] shrink-0"
          >
            <T>View All Orders</T>
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-[#330066] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recent.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <Package className="w-9 h-9 mx-auto mb-2 text-slate-300" />
            <p className="text-sm text-slate-600">
              <T>No orders yet. Tap New Order to start.</T>
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recent.map((o) => (
              <PartyOrderCard key={o.id} order={o} />
            ))}
          </div>
        )}
      </section>

      {/* A5 Announcement — only if present */}
      {topAnnouncement ? (
        <section>
          <div className="flex items-center justify-between mb-3 gap-2">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Megaphone className="w-4 h-4" />
              <T>Announcements</T>
            </h2>
            <Link
              href="/party/announcements"
              className="text-sm font-semibold text-[#330066] shrink-0"
            >
              <T>See All</T>
            </Link>
          </div>
          <Link
            href={`/party/announcements/${topAnnouncement.id}`}
            className="block bg-white rounded-2xl border border-slate-200 p-4"
          >
            <p className="font-semibold text-slate-900 line-clamp-1">
              {topAnnouncement.title}
            </p>
            <p className="text-sm text-slate-500 mt-1 line-clamp-2">
              {topAnnouncement.content}
            </p>
          </Link>
        </section>
      ) : null}
    </div>
  );
}
