"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LayoutDashboard, Factory, User } from "lucide-react";
import AppHeader from "@/components/layout/AppHeader";
import AppBottomNav from "@/components/layout/AppBottomNav";

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/auth/login");
      return;
    }
    const role = String(user.role || "").toLowerCase();
    if (role === "admin") {
      router.replace("/admin/dashboard");
      return;
    }
    if (role === "party") {
      router.replace("/party/dashboard");
      return;
    }
    if (role === "salesperson") {
      router.replace("/salesperson/dashboard");
      return;
    }
    if (role !== "employee") {
      router.replace("/auth/login");
    }
  }, [user, loading, router]);

  const currentRole = String(user?.role || "").toLowerCase();
  if (loading || !user || currentRole !== "employee") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-[#330066] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleSignOut = async () => {
    await logout();
    router.replace("/auth/login");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader
        homeHref="/employee/dashboard"
        notificationsHref="/employee/notifications"
        profileHref="/employee/profile"
        user={{ uid: user.uid, name: user.name, email: user.email }}
        onLogout={handleSignOut}
      />

      <main className="p-4 pb-24 max-w-3xl mx-auto">{children}</main>

      <AppBottomNav
        items={[
          { href: "/employee/dashboard", label: "Home", icon: LayoutDashboard },
          { href: "/employee/production", label: "Production", icon: Factory },
          { href: "/employee/profile", label: "Profile", icon: User },
        ]}
      />
    </div>
  );
}
