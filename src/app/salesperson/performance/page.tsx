"use client";
import { T } from "@/i18n";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  fetchProspectsForSalesperson,
  fetchFollowUpsForSalesperson,
  type Prospect,
  type SalesFollowUp,
} from "@/modules/sales";

export default function SalesPerformancePage() {
  const { user } = useAuth();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [followUps, setFollowUps] = useState<SalesFollowUp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      try {
        const [p, f] = await Promise.all([
          fetchProspectsForSalesperson(user.uid),
          fetchFollowUpsForSalesperson(user.uid),
        ]);
        setProspects(p);
        setFollowUps(f);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.uid]);

  const stats = useMemo(() => {
    const st = (s: string) => prospects.filter((p) => p.status === s).length;
    return {
      total: prospects.length,
      neu: st("NEW"),
      interested: st("INTERESTED"),
      converted: st("CONVERTED") + st("CONVERSION_REQUESTED"),
      pendingFu: followUps.filter((f) => f.status === "pending").length,
      completedFu: followUps.filter((f) => f.status === "completed").length,
    };
  }, [prospects, followUps]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-[#330066] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const cards = [
    [stats.total, "Total Prospects"],
    [stats.neu, "New Prospects"],
    [stats.interested, "Interested"],
    [stats.converted, "Converted"],
    [stats.pendingFu, "Pending Follow-ups"],
    [stats.completedFu, "Completed Follow-ups"],
  ] as const;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold"><T>Performance</T></h1>
        <p className="text-sm text-slate-500"><T>Your field sales summary</T></p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {cards.map(([v, label]) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 p-3 text-center">
            <p className="text-xl font-bold text-[#330066]">{v}</p>
            <p className="text-[11px] text-slate-500"><T>{label}</T></p>
          </div>
        ))}
      </div>
    </div>
  );
}
