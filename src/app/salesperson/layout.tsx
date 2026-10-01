"use client";

import { T } from "@/i18n";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Menu,
  X,
  Palette,
  IndianRupee,
  FileText,
  UserCircle,
  LogOut,
  ShoppingBag,
  Bell,
} from "lucide-react";
import AppHeader from "@/components/layout/AppHeader";
import AppBottomNav from "@/components/layout/AppBottomNav";

/**
 * Salesperson workspace shell — Phase 4B.
 * Role + active status gate; bottom nav + More sheet for sales tools.
 */
export default function SalespersonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const compensationType = String((user as any)?.compensationType || "REGULAR_SALARY").toUpperCase();
  const prospectsBlocked = compensationType === "COMMISSION_ONLY";

  useEffect(() => {
    if (!loading && user?.role === "salesperson" && prospectsBlocked) {
      const blocked =
        pathname?.startsWith("/salesperson/prospects") ||
        pathname?.startsWith("/salesperson/field-follow-ups") ||
        pathname?.startsWith("/salesperson/my-parties") ||
        pathname?.startsWith("/salesperson/assisted-order");
      if (blocked) {
        router.replace("/salesperson/dashboard");
      }
    }
  }, [loading, user, prospectsBlocked, pathname, router]);
  const [moreOpen, setMoreOpen] = useState(false);

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
    if (role === "employee") {
      router.replace("/employee/dashboard");
      return;
    }
    if (role === "party") {
      router.replace("/party/dashboard");
      return;
    }
    if (role !== "salesperson") {
      router.replace("/auth/login");
      return;
    }
    // Inactive blocked here as well as AuthContext/login
    if (String(user.status || "ACTIVE").toUpperCase() === "INACTIVE") {
      logout().then(() => router.replace("/auth/login"));
    }
  }, [user, loading, router, logout]);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const currentRole = String(user?.role || "").toLowerCase();
  const inactive =
    String(user?.status || "ACTIVE").toUpperCase() === "INACTIVE";
  if (loading || !user || currentRole !== "salesperson" || inactive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-[#330066] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleSignOut = async () => {
    setMoreOpen(false);
    await logout();
    router.replace("/auth/login");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader
        homeHref="/salesperson/dashboard"
        notificationsHref="/salesperson/notifications"
        profileHref="/salesperson/profile"
        user={{ uid: user.uid, name: user.name, email: user.email }}
        onLogout={handleSignOut}
      />

      <main className="w-full max-w-lg mx-auto px-4 pb-24 min-w-0 overflow-x-hidden">{children}</main>

      <AppBottomNav
        items={[
          {
            href: "/salesperson/dashboard",
            label: "Home",
            icon: LayoutDashboard,
          },
          {
            href: "/salesperson/follow-ups",
            label: "Leads",
            icon: ClipboardList,
          },
          {
            href: "/salesperson/orders",
            label: "Orders",
            icon: ShoppingBag,
          },
          {
            label: "More",
            icon: Menu,
            onClick: () => setMoreOpen(true),
          },
        ]}
      />

      {moreOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl max-h-[80vh] overflow-y-auto pb-safe">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <p className="font-semibold text-slate-900">
                <T>More</T>
              </p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="p-1 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-4 pt-3 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <T>Sales Tools</T>
              </p>
            </div>
            <div className="p-2 space-y-0.5">
              {[
                ...(!prospectsBlocked
                  ? [
                      {
                        href: "/salesperson/assisted-order",
                        label: "Assisted Order",
                        icon: ShoppingBag,
                      },
                      {
                        href: "/salesperson/prospects",
                        label: "Prospects",
                        icon: Users,
                      },
                      {
                        href: "/salesperson/field-follow-ups",
                        label: "Field Follow-ups",
                        icon: ClipboardList,
                      },
                      {
                        href: "/salesperson/my-parties",
                        label: "My Parties",
                        icon: Users,
                      },
                    ]
                  : []),
                {
                  href: "/salesperson/commission",
                  label: "Commission",
                  icon: IndianRupee,
                },
                {
                  href: "/salesperson/performance",
                  label: "Performance",
                  icon: LayoutDashboard,
                },
                {
                  href: "/salesperson/designs",
                  label: "Designs",
                  icon: Palette,
                },
                {
                  href: "/salesperson/rates",
                  label: "Rates",
                  icon: IndianRupee,
                },
                {
                  href: "/salesperson/brochure",
                  label: "Brochure",
                  icon: FileText,
                },
                {
                  href: "/salesperson/marketing",
                  label: "Marketing Materials",
                  icon: FileText,
                },
                {
                  href: "/salesperson/customers",
                  label: "Customers",
                  icon: Users,
                },
                {
                  href: "/salesperson/notifications",
                  label: "Notifications",
                  icon: Bell,
                },
                {
                  href: "/salesperson/profile",
                  label: "Profile",
                  icon: UserCircle,
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <item.icon className="w-4 h-4 text-[#330066]" />
                  <T>{item.label}</T>
                </Link>
              ))}
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="w-4 h-4" />
                <T>Sign Out</T>
              </button>
            </div>
            <div className="h-4" />
          </div>
        </div>
      )}
    </div>
  );
}
