"use client";
import { T } from "@/i18n";

import SearchFilterBar from "@/components/shared/SearchFilterBar";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { fetchAllEmployees, createEmployeeProfile, updateEmployeeStatus, generateEmployeeId } from "@/modules/employees";
import { fetchActiveProductionOrderCounts } from "@/modules/production";
import { createAuthUser } from "@/lib/firebase/secondaryAuth";
import type { Order } from "@/modules/orders";
import type { User } from "@/types/identity";
import {
  Users,
  Plus,
  Search,
  RefreshCw,
  X,
  Loader2,
} from "lucide-react";

interface EmployeeWithStats extends User {
  activeOrders: number;
}


function listTime(value: any): number {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.seconds === "number") return value.seconds * 1000;
  const n = new Date(value).getTime();
  return Number.isFinite(n) ? n : 0;
}
export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeWithStats[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [sortEmployees, setSortEmployees] = useState("newest");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("Production");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [loginEmail, setLoginEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadEmployees = async () => {
    setLoading(true);
    setError("");
    try {
      const list = (await fetchAllEmployees()).map((e) => ({
        ...e,
        uid: e.id,
      } as User));

      // Count active production orders per employee
      const activeByEmp = await fetchActiveProductionOrderCounts();

      setEmployees(
        list.map((e) => ({
          ...e,
          activeOrders: activeByEmp[e.uid] || 0,
        }))
      );
    } catch (err) {
      console.error(err);
      setError("Failed to load employees.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const resetForm = () => {
    setName("");
    setEmployeeCode("");
    setMobile("");
    setEmail("");
    setDepartment("Production");
    setStatus("ACTIVE");
    setLoginEmail("");
    setTempPassword("");
    setInternalNotes("");
    setFormError("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!name.trim() || !mobile.trim() || !loginEmail.trim() || !tempPassword.trim()) {
      setFormError("Please fill all required fields.");
      return;
    }
    if (tempPassword.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const uid = await createAuthUser(loginEmail.trim(), tempPassword);
      const code = (await generateEmployeeId()).trim();
      const profile: Record<string, any> = {
        uid,
        name: name.trim(),
        employeeCode: code,
        mobile: mobile.trim(),
        email: email.trim() || loginEmail.trim(),
        loginEmail: loginEmail.trim(),
        department: department || "Production",
        role: "employee",
        status,
        internalNotes: internalNotes.trim() || null,
      };
      await createEmployeeProfile(uid, profile);
      setIsModalOpen(false);
      resetForm();
      await loadEmployees();
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setFormError("This login email is already in use.");
      } else {
        setFormError(err.message || "Failed to create employee.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (emp: EmployeeWithStats) => {
    const next = emp.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    if (!window.confirm(`${next === "ACTIVE" ? "Activate" : "Deactivate"} ${emp.name}?`)) return;
    try {
      await updateEmployeeStatus(emp.uid, next);
      await loadEmployees();
    } catch (err) {
      console.error(err);
      alert("Failed to update status.");
    }
  };

  const filtered = employees.filter((e) => {
    if (filterStatus !== "ALL" && e.status !== filterStatus) return false;
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      e.name?.toLowerCase().includes(s) ||
      e.employeeCode?.toLowerCase().includes(s) ||
      e.mobile?.includes(s) ||
      e.loginEmail?.toLowerCase().includes(s)
    );
  });

  const sortedEmployees = [...filtered].sort((a, b) => {
    if (sortEmployees === "oldest") return listTime(a.createdAt) - listTime(b.createdAt);
    if (sortEmployees === "name_asc") return (a.name || "").localeCompare(b.name || "");
    if (sortEmployees === "name_desc") return (b.name || "").localeCompare(a.name || "");
    if (sortEmployees === "active_orders") return (b.activeOrders || 0) - (a.activeOrders || 0);
    return listTime(b.createdAt) - listTime(a.createdAt);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-[#330066]" /> Employees
        </h1>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5 bg-[#330066] text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-[#4B0082] transition"
        >
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchFilterBar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search name, ID, mobile..."
            values={{ status: filterStatus }}
            onApply={(v) => setFilterStatus((v.status || "ALL") as "ALL" | "ACTIVE" | "INACTIVE")}
            filterGroups={[{ key: "status", label: "Status", options: [
              { value: "ALL", label: "All" }, { value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }
            ]}]}
            sortOptions={[
              { value: "newest", label: "Newest Employees" }, { value: "oldest", label: "Oldest Employees" },
              { value: "name_asc", label: "Name A–Z" }, { value: "name_desc", label: "Name Z–A" },
              { value: "active_orders", label: "Most Active Orders" }
            ]}
            sortValue={sortEmployees}
            onSortChange={setSortEmployees}
          />
        </div>
        <div className="flex gap-2">
          {(["ALL", "ACTIVE", "INACTIVE"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition ${
                filterStatus === s
                  ? "bg-[#330066] text-white"
                  : "bg-white border border-slate-200 text-slate-600"
              }`}
            >
              {s}
            </button>
          ))}
          <button
            onClick={loadEmployees}
            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 text-sm rounded-xl p-3">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#330066] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sortedEmployees.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500 text-sm">
          No employees found.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sortedEmployees.map((emp) => (
            <div
              key={emp.uid}
              className="bg-white rounded-xl border border-slate-200 p-4 space-y-2"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{emp.name}</p>
                  <p className="text-xs text-slate-500">{emp.employeeCode}</p>
                </div>
                <span
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                    emp.status === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {emp.status}
                </span>
              </div>
              <p className="text-sm text-slate-600">{emp.department || "Production"}</p>
              <p className="text-xs text-slate-500">Active Orders: {emp.activeOrders}</p>
              <div className="flex gap-2 pt-1">
                <Link
                  href={`/admin/employees/${emp.uid}`}
                  className="flex-1 text-center text-xs font-medium py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  View
                </Link>
                <button
                  onClick={() => toggleStatus(emp)}
                  className="flex-1 text-center text-xs font-medium py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  {emp.status === "ACTIVE" ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900"><T>Add Employee</T></h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Employee Information
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Employee Name *
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#330066]/30"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <T>Employee ID</T>
                </label>
                <p className="w-full px-3 py-2.5 rounded-xl border border-dashed border-slate-200 text-sm bg-slate-50 text-slate-600">
                  <T>Auto-allocated on save</T> (EMP-xxx)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Mobile Number *
                </label>
                <input
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  type="tel"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#330066]/30"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1"><T>Email</T></label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#330066]/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Department *
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#330066]/30"
                >
                  <option value="Production"><T>Production</T></option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1"><T>Status *</T></label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#330066]/30"
                >
                  <option value="ACTIVE"><T>Active</T></option>
                  <option value="INACTIVE"><T>Inactive</T></option>
                </select>
              </div>

              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide pt-2">
                Account Login Credentials
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Login Email *
                </label>
                <input
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  type="email"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#330066]/30"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Temporary Password *
                </label>
                <input
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  type="text"
                  minLength={6}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#330066]/30"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1"><T>Min 6 characters (Firebase Auth)</T></p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Internal Notes
                </label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#330066]/30"
                  placeholder="Any special employee notes..."
                />
              </div>

              {formError && (
                <div className="bg-rose-50 text-rose-700 text-sm rounded-xl p-3">{formError}</div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#330066] text-white text-sm font-medium hover:bg-[#4B0082] disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}