"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  ShoppingBag,
  Palette,
  IndianRupee,
  Plus,
  Menu,
  Megaphone,
  FileText,
  User,
  LogOut,
  X,
} from "lucide-react";
import { setupOfflineSyncListeners } from "@/lib/offline/sync";
import AppHeader from "@/components/layout/AppHeader";
import AppBottomNav from "@/components/layout/AppBottomNav";
import { T } from "@/i18n";

export default function PartyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const userRef = useRef(user);
  userRef.current = user;
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/auth/login");
      return;
    }
    const role = String(user.role || "").toLowerCase();
    if (role === "employee") {
      router.replace("/employee/dashboard");
      return;
    }
    if (role === "admin") {
      router.replace("/admin/dashboard");
      return;
    }
    if (role === "salesperson") {
      router.replace("/salesperson/dashboard");
      return;
    }
    if (role !== "party") {
      router.replace("/auth/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user?.uid) return;
    const cleanup = setupOfflineSyncListeners(
      () => userRef.current?.uid,
      (result) => {
        if (result.synced > 0) {
          console.log(
            `[OfflineSync] Synced ${result.synced} order(s) from offline queue`
          );
        }
      }
    );
    return cleanup;
  }, [user?.uid]);

  const role = String(user?.role || "").toLowerCase();

  if (loading || !user || role !== "party") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-[#330066] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleLogout = async () => {
    setMoreOpen(false);
    await logout();
    router.replace("/auth/login");
  };

  const moreLinks = [
    { href: "/party/rates", label: "Rates", icon: IndianRupee },
    { href: "/party/brochure", label: "Brochure", icon: FileText },
    { href: "/party/announcements", label: "Announcements", icon: Megaphone },
    { href: "/party/profile", label: "Profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader
        homeHref="/party/dashboard"
        notificationsHref="/party/notifications"
        profileHref="/party/profile"
        user={{ uid: user.uid, name: user.name, email: user.email }}
        onLogout={handleLogout}
      />

      <main className="w-full max-w-lg mx-auto px-4 pb-24 min-w-0 overflow-x-hidden">{children}</main>

      {/* Footer: Home | Orders | + | Designs | More */}
      <AppBottomNav
        items={[
          { href: "/party/dashboard", label: "Home", icon: LayoutDashboard },
          { href: "/party/orders", label: "Orders", icon: ShoppingBag },
          {
            href: "/party/orders/new",
            label: "New",
            icon: Plus,
            primary: true,
          },
          { href: "/party/designs", label: "Designs", icon: Palette },
          {
            label: "More",
            icon: Menu,
            onClick: () => setMoreOpen(true),
          },
        ]}
      />

      {/* More sheet — pattern like admin reference, Party links only */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
            onClick={() => setMoreOpen(false)}
          />
          <div className="relative bg-white rounded-t-3xl shadow-xl max-h-[85vh] overflow-y-auto pb-safe animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                <T>More</T>
              </h2>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <nav className="py-2">
              {moreLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 px-5 py-3.5 text-slate-800 hover:bg-slate-50 active:bg-slate-100"
                  >
                    <Icon className="w-5 h-5 text-[#330066]" />
                    <span className="text-base font-medium">
                      <T>{item.label}</T>
                    </span>
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-5 py-3.5 text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-base font-medium">
                  <T>Sign Out</T>
                </span>
              </button>
            </nav>
            <div className="h-6" />
          </div>
        </div>
      )}
    </div>
  );
}
