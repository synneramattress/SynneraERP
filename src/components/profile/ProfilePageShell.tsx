"use client";
import { T } from "@/i18n";

import type { ReactNode } from "react";
import { LogOut } from "lucide-react";

export type ProfileField = {
  label: string;
  value?: string | null;
};

type ProfilePageShellProps = {
  name?: string | null;
  email?: string | null;
  roleLabel: string;
  fields?: ProfileField[];
  children?: ReactNode;
  onLogout: () => void;
  logoutLabel?: string;
  loggingOut?: boolean;
};

export default function ProfilePageShell({
  name,
  email,
  roleLabel,
  fields = [],
  children,
  onLogout,
  logoutLabel = "Logout",
  loggingOut = false,
}: ProfilePageShellProps) {
  const initial = (name?.[0] || email?.[0] || "U").toUpperCase();

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900"><T>Profile</T></h1>
        <p className="text-sm text-slate-500 mt-0.5"><T>Your account information</T></p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-5 flex items-center gap-4 border-b border-slate-100">
          <div className="w-16 h-16 rounded-full bg-[#330066]/15 text-[#330066] flex items-center justify-center text-2xl font-bold shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-lg text-slate-900 truncate">
              {name || "User"}
            </p>
            <p className="text-sm text-slate-500 truncate">{email || "—"}</p>
            <span className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-[#330066]/10 text-[#330066]">
              {roleLabel}
            </span>
          </div>
        </div>

        {fields.length > 0 && (
          <div className="p-5 space-y-3">
            {fields.map((f) => (
              <div key={f.label}>
                <p className="text-xs text-slate-500">{f.label}</p>
                <p className="text-sm font-medium text-slate-900 mt-0.5">
                  {f.value?.trim() ? f.value : "—"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {children}

      <button
        type="button"
        onClick={onLogout}
        disabled={loggingOut}
        className="w-full flex items-center justify-center gap-2 py-3 border border-rose-200 text-rose-600 rounded-xl font-medium hover:bg-rose-50 transition disabled:opacity-60"
      >
        <LogOut className="w-4 h-4" />
        {loggingOut ? "Signing out…" : logoutLabel}
      </button>
    </div>
  );
}