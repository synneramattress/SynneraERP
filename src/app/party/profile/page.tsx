"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import ProfilePageShell from "@/components/profile/ProfilePageShell";
import { NotificationTestPanel } from "@/modules/notifications";

export default function PartyProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace("/auth/login");
  };

  const u = user as any;

  return (
    <ProfilePageShell
      name={user?.name}
      email={user?.email}
      roleLabel="Party"
      fields={[
        { label: "Phone", value: user?.phone },
        { label: "Shop / Company", value: u?.shopName || user?.company },
        { label: "City", value: u?.city },
        {
          label: "Dealer / Distributor",
          value: (() => {
            const raw = String(
              u?.partyCategory || u?.rateCategory || u?.category || ""
            ).trim();
            if (!raw) return "—";
            const lower = raw.toLowerCase();
            if (lower.includes("distribut")) return "Distributor";
            if (lower.includes("dealer")) return "Dealer";
            return raw.charAt(0).toUpperCase() + raw.slice(1);
          })(),
        },
      ]}
      onLogout={handleLogout}
    >
      <NotificationTestPanel userId={user?.uid} compact />
    </ProfilePageShell>
  );
}
