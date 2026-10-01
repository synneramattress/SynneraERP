"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/**
 * Legacy URL — Ready to Dispatch detail is now on party order page.
 */
export default function PartyReadyDetailRedirect() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.orderId as string;

  useEffect(() => {
    if (orderId) {
      router.replace(`/party/orders/${orderId}`);
    } else {
      router.replace("/party/ready-to-dispatch");
    }
  }, [orderId, router]);

  return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-[#330066] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
