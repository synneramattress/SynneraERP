"use client";
import { T } from "@/i18n";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/auth/login");
      } else {
        const role = String(user.role || "").toLowerCase();
        if (role === "admin") router.replace("/admin/dashboard");
        else if (role === "employee") router.replace("/employee/dashboard");
        else if (role === "party") router.replace("/party/dashboard");
        else if (role === "salesperson") router.replace("/salesperson/dashboard");
        else router.replace("/auth/login");
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600"><T>Loading Mattress Order...</T></p>
      </div>
    </div>
  );
}