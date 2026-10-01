"use client";
import { T } from "@/i18n";

import { fetchAllOrders } from "@/modules/orders";
import { fetchAllEmployees } from "@/modules/employees";
import { fetchAllAnnouncements } from "@/modules/announcements";
import {
  fetchSuppliersWithBalances,
  formatRupee as formatSupplierRupee,
} from "@/modules/suppliers";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import type { Announcement } from "@/modules/announcements";
import type { Order } from "@/modules/orders";
import type { User } from "@/types/identity";
import {
  productionStatusLabel,
  PRODUCTION_STATUS_COLORS,
  formatShortDate,
  toMillisSafe,
  isAnnouncementLive,
  sortAnnouncementsForAdmin,
  displayOrderNumber,
} from "@/lib/utils";
import { resolveProdStatus } from "@/modules/production";
import {
  RefreshCw,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  Factory,
  Users,
  HardHat,
  Plus,
  ChevronRight,
  Megaphone,
  ShoppingBag,
  Truck,
  ListOrdered,
  UserCheck,
  Building2,
  Banknote,
} from "lucide-react";
import { SummaryStatusCards } from "@/components/shared/SummaryStatusCards";

function normStatus(v: unknown): string {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function isToday(value: any): boolean {
  const d =
    typeof value?.toDate === "function"
      ? value.toDate()
      : value
        ? new Date(value)
        : null;
  if (!d || Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [totalSupplierDue, setTotalSupplierDue] = useState(0);
  const [supplierCount, setSupplierCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [orderList, empRecords, anns, supplierRows] = await Promise.all([
        fetchAllOrders(),
        fetchAllEmployees().catch(() => []),
        fetchAllAnnouncements().catch(() => []),
        fetchSuppliersWithBalances().catch(() => []),
      ]);
      setOrders(orderList);
      setEmployees(
        empRecords.map(
          (e) => ({ ...e, uid: e.id, role: "employee" } as User)
        )
      );
      const sortedAnns = [...anns];
      sortedAnns.sort(sortAnnouncementsForAdmin);
      setAnnouncements(sortedAnns);
      const due = supplierRows.reduce(
        (sum, s) => sum + (Number(s.currentDue) || 0),
        0
      );
      setTotalSupplierDue(due);
      setSupplierCount(supplierRows.length);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Order stats (case-insensitive)
  const pendingApproval = orders.filter(
    (o) => normStatus(o.status) === "submitted"
  ).length;
  const approvedToday = orders
    .filter(
      (o) =>
        normStatus(o.status) === "approved" || Boolean(o.approvedAt)
    )
    .filter((o) => isToday(o.approvedAt)).length;
  const rejected = orders.filter(
    (o) => normStatus(o.status) === "rejected"
  ).length;
  const totalOrders = orders.length;

  // Production stats – use shared resolveProdStatus (case-insensitive)
  const queue = orders.filter((o) => resolveProdStatus(o) === "queue").length;
  const assigned = orders.filter(
    (o) => resolveProdStatus(o) === "assigned"
  ).length;
  const inProduction = orders.filter(
    (o) => resolveProdStatus(o) === "in_production"
  ).length;
  const readyToDispatch = orders.filter(
    (o) => resolveProdStatus(o) === "ready_to_dispatch"
  ).length;

  // Employees
  const activeEmps = employees.filter(
    (e) => String(e.status || "ACTIVE").toUpperCase() !== "INACTIVE"
  );
  const workingIds = new Set(
    orders
      .filter((o) =>
        ["assigned", "in_production"].includes(resolveProdStatus(o))
      )
      .map((o) => o.assignedEmployeeId)
      .filter(Boolean)
  );
  const working = activeEmps.filter((e) => workingIds.has(e.uid)).length;
  const available = Math.max(0, activeEmps.length - working);

  // Current production list (active)
  const currentProduction = orders
    .filter((o) => {
      const st = normStatus(o.status);
      if (st === "rejected" || st === "draft" || st === "submitted") return false;
      const ps = resolveProdStatus(o);
      return ["queue", "assigned", "in_production", "ready_to_dispatch"].includes(
        ps
      );
    })
    .sort(
      (a, b) =>
        toMillisSafe(b.updatedAt || b.approvedAt) -
        toMillisSafe(a.updatedAt || a.approvedAt)
    )
    .slice(0, 5);

  // Pending approval list
  const pendingList = orders
    .filter((o) => normStatus(o.status) === "submitted")
    .sort(
      (a, b) =>
        toMillisSafe(b.submittedAt || b.createdAt) -
        toMillisSafe(a.submittedAt || a.createdAt)
    )
    .slice(0, 8);

  const latestAnn = announcements.find((a) => isAnnouncementLive(a)) || announcements[0];

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const firstName = user?.name?.split(" ")[0] || "Admin";

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Here&apos;s what&apos;s happening in Synnera today.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* ACTION REQUIRED */}
      <section className="bg-white rounded-2xl border border-amber-200 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            Action Required
          </h2>
        </div>
        <div className="space-y-2">
          <Link
            href="/admin/orders?status=submitted"
            className="flex items-center justify-between p-3 rounded-xl bg-amber-50 hover:bg-amber-100 transition"
          >
            <span className="text-sm text-slate-800">
              <span className="font-bold text-amber-700">{pendingApproval}</span> Orders waiting for approval
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>
          <Link
            href="/admin/production?status=queue"
            className="flex items-center justify-between p-3 rounded-xl bg-violet-50 hover:bg-violet-100 transition"
          >
            <span className="text-sm text-slate-800">
              <span className="font-bold text-violet-700">{queue}</span> Orders waiting for assignment
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>
          <Link
            href="/admin/production?status=in_production"
            className="flex items-center justify-between p-3 rounded-xl bg-orange-50 hover:bg-orange-100 transition"
          >
            <span className="text-sm text-slate-800">
              <span className="font-bold text-orange-700">{inProduction}</span> Orders currently in production
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>
          <Link
            href="/admin/production?status=ready_to_dispatch"
            className="flex items-center justify-between p-3 rounded-xl bg-teal-50 hover:bg-teal-100 transition"
          >
            <span className="text-sm text-slate-800">
              <span className="font-bold text-teal-700">{readyToDispatch}</span> Orders ready to dispatch
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>
        </div>
      </section>

      {/* SUPPLIER DUE */}
      <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#330066]/10 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-[#330066]" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                <T>Total Supplier Due</T>
              </p>
              <p className="text-xl font-bold text-slate-900 tabular-nums mt-0.5">
                {loading ? "—" : formatSupplierRupee(totalSupplierDue)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {supplierCount} <T>suppliers</T>
              </p>
            </div>
          </div>
          <Link
            href="/admin/suppliers"
            className="text-xs font-medium text-[#330066] inline-flex items-center gap-0.5"
          >
            <T>View all</T>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            href="/admin/suppliers"
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#330066] text-white text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <T>+ Purchase</T>
          </Link>
          <Link
            href="/admin/suppliers"
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#330066]/30 text-[#330066] text-sm font-medium bg-[#330066]/5"
          >
            <Banknote className="w-4 h-4" />
            <T>Pay</T>
          </Link>
        </div>
      </section>

      {/* QUICK ACTIONS */}
      <section>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Link
            href="/admin/parties"
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:border-[#330066]/40 transition"
          >
            <Plus className="w-4 h-4 text-[#330066]" /> Add Party
          </Link>
          <Link
            href="/admin/employees"
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:border-[#330066]/40 transition"
          >
            <Plus className="w-4 h-4 text-[#330066]" /> Add Employee
          </Link>
          <Link
            href="/admin/orders"
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:border-[#330066]/40 transition"
          >
            <ShoppingBag className="w-4 h-4 text-[#330066]" /> View Orders
          </Link>
          <Link
            href="/admin/production"
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:border-[#330066]/40 transition"
          >
            <Factory className="w-4 h-4 text-[#330066]" /> Production
          </Link>
          <Link
            href="/admin/retail-followups/new"
            className="relative flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white border-2 border-[#330066]/30 text-sm font-medium text-slate-700 hover:border-[#330066] transition col-span-2 sm:col-span-4"
          >
            <Plus className="w-4 h-4 text-[#330066]" />
            <T>Retail Follow-up</T>
            <span className="absolute -top-1.5 right-3 px-1.5 py-0.5 rounded-md bg-[#330066] text-[9px] font-bold text-white uppercase tracking-wide">
              New
            </span>
          </Link>
        </div>
      </section>

      {/* ORDER MANAGEMENT */}
      <section>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
          Order Management
        </h2>
        <SummaryStatusCards
          items={[
            {
              key: "pending_approval",
              label: "Pending Approval",
              value: loading ? "—" : pendingApproval,
              icon: Clock,
              bg: "bg-amber-50",
              text: "text-amber-700",
              href: "/admin/orders?status=submitted",
            },
            {
              key: "approved_today",
              label: "Approved Today",
              value: loading ? "—" : approvedToday,
              icon: CheckCircle,
              bg: "bg-emerald-50",
              text: "text-emerald-700",
              href: "/admin/orders?status=approved",
            },
            {
              key: "rejected",
              label: "Rejected",
              value: loading ? "—" : rejected,
              icon: XCircle,
              bg: "bg-rose-50",
              text: "text-rose-700",
              href: "/admin/orders?status=rejected",
            },
            {
              key: "total_orders",
              label: "Total Orders",
              value: loading ? "—" : totalOrders,
              icon: Package,
              bg: "bg-slate-50",
              text: "text-slate-700",
              href: "/admin/orders",
            },
          ]}
        />
      </section>

      {/* PRODUCTION */}
      <section>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
          Production
        </h2>
        <SummaryStatusCards
          items={[
            {
              key: "queue",
              label: "Queue",
              value: loading ? "—" : queue,
              icon: ListOrdered,
              bg: "bg-violet-50",
              text: "text-violet-700",
              href: "/admin/production?status=queue",
            },
            {
              key: "assigned",
              label: "Assigned",
              value: loading ? "—" : assigned,
              icon: UserCheck,
              bg: "bg-indigo-50",
              text: "text-indigo-700",
              href: "/admin/production?status=assigned",
            },
            {
              key: "in_production",
              label: "In Production",
              value: loading ? "—" : inProduction,
              icon: Factory,
              bg: "bg-orange-50",
              text: "text-orange-700",
              href: "/admin/production?status=in_production",
            },
            {
              key: "ready_to_dispatch",
              label: "Ready to Dispatch",
              value: loading ? "—" : readyToDispatch,
              icon: Truck,
              bg: "bg-teal-50",
              text: "text-teal-700",
              href: "/admin/production?status=ready_to_dispatch",
            },
          ]}
        />
      </section>

      {/* EMPLOYEE OVERVIEW */}
      <section className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <HardHat className="w-3.5 h-3.5" /> Employee Overview
          </h2>
          <Link href="/admin/employees" className="text-xs font-medium text-[#330066]">
            Manage Employees →
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xl font-bold text-slate-900">{activeEmps.length}</p>
            <p className="text-[11px] text-slate-500"><T>Active</T></p>
          </div>
          <div>
            <p className="text-xl font-bold text-orange-600">{working}</p>
            <p className="text-[11px] text-slate-500"><T>Working</T></p>
          </div>
          <div>
            <p className="text-xl font-bold text-emerald-600">{available}</p>
            <p className="text-[11px] text-slate-500"><T>Available</T></p>
          </div>
        </div>
      </section>

      {/* CURRENT PRODUCTION */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            Current Production
          </h2>
          <Link href="/admin/production" className="text-xs font-medium text-[#330066]">
            View Production →
          </Link>
        </div>
        {currentProduction.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-500">
            No active production orders.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {currentProduction.map((o) => {
              const ps =
                o.productionStatus ||
                (o.status === "approved" ? "queue" : "queue");
              return (
                <Link
                  key={o.id}
                  href={`/admin/production/${o.id}`}
                  className="flex items-center justify-between gap-3 p-3 hover:bg-slate-50 transition"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {displayOrderNumber(o)}{" "}
                      <span className="font-normal text-slate-600">
                        {o.partyName || "Party"}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {o.physicalMattressCount || o.totalQuantity} mattresses
                      {o.assignedEmployeeName
                        ? ` · ${o.assignedEmployeeName}`
                        : " · Unassigned"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      PRODUCTION_STATUS_COLORS[ps as keyof typeof PRODUCTION_STATUS_COLORS] ||
                      "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {productionStatusLabel(ps)}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* PENDING APPROVAL */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            Pending Approval
          </h2>
          <Link href="/admin/orders" className="text-xs font-medium text-[#330066]">
            View Orders →
          </Link>
        </div>
        {pendingList.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-500">
            No orders waiting for approval.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {pendingList.map((o) => (
              <Link
                key={o.id}
                href={`/admin/orders/${o.id}`}
                className="flex items-center justify-between gap-3 p-3 hover:bg-slate-50 transition"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {displayOrderNumber(o)}{" "}
                    <span className="font-normal text-slate-600">
                      {o.partyName || o.partyEmail || "Party"}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {o.totalQuantity} items · {formatShortDate(o.submittedAt || o.createdAt)}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* LATEST ANNOUNCEMENT */}
      {latestAnn && (
        <section className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#330066]/10 text-[#330066] flex items-center justify-center shrink-0">
              <Megaphone className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase text-slate-400">
                Latest Announcement
              </p>
              <p className="text-sm font-semibold text-slate-900 truncate">
                {latestAnn.title}
              </p>
              <Link
                href="/admin/announcements"
                className="text-xs font-medium text-[#330066] mt-1 inline-block"
              >
                View Announcements →
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}