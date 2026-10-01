"use client";
import { T } from "@/i18n";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import AppHeader from "@/components/layout/AppHeader";
import AppBottomNav from "@/components/layout/AppBottomNav";
import { LayoutDashboard,
  ShoppingBag,
  Palette,
  LogOut,
  UserCircle,
  Users,
  Megaphone,
  Bell,
  Truck,
  FileText,
  Phone,
  Factory,
  HardHat,
  IndianRupee,
  Calculator,
  Package,
  Building2,
  Briefcase,
  ChevronDown,
  Menu,
  X,
  Trash2,
  BarChart3,
  ClipboardList } from "lucide-react";

function pageTitle(pathname: string): string {
  if (pathname.startsWith("/admin/products")) return "Products";
  if (pathname.startsWith("/admin/material-costing")) return "Material Costing";
  if (pathname.startsWith("/admin/rates")) return "Rate Master";
  if (pathname.startsWith("/admin/production")) return "Production";
  if (pathname.startsWith("/admin/orders")) return "Orders";
  if (pathname.startsWith("/admin/delivery-challans")) return "Delivery Challans";
  if (pathname === "/admin/reports" || pathname === "/admin/reports/") return "Reports";
  if (pathname.startsWith("/admin/reports/sales")) return "Sales summary";
  if (pathname.startsWith("/admin/reports/parties")) return "Party ranking";
  if (pathname.startsWith("/admin/reports/salespersons")) return "Salesperson performance";
  if (pathname.startsWith("/admin/reports/production")) return "Production";
  if (pathname.startsWith("/admin/reports/leads")) return "Lead funnel";
  if (pathname.startsWith("/admin/settings")) return "Settings";
  if (pathname.startsWith("/admin/reports/outstanding")) return "Outstanding";
  if (pathname.startsWith("/admin/reports/tax-invoice-outstanding")) return "Outstanding";
  if (pathname.startsWith("/admin/reports/other-order-outstanding")) return "Outstanding";
  if (pathname.startsWith("/admin/reports/collections")) return "Payments received";
  if (pathname.startsWith("/admin/parties")) return "Parties";
  if (pathname.startsWith("/admin/suppliers")) return "Suppliers";
  if (pathname.startsWith("/admin/materials")) return "Materials";
  if (pathname.startsWith("/admin/purchase-orders/new")) return "New Purchase Order";
  if (pathname.startsWith("/admin/purchase-orders") && pathname.includes("/receive")) return "Receive Material";
  if (pathname.startsWith("/admin/purchase-orders")) return "Purchase Orders";
  if (pathname.startsWith("/admin/goods-receipts")) return "Goods Receipts";
  if (pathname.startsWith("/admin/stock")) return "Stock";
  if (pathname.startsWith("/admin/purchase-returns")) return "Purchase Returns";
  if (pathname.startsWith("/admin/purchase-audit")) return "Purchase Audit";
  if (pathname.startsWith("/admin/reports/purchase")) return "Purchase Reports";
  if (pathname.startsWith("/admin/employees")) return "Employees";
  if (pathname.startsWith("/admin/sales")) return "Sales";
  if (pathname.startsWith("/admin/announcements")) return "Announcements";
  if (pathname.startsWith("/admin/designs")) return "Designs";
  if (pathname.startsWith("/admin/transport")) return "Transport";
  if (pathname.startsWith("/admin/brochure")) return "Brochure";
  if (pathname.startsWith("/admin/retail-followups")) return "Retail Follow-ups";
  if (pathname.startsWith("/admin/notification-test")) return "Notification Test";
  if (pathname.startsWith("/admin/data-cleanup")) return "Data Cleanup";
  if (pathname.startsWith("/admin/profile")) return "Profile";
  if (pathname.startsWith("/admin/dashboard")) return "Dashboard";
  return "Admin";
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
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
    if (role === "party") {
      router.replace("/party/dashboard");
      return;
    }
    if (role === "salesperson") {
      router.replace("/salesperson/dashboard");
      return;
    }
    if (role !== "admin") {
      router.replace("/auth/login");
    }
  }, [user, loading, router]);

  // Close menus on route change
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const role = String(user?.role || "").toLowerCase();
  if (loading || !user || role !== "admin") {
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

  const isActive = (href: string) => {
    const path =
      pathname.length > 1 && pathname.endsWith("/")
        ? pathname.slice(0, -1)
        : pathname;
    const h = href.length > 1 && href.endsWith("/") ? href.slice(0, -1) : href;
    return path === h || (h !== "/admin/dashboard" && path.startsWith(h));
  };

  const navLinkClass = (href: string) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
      isActive(href)
        ? "bg-[#330066]/10 text-[#330066]"
        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
    }`;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col bg-white border-r border-slate-200 z-30">
        <div className="flex items-center px-4 h-14 border-b border-slate-100">
          <Link href="/admin/dashboard" className="relative h-9 w-[150px] rounded-md overflow-hidden bg-black">
            <Image src="/synnera-logo.png" alt="Synnnera" fill className="object-contain object-left" sizes="150px" priority />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          <div>
            <Link href="/admin/dashboard" className={navLinkClass("/admin/dashboard")}>
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
          </div>

          <div>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Order Management
            </p>
            <div className="space-y-0.5">
              <Link href="/admin/orders" className={navLinkClass("/admin/orders")}>
                <ShoppingBag className="w-4 h-4" />
                Orders
              </Link>
              <Link href="/admin/invoices" className={navLinkClass("/admin/invoices")}>
                <FileText className="w-4 h-4" />
                <T>Invoices</T>
              </Link>
              <Link
                href="/admin/delivery-challans"
                className={navLinkClass("/admin/delivery-challans")}
              >
                <Truck className="w-4 h-4" />
                <T>Delivery Challans</T>
              </Link>
              <Link href="/admin/parties" className={navLinkClass("/admin/parties")}>
                <Users className="w-4 h-4" />
                Parties
              </Link>
              <Link href="/admin/suppliers" className={navLinkClass("/admin/suppliers")}>
                <Building2 className="w-4 h-4" />
                Suppliers
              </Link>
              <Link href="/admin/materials" className={navLinkClass("/admin/materials")}>
                <Package className="w-4 h-4" />
                <T>Materials</T>
              </Link>
              <Link href="/admin/purchase-orders" className={navLinkClass("/admin/purchase-orders")}>
                <ClipboardList className="w-4 h-4" />
                <T>Purchase Orders</T>
              </Link>
              <Link href="/admin/goods-receipts" className={navLinkClass("/admin/goods-receipts")}>
                <ClipboardList className="w-4 h-4" />
                <T>Goods Receipts</T>
              </Link>
              <Link href="/admin/stock" className={navLinkClass("/admin/stock")}>
                <Package className="w-4 h-4" />
                <T>Stock</T>
              </Link>
              <Link href="/admin/purchase-returns" className={navLinkClass("/admin/purchase-returns")}>
                <ClipboardList className="w-4 h-4" />
                <T>Purchase Returns</T>
              </Link>
              <Link href="/admin/purchase-audit" className={navLinkClass("/admin/purchase-audit")}>
                <ClipboardList className="w-4 h-4" />
                <T>Purchase Audit</T>
              </Link>
            </div>
          </div>

          <div>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Finance
            </p>
            <div className="space-y-0.5">
              <Link
                href="/admin/reports"
                className={navLinkClass("/admin/reports")}
              >
                <BarChart3 className="w-4 h-4" />
                <T>Reports</T>
              </Link>
            </div>
          </div>

          <div>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Sales
            </p>
            <div className="space-y-0.5">
              <Link href="/admin/sales" className={navLinkClass("/admin/sales")}>
                <Briefcase className="w-4 h-4" />
                Sales
              </Link>
            </div>
          </div>

          <div>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Production
            </p>
            <div className="space-y-0.5">
              <Link href="/admin/production" className={navLinkClass("/admin/production")}>
                <Factory className="w-4 h-4" />
                Production
              </Link>
              <Link href="/admin/employees" className={navLinkClass("/admin/employees")}>
                <HardHat className="w-4 h-4" />
                Employees
              </Link>
              <Link href="/admin/rates" className={navLinkClass("/admin/rates")}>
                <IndianRupee className="w-4 h-4" />
                Rate Master
              </Link>
                            <Link href="/admin/products" className={navLinkClass("/admin/products")}>
                <Package className="w-4 h-4" />
                <T>Products</T>
              </Link>
<Link href="/admin/material-costing" className={navLinkClass("/admin/material-costing")}>
                <Calculator className="w-4 h-4" />
                Material Costing
              </Link>
            </div>
          </div>

          <div>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Communication
            </p>
            <Link href="/admin/announcements" className={navLinkClass("/admin/announcements")}>
              <Megaphone className="w-4 h-4" />
              Announcements
            </Link>
            <Link href="/admin/notification-test" className={navLinkClass("/admin/notification-test")}>
              <Bell className="w-4 h-4" />
              Notification Test
            </Link>
          </div>

          <div>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Designs
            </p>
            <Link href="/admin/designs" className={navLinkClass("/admin/designs")}>
              <Palette className="w-4 h-4" />
              Designs
            </Link>
            <Link href="/admin/transport" className={navLinkClass("/admin/transport")}>
              <Truck className="w-4 h-4" />
              Transport
            </Link>
            <Link href="/admin/brochure" className={navLinkClass("/admin/brochure")}>
              <FileText className="w-4 h-4" />
              Brochure
            </Link>
          </div>
        </nav>

        <div className="border-t border-slate-100 p-3 space-y-0.5">
          <Link href="/admin/data-cleanup" className={navLinkClass("/admin/data-cleanup")}>
            <Trash2 className="w-4 h-4" />
            Data Cleanup
          </Link>
          <Link href="/admin/profile" className={navLinkClass("/admin/profile")}>
            <UserCircle className="w-4 h-4" />
            Profile
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="lg:pl-64">
        {/* Header */}
        <AppHeader
          homeHref="/admin/dashboard"
          notificationsHref="/admin/notifications"
          profileHref="/admin/profile"
          user={{ uid: user.uid, name: user.name, email: user.email }}
          onLogout={handleSignOut}
          title={pageTitle(pathname)}
        />

        <main className="p-4 lg:p-8 pb-24 lg:pb-8">{children}</main>
      </div>

      {/* Mobile bottom nav: Home | Orders | Production | More */}
      <AppBottomNav
        items={[
          { href: "/admin/dashboard", label: "Home", icon: LayoutDashboard },
          { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
          { href: "/admin/production", label: "Production", icon: Factory },
          { label: "More", icon: Menu, onClick: () => setMoreOpen(true) },
        ]}
      />

      {/* Mobile More sheet — plain Links (same pattern as V2.15.14, plus Finance) */}
      {moreOpen ? (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
            onClick={() => setMoreOpen(false)}
          />
          <div className="relative bg-white rounded-t-2xl shadow-xl max-h-[80vh] overflow-y-auto pb-safe">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 sticky top-0 bg-white z-10">
              <p className="font-semibold text-slate-900">
                <T>More</T>
              </p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="p-1 text-slate-400"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 space-y-0.5">
              {(
                [
                  { href: "/admin/sales", label: "Sales", icon: Briefcase },
                  {
                    href: "/admin/retail-followups",
                    label: "Retail Follow-ups",
                    icon: Phone,
                  },
                  { href: "/admin/invoices", label: "Invoices", icon: FileText },
                  {
                    href: "/admin/delivery-challans",
                    label: "Delivery Challans",
                    icon: Truck,
                  },
                ] as const
              ).map((item) => (
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

              <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <T>Finance</T>
              </p>
              {(
                [
                  {
                    href: "/admin/reports",
                    label: "Reports",
                    icon: BarChart3,
                  },
                ] as const
              ).map((item) => (
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

              {(
                [
                  { href: "/admin/parties", label: "Parties", icon: Users },
                  {
                    href: "/admin/suppliers",
                    label: "Suppliers",
                    icon: Building2,
                  },
                  {
                    href: "/admin/materials",
                    label: "Materials",
                    icon: Package,
                  },
                  {
                    href: "/admin/purchase-orders",
                    label: "Purchase Orders",
                    icon: ClipboardList,
                  },
                  {
                    href: "/admin/goods-receipts",
                    label: "Goods Receipts",
                    icon: ClipboardList,
                  },
                  {
                    href: "/admin/stock",
                    label: "Stock",
                    icon: Package,
                  },
                  {
                    href: "/admin/purchase-returns",
                    label: "Purchase Returns",
                    icon: ClipboardList,
                  },
                  {
                    href: "/admin/purchase-audit",
                    label: "Purchase Audit",
                    icon: ClipboardList,
                  },
                  {
                    href: "/admin/employees",
                    label: "Employees",
                    icon: HardHat,
                  },
                  { href: "/admin/rates", label: "Rate Master", icon: IndianRupee },
                  { href: "/admin/products", label: "Products", icon: Package },
                  {
                    href: "/admin/material-costing",
                    label: "Material Costing",
                    icon: Calculator,
                  },
                  {
                    href: "/admin/announcements",
                    label: "Announcements",
                    icon: Megaphone,
                  },
                  {
                    href: "/admin/notification-test",
                    label: "Notification Test",
                    icon: Bell,
                  },
                  { href: "/admin/designs", label: "Designs", icon: Palette },
                  { href: "/admin/transport", label: "Transport", icon: Truck },
                  { href: "/admin/brochure", label: "Brochure", icon: FileText },
                  { href: "/admin/data-cleanup", label: "Data Cleanup", icon: Trash2 },
                  { href: "/admin/profile", label: "Profile", icon: UserCircle },
                ] as const
              ).map((item) => (
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
      ) : null}
    </div>
  );
}