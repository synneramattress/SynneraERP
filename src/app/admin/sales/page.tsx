"use client";

import { T, useLanguage } from "@/i18n";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  RefreshCw,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { createAuthUser } from "@/lib/firebase/secondaryAuth";
import {
  countSalespersonStatuses,
  createSalespersonProfile,
  fetchAllSalespersons,
  isSalespersonIdTaken,
  salespersonDisplayName,
  updateSalespersonStatus,
  updateSalespersonProfile,
  generateSalespersonId,
  type SalespersonRecord,
  type SalespersonStatus,
} from "@/modules/sales";
import { SummaryStatusCards } from "@/components/shared/SummaryStatusCards";
import AdminSalesSubNav from "@/modules/sales/components/AdminSalesSubNav";

type CompType = "REGULAR_SALARY" | "COMMISSION_ONLY" | "";

export default function AdminSalesPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [rows, setRows] = useState<SalespersonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<SalespersonRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [name, setName] = useState("");
  const [salespersonId, setSalespersonId] = useState("");
  const [mobile, setMobile] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<SalespersonStatus>("ACTIVE");
  const [city, setCity] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  /** Empty until Admin explicitly selects — required */
  const [compensationType, setCompensationType] = useState<CompType>("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await fetchAllSalespersons());
    } catch (e) {
      console.error(e);
      setError("Could not load salespersons.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => countSalespersonStatuses(rows), [rows]);

  const resetForm = () => {
    setEditing(null);
    setName("");
    setSalespersonId("");
    setMobile("");
    setLoginEmail("");
    setTempPassword("");
    setConfirmPassword("");
    setStatus("ACTIVE");
    setCity("");
    setInternalNotes("");
    setCompensationType("");
    setFormError("");
  };

  const openCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (sp: SalespersonRecord) => {
    setEditing(sp);
    setName(String(sp.name || ""));
    setSalespersonId(String(sp.salespersonId || ""));
    setMobile(String(sp.mobile || sp.phone || ""));
    setLoginEmail(String(sp.loginEmail || sp.email || ""));
    setTempPassword("");
    setConfirmPassword("");
    setStatus(
      String(sp.status || "ACTIVE").toUpperCase() === "INACTIVE"
        ? "INACTIVE"
        : "ACTIVE"
    );
    setCity(String(sp.city || ""));
    setInternalNotes(String(sp.internalNotes || ""));
    const ct = String(sp.compensationType || "").toUpperCase();
    setCompensationType(
      ct === "COMMISSION_ONLY" || ct === "REGULAR_SALARY" ? (ct as CompType) : ""
    );
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!compensationType) {
      setFormError(t("Please select compensation type."));
      return;
    }

    if (editing) {
      if (!name.trim() || !mobile.trim()) {
        setFormError(t("Please fill all required fields."));
        return;
      }
      setSubmitting(true);
      try {
        await updateSalespersonProfile(editing.uid || editing.id, {
          name: name.trim(),
          mobile: mobile.trim(),
          city: city.trim(),
          internalNotes: internalNotes.trim(),
          status,
          compensationType,
        });
        setIsModalOpen(false);
        resetForm();
        await load();
      } catch (err: unknown) {
        console.error(err);
        setFormError(
          err instanceof Error ? err.message : "Failed to update salesperson."
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (
      !name.trim() ||
      !mobile.trim() ||
      !loginEmail.trim() ||
      !tempPassword.trim()
    ) {
      setFormError(t("Please fill all required fields."));
      return;
    }
    if (tempPassword.length < 6) {
      setFormError(t("Password must be at least 6 characters."));
      return;
    }
    if (tempPassword !== confirmPassword) {
      setFormError(t("Password and confirm password do not match."));
      return;
    }

    setSubmitting(true);
    try {
      const code = (await generateSalespersonId()).trim();
      if (await isSalespersonIdTaken(code)) {
        setFormError(t("This Salesperson ID is already in use."));
        setSubmitting(false);
        return;
      }
      const uid = await createAuthUser(loginEmail.trim(), tempPassword);
      await createSalespersonProfile({
        uid,
        name: name.trim(),
        salespersonId: code,
        mobile: mobile.trim(),
        loginEmail: loginEmail.trim(),
        email: loginEmail.trim(),
        status,
        city: city.trim() || undefined,
        internalNotes: internalNotes.trim() || undefined,
        compensationType,
        createdBy: user?.uid,
      });
      setIsModalOpen(false);
      resetForm();
      await load();
    } catch (err: unknown) {
      console.error(err);
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : "";
      if (code === "auth/email-already-in-use") {
        setFormError(t("This login email is already in use."));
      } else {
        setFormError(
          err instanceof Error ? err.message : "Failed to create salesperson."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (sp: SalespersonRecord) => {
    const uid = sp.uid || sp.id;
    const next: SalespersonStatus =
      String(sp.status || "ACTIVE").toUpperCase() === "INACTIVE"
        ? "ACTIVE"
        : "INACTIVE";
    if (
      !window.confirm(
        `${next === "ACTIVE" ? "Activate" : "Deactivate"} ${salespersonDisplayName(
          sp
        )}?`
      )
    ) {
      return;
    }
    try {
      await updateSalespersonStatus(uid, next);
      await load();
    } catch (e) {
      console.error(e);
      setError("Could not update status.");
    }
  };

  const compLabel = (sp: SalespersonRecord) => {
    const ct = String(sp.compensationType || "").toUpperCase();
    if (ct === "COMMISSION_ONLY") return "Commission Only";
    if (ct === "REGULAR_SALARY") return "Regular Salary";
    return "Not Set";
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            <T>Sales</T>
          </h1>
          <p className="text-sm text-slate-500">
            <T>Manage salespersons</T>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            className="p-2 rounded-full border border-slate-200 text-slate-500"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#330066] text-white text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            <T>Add Salesperson</T>
          </button>
        </div>
      </div>

      <AdminSalesSubNav />

      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <SummaryStatusCards
        items={[
          {
            key: "total",
            label: "Total",
            value: counts.total,
            icon: Users,
            bg: "bg-violet-50",
            text: "text-violet-700",
          },
          {
            key: "active",
            label: "Active",
            value: counts.active,
            icon: UserCheck,
            bg: "bg-emerald-50",
            text: "text-emerald-700",
          },
          {
            key: "inactive",
            label: "Inactive",
            value: counts.inactive,
            icon: UserX,
            bg: "bg-slate-100",
            text: "text-slate-600",
          },
        ]}
        columns={3}
      />

      {loading && rows.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">
          <T>Loading…</T>
        </p>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
          <p className="text-sm text-slate-500">
            <T>No salespersons yet. Add one to get started.</T>
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((sp) => {
            const active =
              String(sp.status || "ACTIVE").toUpperCase() !== "INACTIVE";
            return (
              <div
                key={sp.id}
                className="bg-white rounded-2xl border border-slate-100 p-3"
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 truncate">
                      {salespersonDisplayName(sp)}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {sp.salespersonId || "—"}
                      {sp.mobile ? ` · ${sp.mobile}` : ""}
                      {sp.loginEmail || sp.email
                        ? ` · ${sp.loginEmail || sp.email}`
                        : ""}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      <T>Compensation Type</T>:{" "}
                      <span className="font-semibold">
                        <T>{compLabel(sp)}</T>
                      </span>
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md shrink-0 ${
                      active
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {active ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(sp)}
                    className="text-xs font-semibold text-[#330066] px-3 py-1.5 rounded-lg border border-violet-200 bg-violet-50"
                  >
                    <T>Edit</T>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleStatus(sp)}
                    className="text-xs font-semibold text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200"
                  >
                    {active ? <T>Deactivate</T> : <T>Activate</T>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">
                {editing ? <T>Edit Salesperson</T> : <T>Add Salesperson</T>}
              </h2>
              <button
                type="button"
                className="text-sm text-slate-500"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
              >
                <T>Cancel</T>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              {formError && (
                <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
                  {formError}
                </p>
              )}
              <label className="block">
                <span className="text-xs font-semibold text-slate-500">
                  <T>Name</T> *
                </span>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              {!editing && (
                <p className="text-xs text-slate-500 rounded-xl border border-dashed border-slate-200 px-3 py-2 bg-slate-50">
                  <T>Salesperson ID</T>:{" "}
                  <span className="font-semibold text-slate-700">
                    <T>Auto-allocated on save</T> (SP-xxx)
                  </span>
                </p>
              )}
              {editing && (
                <p className="text-xs text-slate-500">
                  <T>Salesperson ID</T>:{" "}
                  <span className="font-semibold text-slate-800 font-mono">
                    {salespersonId || "—"}
                  </span>
                </p>
              )}
              <label className="block">
                <span className="text-xs font-semibold text-slate-500">
                  <T>Mobile</T> *
                </span>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  inputMode="tel"
                />
              </label>
              {!editing && (
                <>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-500">
                      <T>Login Email</T> *
                    </span>
                    <input
                      type="email"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      autoComplete="off"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-500">
                      <T>Password</T> *
                    </span>
                    <input
                      type="password"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                      value={tempPassword}
                      onChange={(e) => setTempPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-500">
                      <T>Confirm Password</T> *
                    </span>
                    <input
                      type="password"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </label>
                </>
              )}
              {editing && (
                <p className="text-xs text-slate-500">
                  <T>Login Email</T>:{" "}
                  <span className="font-semibold text-slate-800">
                    {loginEmail || "—"}
                  </span>
                </p>
              )}

              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1.5">
                  <T>Compensation Type</T> *
                </p>
                <div className="flex flex-col gap-2 text-sm">
                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5">
                    <input
                      type="radio"
                      name="compType"
                      checked={compensationType === "REGULAR_SALARY"}
                      onChange={() => setCompensationType("REGULAR_SALARY")}
                    />
                    <T>Regular Salary</T>
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5">
                    <input
                      type="radio"
                      name="compType"
                      checked={compensationType === "COMMISSION_ONLY"}
                      onChange={() => setCompensationType("COMMISSION_ONLY")}
                    />
                    <T>Commission Only</T>
                  </label>
                </div>
              </div>

              <label className="block">
                <span className="text-xs font-semibold text-slate-500">
                  <T>Status</T>
                </span>
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white"
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as SalespersonStatus)
                  }
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-500">
                  <T>City</T>
                </span>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-500">
                  <T>Internal notes</T>
                </span>
                <textarea
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm min-h-[64px]"
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                />
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-2xl bg-[#330066] text-white font-bold disabled:opacity-50"
              >
                {submitting ? (
                  <T>Saving…</T>
                ) : editing ? (
                  <T>Save Changes</T>
                ) : (
                  <T>Create Salesperson</T>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
