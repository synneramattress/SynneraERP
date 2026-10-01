"use client";
import { T } from "@/i18n";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Order } from "@/modules/orders";
import type { User } from "@/types/identity";
import { fetchEmployeeById, updateEmployee, saveEmployeeMirror } from "@/modules/employees";
import { fetchOrdersAssignedToEmployee } from "@/modules/production";
import {
  PRODUCTION_STATUS_COLORS,
  productionStatusLabel,
  formatDateTime,
  displayOrderNumber,
} from "@/lib/utils";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function EmployeeDetailPage() {
  const params = useParams();
  const employeeId = params?.employeeId as string;
  const router = useRouter();
  const [emp, setEmp] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit form
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [department, setDepartment] = useState("Production");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [internalNotes, setInternalNotes] = useState("");

  useEffect(() => {
    if (!employeeId) return;
    const load = async () => {
      setLoading(true);
      try {
        const employee = await fetchEmployeeById(employeeId);
        if (!employee || String(employee.role).toLowerCase() !== "employee") {
          setEmp(null);
          return;
        }
        const data = { ...employee, uid: employee.id } as User;
        setEmp(data);
        setName(data.name || "");
        setMobile(data.mobile || data.phone || "");
        setDepartment(data.department || "Production");
        setStatus((data.status as "ACTIVE" | "INACTIVE") || "ACTIVE");
        setInternalNotes(data.internalNotes || "");

        setOrders(await fetchOrdersAssignedToEmployee(employeeId));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [employeeId]);

  const handleSave = async () => {
    if (!emp) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        mobile: mobile.trim(),
        department,
        status,
        internalNotes: internalNotes.trim() || null,
      };
      await updateEmployee(emp.uid, payload);
      try {
        await saveEmployeeMirror(emp.uid, {
          uid: emp.uid,
          employeeCode: emp.employeeCode || "",
          loginEmail: emp.loginEmail || emp.email || "",
          email: emp.email || emp.loginEmail || "",
          role: "employee",
          ...payload,
        });
      } catch (_) {}
      setEmp((prev) =>
        prev
          ? {
              ...prev,
              name: name.trim(),
              mobile: mobile.trim(),
              department,
              status,
              internalNotes: internalNotes.trim(),
            }
          : prev
      );
      alert("Employee updated.");
    } catch (err) {
      console.error(err);
      alert("Failed to save.");
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

  if (!emp) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.back()} className="text-sm text-slate-600 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <p className="text-rose-600 text-sm"><T>Employee not found.</T></p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <button onClick={() => router.back()} className="text-sm text-slate-600 flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Back to Employees
      </button>

      <h1 className="text-xl font-bold text-slate-900">{emp.name}</h1>
      <p className="text-sm text-slate-500 -mt-4">{emp.employeeCode}</p>

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1"><T>Name</T></label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1"><T>Mobile</T></label>
          <input
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1"><T>Department</T></label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
          >
            <option value="Production"><T>Production</T></option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
          >
            <option value="ACTIVE"><T>Active</T></option>
            <option value="INACTIVE"><T>Inactive</T></option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1"><T>Login Email</T></label>
          <input
            value={emp.loginEmail || emp.email || ""}
            disabled
            className="w-full px-3 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm text-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1"><T>Internal Notes</T></label>
          <textarea
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 rounded-xl bg-[#330066] text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Changes
        </button>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">
          Assigned Production ({orders.length})
        </h2>
        {orders.length === 0 ? (
          <p className="text-sm text-slate-500"><T>No orders assigned.</T></p>
        ) : (
          <div className="space-y-2">
            {orders.map((o) => (
              <Link
                key={o.id}
                href={`/admin/production/${o.id}`}
                className="block bg-white rounded-xl border border-slate-200 p-3 hover:border-[#330066]/30"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm text-slate-900">
                      {displayOrderNumber(o)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {o.partyName} · {o.physicalMattressCount || o.totalQuantity} mattresses
                    </p>
                  </div>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                      PRODUCTION_STATUS_COLORS[
                        (o.productionStatus || "assigned") as keyof typeof PRODUCTION_STATUS_COLORS
                      ] || "bg-slate-100"
                    }`}
                  >
                    {productionStatusLabel(o.productionStatus)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}