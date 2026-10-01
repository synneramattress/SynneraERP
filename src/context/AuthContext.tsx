"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { onAuthStateChanged, User as FirebaseUser, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import type { User, UserIdentity } from "@/types/identity";
import {
  clearCachedFcmToken,
  getCachedFcmToken,
  getFcmToken,
  getNotificationPermission,
} from "@/modules/notifications/services/messaging";
import {
  deactivateNotificationToken,
  registerNotificationToken,
} from "@/modules/notifications/services/notificationTokenService";

interface AuthContextType {
  /** Full users/{uid} document (identity + optional party/employee fields). */
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  statusError: string | null;
}

/** Narrow helper — core identity fields only */
export function toUserIdentity(user: User): UserIdentity {
  return {
    uid: user.uid,
    email: user.email,
    name: user.name,
    role: user.role,
    phone: user.phone,
    company: user.company,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
  logout: async () => {},
  statusError: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const tokenRefreshUid = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      setStatusError(null);

      if (fbUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", fbUser.uid));
          if (userDoc.exists()) {
            const rawData = userDoc.data() || {};
            const userAccount: User = {
              ...(rawData as Omit<User, "uid">),
              uid: fbUser.uid,
              role: String(rawData.role || "").toLowerCase() as User["role"],
              status: rawData.status
                ? (String(rawData.status).toUpperCase() as User["status"])
                : rawData.status,
              compensationType: rawData.compensationType
                ? String(rawData.compensationType)
                : "REGULAR_SALARY",
            };

            // Block inactive party, employee, or salesperson accounts
            if (
              (userAccount.role === "party" ||
                userAccount.role === "employee" ||
                userAccount.role === "salesperson") &&
              userAccount.status === "INACTIVE"
            ) {
              const roleLabel =
                userAccount.role === "employee"
                  ? "employee"
                  : userAccount.role === "salesperson"
                    ? "salesperson"
                    : "party";
              setStatusError(
                `Your ${roleLabel} account has been deactivated by Synnera Admin. Please contact Synnera for access.`
              );
              await signOut(auth);
              setUser(null);
            } else {
              setUser(userAccount);
            }
          } else {
            setStatusError(
              "Your account is not provisioned in Synnera. Please contact Synnera Admin."
            );
            await signOut(auth);
            setUser(null);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /**
   * Phase 1: if notification permission already granted, refresh FCM token
   * and re-register under users/{uid}/notificationTokens (no auto-prompt).
   */
  useEffect(() => {
    if (!user?.uid) {
      tokenRefreshUid.current = null;
      return;
    }
    if (tokenRefreshUid.current === user.uid) return;
    if (typeof window === "undefined") return;
    if (getNotificationPermission() !== "granted") return;

    tokenRefreshUid.current = user.uid;
    const uid = user.uid;

    (async () => {
      try {
        const token = await getFcmToken();
        if (!token) return;
        await registerNotificationToken({
          userId: uid,
          token,
          device: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
          },
        });
      } catch (e) {
        console.warn("[FCM] token refresh on login failed:", e);
      }
    })();
  }, [user?.uid]);

  const logout = async () => {
    // Deactivate this device token before sign-out (best-effort)
    try {
      const uid = user?.uid;
      const token = getCachedFcmToken();
      if (uid && token) {
        await deactivateNotificationToken(uid, token);
      }
      clearCachedFcmToken();
    } catch (e) {
      console.warn("[FCM] token deactivate on logout failed:", e);
    }
    tokenRefreshUid.current = null;
    await signOut(auth);
    setUser(null);
    setStatusError(null);
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, logout, statusError }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
