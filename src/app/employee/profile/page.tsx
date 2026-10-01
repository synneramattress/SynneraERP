"use client";
import { T } from "@/i18n";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import ProfilePageShell from "@/components/profile/ProfilePageShell";
import { NotificationTestPanel } from "@/modules/notifications";
import { KeyRound, Loader2 } from "lucide-react";

export default function EmployeeProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      await logout();
      router.replace("/auth/login");
    } finally {
      setLoggingOut(false);
    }
  };

  const handleChangePassword = async () => {
    const email = (user as any)?.loginEmail || user?.email;
    if (!email) {
      setResetMsg("No email on file for password reset.");
      return;
    }
    setResetting(true);
    setResetMsg("");
    try {
      await sendPasswordResetEmail(auth, email);
      setResetMsg("Password reset email sent. Check your inbox.");
    } catch (e: any) {
      setResetMsg(e?.message || "Could not send reset email.");
    } finally {
      setResetting(false);
    }
  };

  const u = user as any;

  return (
    <ProfilePageShell
      name={user?.name}
      email={(user as any)?.loginEmail || user?.email}
      roleLabel="Employee"
      fields={[
        { label: "Login email", value: u?.loginEmail || user?.email },
        { label: "Phone", value: user?.phone || u?.mobile },
        { label: "Employee code", value: u?.employeeCode || u?.code },
        { label: "Department", value: u?.department },
        { label: "Company", value: user?.company },
      ]}
      onLogout={handleSignOut}
      loggingOut={loggingOut}
    >
      <NotificationTestPanel userId={user?.uid} compact />

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-900"><T>Security</T></p>
        <button
          type="button"
          onClick={handleChangePassword}
          disabled={resetting}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {resetting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <KeyRound className="w-4 h-4" />
          )}
          Change password
        </button>
        {resetMsg && (
          <p className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
            {resetMsg}
          </p>
        )}
      </div>
    </ProfilePageShell>
  );
}
