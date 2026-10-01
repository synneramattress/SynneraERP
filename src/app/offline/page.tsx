"use client";
import { T } from "@/i18n";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";

export default function OfflinePage() {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
          <WifiOff className="w-8 h-8 text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900"><T>You are offline</T></h1>
          <p className="text-slate-500 mt-2 text-sm leading-relaxed">
            Orders you create offline are saved on this device and will
            automatically sync when you reconnect.
          </p>
        </div>
        {online ? (
          <p className="text-sm text-emerald-600 font-medium">
            Connection restored — reloading…
          </p>
        ) : (
          <p className="text-sm text-slate-400"><T>Waiting for network…</T></p>
        )}
        <button
          onClick={() => window.location.assign("/")}
          className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-white font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      </div>
    </div>
  );
}