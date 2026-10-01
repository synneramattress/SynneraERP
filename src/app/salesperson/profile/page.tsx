"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import ProfilePageShell from "@/components/profile/ProfilePageShell";

export default function SalespersonProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace("/auth/login");
  };

  const u = user as { mobile?: string; salespersonCode?: string; city?: string };

  return (
    <ProfilePageShell
      name={user?.name}
      email={user?.email}
      roleLabel="Salesperson"
      fields={[
        { label: "Mobile", value: u?.mobile || user?.phone },
        { label: "City", value: u?.city },
        { label: "Salesperson code", value: u?.salespersonCode },
        { label: "Status", value: user?.status || "ACTIVE" },
      ]}
      onLogout={handleLogout}
    />
  );
}
