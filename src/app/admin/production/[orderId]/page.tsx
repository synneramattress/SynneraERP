"use client";
import { T } from "@/i18n";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  fetchOrderById,
  getOrderItemKindLabel,
  getOrderItemKindBadgeClass,
} from "@/modules/orders";
import { fetchProductionMattresses, updateProductionOrder, assignOrderToEmployee, saveProductionMattress } from "@/modules/production";
import { fetchAssignableEmployees } from "@/modules/employees";
import type { Order } from "@/modules/orders";
import type { ProductionMattress, ProductionPriority, ProductionStatus } from "@/modules/production";
import type { User } from "@/types/identity";
import {
  PRODUCTION_STATUS_COLORS,
  PRODUCTION_PRIORITY_COLORS,
  productionStatusLabel,
  PHOTO_TYPE_LABELS,
  REQUIRED_PHOTO_TYPES,
  getItemSizeLabel,
  formatDateTime,
  formatShortDate,
  displayOrderNumber,
} from "@/lib/utils";
import {
  ArrowLeft,
  Loader2,
  UserCheck,
  Camera,
  CheckCircle2,
} from "lucide-react";

export default function AdminProductionOrderPage() {
  const params = useParams();
  const orderId = params?.orderId as string;
  const router = useRouter();
  const { user } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [mattresses, setMattresses] = useState<ProductionMattress[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState("");
  const [priority, setPriority] = useState<ProductionPriority>("normal");
  const [employeeLoadError, setEmployeeLoadError] = useState("");
  const [manualEmpUid, setManualEmpUid] = useState("");
  const [manualEmpName, setManualEmpName] = useState("");

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const data = await fetchOrderById(orderId);
      if (!data) {
        setOrder(null);
        return;
      }
      if (!data.productionStatus && data.status === "approved") data.productionStatus = "queue";
      setOrder(data);
      setPriority((data.productionPriority as ProductionPriority) || "normal");
      setSelectedEmp(data.assignedEmployeeId || "");

      const matts = await fetchProductionMattresses(orderId);
      setMattresses(matts);

      const empList = await fetchAssignableEmployees() as unknown as User[];
      setEmployees(empList);
      setEmployeeLoadError(empList.length ? "" : "No employees found");

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSetPriority = async () => {
    if (!order) return;
    setSaving(true);
    try {
      await updateProductionOrder(orderId, { productionPriority: priority });
      setOrder((prev) => (prev ? { ...prev, productionPriority: priority } : prev));
    } catch (err) {
      console.error(err);
      alert("Failed to update priority.");
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async () => {
    if (!order || !user) return;
    const emp = employees.find((e) => e.uid === selectedEmp);
    const assignUid = emp?.uid || manualEmpUid.trim();
    const assignName = emp?.name || manualEmpName.trim() || "Employee";
    if (!assignUid) {
      alert("Select an employee or enter Employee UID from Firebase.");
      return;
    }
    if (!window.confirm(`Assign this order to ${assignName}?`)) return;

    setSaving(true);
    try {
      await assignOrderToEmployee(orderId, assignUid, assignName, user.uid);
      let partyShopName = (order as any).partyShopName || "";
      let partyCity = (order as any).partyCity || "";
      if (!partyShopName || !partyCity) {
        try {
          const { fetchPartyById } = await import("@/modules/parties");
          const party = await fetchPartyById(order.partyId);
          if (party) {
            partyShopName = String((party as any).shopName || (party as any).company || partyShopName);
            partyCity = String((party as any).city || partyCity);
          }
        } catch (e) {
          console.warn(e);
        }
      }
      await updateProductionOrder(orderId, {
        productionPriority: priority,
        physicalMattressCount: order.totalQuantity,
        photosRequired: (order.totalQuantity || 0) * 4,
        photosUploaded: order.photosUploaded || 0,
        partyShopName,
        partyCity,
      });
      setOrder((prev) =>
        prev
          ? {
              ...prev,
              assignedEmployeeId: assignUid,
              assignedEmployeeName: assignName,
              assignedAt: new Date(),
              productionStatus: "assigned",
              status: "assigned",
              productionPriority: priority,
            }
          : prev
      );

      // In-app notification to employee (Cloud Function may also send FCM)
      try {
        const { notifyEmployeeOrderAssigned } = await import(
          "@/modules/notifications"
        );
        await notifyEmployeeOrderAssigned({
          orderId,
          orderNumber: order.orderNumber || displayOrderNumber(order),
          employeeId: assignUid,
          employeeName: assignName,
          priority,
        });
      } catch (notifyErr) {
        console.error("[in-app] employee assignment notify failed", notifyErr);
      }

      alert(`Assigned to ${assignName}`);
    } catch (err) {
      console.error(err);
      alert("Failed to assign.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-[#330066] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.back()} className="text-sm text-slate-600 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <p className="text-rose-600 text-sm"><T>Order not found.</T></p>
      </div>
    );
  }

  const status = (order.productionStatus || "queue") as ProductionStatus;
  const photosUploaded = order.photosUploaded || mattresses.reduce((s, m) => {
    return s + REQUIRED_PHOTO_TYPES.filter((t) => m.photos?.[t]?.imageUrl).length;
  }, 0);
  const photosRequired = order.photosRequired || (order.physicalMattressCount || order.totalQuantity || 0) * 4;

  return (
    <div className="space-y-6 max-w-3xl">
      <button onClick={() => router.back()} className="text-sm text-slate-600 flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Back to Production
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-lg font-bold text-slate-900">
          Order {displayOrderNumber(order)}
        </p>
        <p className="text-sm text-slate-600">{order.partyName || order.partyEmail}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {[
            (order as any).partyShopName,
            (order as any).partyCity,
          ]
            .filter(Boolean)
            .map(String)
            .join(" · ") || "—"}
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRODUCTION_STATUS_COLORS[status]}`}>
            {productionStatusLabel(status)}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              PRODUCTION_PRIORITY_COLORS[(order.productionPriority || "normal") as ProductionPriority]
            }`}
          >
            {(order.productionPriority || "normal").toUpperCase()}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600">
          <p>Order Date: {formatShortDate(order.createdAt || order.submittedAt)}</p>
          <p>Mattresses: {order.physicalMattressCount || order.totalQuantity}</p>
          {order.assignedEmployeeName && (
            <p>Employee: {order.assignedEmployeeName}</p>
          )}
          {!!order.productionStartedAt && (
            <p>Started: {formatDateTime(order.productionStartedAt)}</p>
          )}
          {!!order.readyToDispatchAt && (
            <p>Ready: {formatDateTime(order.readyToDispatchAt)}</p>
          )}
        </div>
      </div>

      {/* Specs */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-700"><T>Mattress Specifications</T></p>
        {(order.items || []).length === 0 ? (
          <p className="text-sm text-slate-500">No item lines on this order.</p>
        ) : (
          (order.items || []).map((item, idx) => (
            <div
              key={item.id || idx}
              className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-sm space-y-1"
            >
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getOrderItemKindBadgeClass(item)}`}
              >
                <T>{getOrderItemKindLabel(item)}</T>
              </span>
              <p className="font-semibold text-slate-900">
                #{idx + 1} · {item.type || "Mattress"} × {item.quantity}
              </p>
              <p className="text-slate-600">
                Size: <span className="font-medium text-slate-800">{getItemSizeLabel(item)}</span>
              </p>
              <p className="text-slate-600">
                Thickness:{" "}
                <span className="font-medium text-slate-800">
                  {item.thickness || (item.height ? `${item.height} in` : "—")}
                </span>
              </p>
              <p className="text-slate-600">
                Warranty:{" "}
                <span className="font-medium text-slate-800">
                  {item.warranty ? `${item.warranty} Years` : "—"}
                </span>
              </p>
              <p className="text-slate-600">
                Fabric design:{" "}
                <span className="font-medium text-slate-800">
                  {item.designCode
                    ? `${item.designCode}${item.designName ? ` — ${item.designName}` : ""}`
                    : "—"}
                </span>
              </p>
              {item.notes ? (
                <p className="text-xs text-slate-500">Notes: {item.notes}</p>
              ) : null}
            </div>
          ))
        )}
      </div>

      {/* Priority — editable only before Ready to Dispatch */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-700"><T>Production Priority</T></p>
        {status === "ready_to_dispatch" ? (
          <p className="text-sm text-slate-600">
            <span
              className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${
                PRODUCTION_PRIORITY_COLORS[(order.productionPriority || "normal") as ProductionPriority]
              }`}
            >
              {(order.productionPriority || "normal").toUpperCase()}
            </span>
            <span className="ml-2 text-xs text-slate-400">
              <T>Locked after Ready to Dispatch</T>
            </span>
          </p>
        ) : (
          <>
            <div className="flex gap-2">
              {(["normal", "high", "urgent"] as ProductionPriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                    priority === p
                      ? PRODUCTION_PRIORITY_COLORS[p] + " border-current"
                      : "bg-white border-slate-200 text-slate-600"
                  }`}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
            {priority !== (order.productionPriority || "normal") && (
              <button
                type="button"
                onClick={handleSetPriority}
                disabled={saving}
                className="text-sm text-[#330066] font-medium"
              >
                <T>Save Priority</T>
              </button>
            )}
          </>
        )}
      </div>

      {/* Assignment */}
      {(status === "queue" || status === "assigned") && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <UserCheck className="w-4 h-4" /> Assign Employee
          </p>
          <select
            value={selectedEmp}
            onChange={(e) => setSelectedEmp(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
          >
            <option value="">
              {employees.length === 0 ? "No active employees found" : "Select Employee"}
            </option>
            {employees.map((e) => (
              <option key={e.uid} value={e.uid}>
                {e.name || "Employee"} {e.employeeCode ? `(${e.employeeCode})` : ""}
              </option>
            ))}
          </select>
          {employees.length === 0 && (
            <div className="text-xs text-amber-800 bg-amber-50 rounded-lg p-3 space-y-2 border border-amber-100">
              <p className="font-semibold"><T>No employees loaded from database.</T></p>
              <p><T>Firestore may be blocking the employee list query. Use manual assign:</T></p>
              <div className="space-y-2 pt-1">
                <input
                  value={manualEmpName}
                  onChange={(e) => setManualEmpName(e.target.value)}
                  placeholder="Employee name (e.g. Salman ali)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                />
                <input
                  value={manualEmpUid}
                  onChange={(e) => setManualEmpUid(e.target.value)}
                  placeholder="Employee UID from Firebase Auth"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white font-mono text-xs"
                />
                <p className="text-[10px] text-slate-500">
                  Firebase Console → Authentication → Users → copy User UID for salmanali@gmail.com
                </p>
              </div>
              {employeeLoadError && (
                <p className="text-[10px] text-slate-500 break-all">Debug: {employeeLoadError}</p>
              )}
            </div>
          )}
          <button
            onClick={handleAssign}
            disabled={(!selectedEmp && !manualEmpUid.trim()) || saving}
            className="w-full py-2.5 rounded-xl bg-[#330066] text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Assign Employee
          </button>
          {order.assignedEmployeeName && (
            <p className="text-xs text-slate-500">
              Currently assigned to {order.assignedEmployeeName}
              {!!order.assignedAt && ` · ${formatDateTime(order.assignedAt)}`}
            </p>
          )}
        </div>
      )}

      {/* Verification progress */}
      {(status === "in_production" || status === "ready_to_dispatch") && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-700 mb-1"><T>Verification</T></p>
          <p className="text-xs text-slate-500 mb-2">
            {photosUploaded} / {photosRequired} photos
          </p>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full"
              style={{
                width: `${photosRequired ? Math.min(100, (photosUploaded / photosRequired) * 100) : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Photo viewer */}
      {mattresses.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Camera className="w-4 h-4" /> Production Photos
          </p>
          {mattresses.map((m) => (
            <div key={m.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="font-medium text-slate-800 text-sm mb-1">
                Mattress {m.mattressNumber}
                {m.photosComplete && (
                  <CheckCircle2 className="inline w-4 h-4 text-emerald-500 ml-1" />
                )}
              </p>
              <p className="text-xs text-slate-500 mb-3">
                {m.productType} · {m.size} · {m.thickness}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {REQUIRED_PHOTO_TYPES.map((pt) => {
                  const photo = m.photos?.[pt];
                  return (
                    <div key={pt} className="text-center">
                      {photo?.imageUrl ? (
                        <a href={photo.imageUrl} target="_blank" rel="noopener noreferrer">
                          <img
                            src={photo.imageUrl}
                            alt={PHOTO_TYPE_LABELS[pt]}
                            className="w-full aspect-square object-cover rounded-lg border border-slate-200"
                          />
                        </a>
                      ) : (
                        <div className="w-full aspect-square rounded-lg bg-slate-100 flex items-center justify-center">
                          <Camera className="w-6 h-6 text-slate-300" />
                        </div>
                      )}
                      <p className="text-[10px] text-slate-500 mt-1">{PHOTO_TYPE_LABELS[pt]}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}


      {/* RTD: finance bridge (Orders path) — same order, not a second workflow */}
      {status === "ready_to_dispatch" && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-indigo-900">
            <T>Ready to Dispatch</T> — <T>Finance</T>
          </p>
          <p className="text-xs text-indigo-800">
            <T>Production is complete. Choose tax invoice or other order on the order page.</T>
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Link
              href={`/admin/invoices/new?orderId=${order.id}`}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700"
            >
              <T>Create Tax Invoice</T>
            </Link>
            <Link
              href={`/admin/orders/${order.id}`}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-white px-4 py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-50"
            >
              <T>Other Order</T> / <T>Order detail</T>
            </Link>
          </div>
        </div>
      )}

      {/* History timeline */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
        <p className="text-sm font-semibold text-slate-700 mb-2"><T>Production History</T></p>
        {!!order.submittedAt && (
          <p className="text-xs text-slate-600">✓ Order Submitted · {formatDateTime(order.submittedAt)}</p>
        )}
        {!!order.approvedAt && (
          <p className="text-xs text-slate-600">✓ Admin Approved · {formatDateTime(order.approvedAt)}</p>
        )}
        {!!order.assignedAt && (
          <p className="text-xs text-slate-600">
            ✓ Assigned to {order.assignedEmployeeName} · {formatDateTime(order.assignedAt)}
          </p>
        )}
        {!!order.productionStartedAt && (
          <p className="text-xs text-slate-600">
            ✓ Production Started · {formatDateTime(order.productionStartedAt)}
          </p>
        )}
        {!!order.readyToDispatchAt && (
          <p className="text-xs text-slate-600">
            ✓ Ready to Dispatch · {formatDateTime(order.readyToDispatchAt)}
          </p>
        )}
      </div>
    </div>
  );
}