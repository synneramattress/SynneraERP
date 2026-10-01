"use client";
import { T } from "@/i18n";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const router = useRouter();
  const { user, statusError } = useAuth();

  useEffect(() => {
    if (user) {
      const role = String(user.role || "").toLowerCase();
      if (role === "admin") router.replace("/admin/dashboard");
      else if (role === "employee") router.replace("/employee/dashboard");
      else if (role === "party") router.replace("/party/dashboard");
      else if (role === "salesperson") router.replace("/salesperson/dashboard");
      else router.replace("/auth/login");
    }
  }, [user, router]);

  useEffect(() => {
    if (statusError) {
      setError(statusError);
    }
  }, [statusError]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      const userDoc = await getDoc(doc(db, "users", result.user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const role = String(userData.role || "").toLowerCase();
        const status = String(userData.status || "").toUpperCase();
        if (
          (role === "party" || role === "employee" || role === "salesperson") &&
          status === "INACTIVE"
        ) {
          setError(`Your ${role} account is inactive. Please contact Synnera Admin.`);
          await signOut(auth);
          return;
        }
        if (role === "admin") {
          router.push("/admin/dashboard");
        } else if (role === "employee") {
          router.push("/employee/dashboard");
        } else if (role === "party") {
          router.push("/party/dashboard");
        } else if (role === "salesperson") {
          router.push("/salesperson/dashboard");
        } else {
          await signOut(auth);
          setError("Your account role is not recognized. Please contact Synnera Admin.");
        }
      } else {
        // Never grant access when Firebase Auth has no Synnera user profile.
        await signOut(auth);
        setError("Your account is not provisioned in Synnera. Please contact Synnera Admin.");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError("Invalid email or password. If you do not have an account, please contact Synnera Admin.");
      } else {
        setError(err.message || "Failed to login. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your registered email address.");
      return;
    }
    setError("");
    setMessage("");
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMessage("Password reset email sent! Check your inbox.");
      setResetMode(false);
    } catch (err: any) {
      setError(err.message || "Failed to send password reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-purple-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-100">\n        <div className="flex justify-end mb-3"><LanguageSwitcher compact /></div>
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#330066] rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
            <span className="text-white text-2xl font-bold">S</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight"><T>SYNNERA</T></h1>
          <p className="text-sm font-medium text-[#330066] tracking-wide uppercase mt-0.5"><T>Order Management System</T></p>
        </div>

        {error && (
          <div
            data-testid="login-error"
            className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium leading-snug"
          >
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-medium leading-snug">
            {message}
          </div>
        )}

        {!resetMode ? (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email" data-testid="login-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#330066] focus:border-[#330066] outline-none text-slate-900 bg-white"
                placeholder="registered@email.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => { setResetMode(true); setError(""); setMessage(""); }}
                  className="text-xs font-semibold text-[#330066] hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <input
                type="password" data-testid="login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#330066] focus:border-[#330066] outline-none text-slate-900 bg-white"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#330066] hover:bg-[#25004d] text-white font-semibold py-3 rounded-xl transition shadow-md disabled:opacity-60 text-sm"
             data-testid="login-submit">
              {loading ? "Logging in..." : "LOGIN"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Registered Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#330066] outline-none"
                placeholder="registered@email.com"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setResetMode(false); setError(""); }}
                className="flex-1 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-2.5 rounded-xl text-sm"
              >
                Back to Login
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-[#330066] hover:bg-[#25004d] text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-60"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-slate-200 text-center space-y-2">
          <p className="text-xs text-slate-600 font-medium">
            Party accounts are created by Synnera Admin.
          </p>
          <p className="text-xs text-slate-500">
            Please contact Synnera to get access.
          </p>
        </div>
      </div>
    </div>
  );
}