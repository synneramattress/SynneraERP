"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProfilePageShell from "@/components/profile/ProfilePageShell";
import { NotificationTestPanel } from "@/modules/notifications";
import CompanyProfileSection from "@/components/company/CompanyProfileSection";
import { Bell } from "lucide-react";

export default function AdminProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
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

  if (!user) return null;

  return (
    <ProfilePageShell
      name={user.name}
      email={user.email}
      roleLabel="Administrator"
      fields={[
        { label: "Phone", value: user.phone },
        { label: "Company", value: user.company },
        { label: "Role", value: user.role },
      ]}
      onLogout={handleSignOut}
      loggingOut={loggingOut}
      logoutLabel="Sign Out"
    >
      <CompanyProfileSection adminUid={user.uid} />
      <NotificationTestPanel userId={user.uid} compact />
      <Link
        href="/admin/notification-test"
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:border-[#330066]/40"
      >
        <Bell className="w-4 h-4 text-[#330066]" />
        Open full Notification Test page
      </Link>
    </ProfilePageShell>
  );
}
