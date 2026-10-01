/**
 * FCM token persistence — users/{userId}/notificationTokens/{tokenId}
 * Independent of Orders / Production documents.
 */

"use client";

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { NOTIFICATION_TOKENS_SUBCOLLECTION } from "../constants/notificationConstants";
import type {
  NotificationTokenRecord,
  RegisterTokenInput,
} from "../types/notificationTypes";

function tokensCol(userId: string) {
  return collection(db, "users", userId, NOTIFICATION_TOKENS_SUBCOLLECTION);
}

/** Stable document id derived from token (avoids duplicate docs for same token). */
function tokenDocId(token: string): string {
  // Firestore doc ids: avoid "/" and keep length reasonable
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    hash = (hash << 5) - hash + token.charCodeAt(i);
    hash |= 0;
  }
  const suffix = Math.abs(hash).toString(36);
  return `fcm_${suffix}_${token.slice(-12).replace(/[^a-zA-Z0-9]/g, "")}`;
}

/**
 * Register or refresh an FCM token for the user.
 * Safe to call repeatedly with the same token.
 */
export async function registerNotificationToken(
  input: RegisterTokenInput
): Promise<string | null> {
  const { userId, token, device } = input;
  if (!userId || !token) return null;

  const id = tokenDocId(token);
  const ref = doc(db, "users", userId, NOTIFICATION_TOKENS_SUBCOLLECTION, id);

  try {
    await setDoc(
      ref,
      {
        token,
        userId,
        platform: device?.platform || (typeof navigator !== "undefined" ? navigator.platform : ""),
        userAgent:
          device?.userAgent ||
          (typeof navigator !== "undefined" ? navigator.userAgent : ""),
        language:
          device?.language ||
          (typeof navigator !== "undefined" ? navigator.language : ""),
        active: true,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
    return id;
  } catch (err) {
    console.error("[FCM] registerNotificationToken failed:", err);
    return null;
  }
}

/** Mark a token inactive (e.g. on logout or permission revoked). */
export async function deactivateNotificationToken(
  userId: string,
  token: string
): Promise<void> {
  if (!userId || !token) return;
  const id = tokenDocId(token);
  const ref = doc(db, "users", userId, NOTIFICATION_TOKENS_SUBCOLLECTION, id);
  try {
    await updateDoc(ref, {
      active: false,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    // Doc may not exist — try delete as fallback is unnecessary
    console.warn("[FCM] deactivateNotificationToken:", err);
  }
}

/** Remove token document entirely. */
export async function deleteNotificationToken(
  userId: string,
  token: string
): Promise<void> {
  if (!userId || !token) return;
  const id = tokenDocId(token);
  try {
    await deleteDoc(
      doc(db, "users", userId, NOTIFICATION_TOKENS_SUBCOLLECTION, id)
    );
  } catch (err) {
    console.warn("[FCM] deleteNotificationToken:", err);
  }
}

/** List active tokens for a user (admin / diagnostics / Phase 2 send). */
export async function listActiveNotificationTokens(
  userId: string
): Promise<NotificationTokenRecord[]> {
  if (!userId) return [];
  try {
    const snap = await getDocs(
      query(tokensCol(userId), where("active", "==", true))
    );
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        token: String(data.token || ""),
        userId: String(data.userId || userId),
        platform: data.platform,
        userAgent: data.userAgent,
        language: data.language,
        active: data.active !== false,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } as NotificationTokenRecord;
    });
  } catch (err) {
    console.error("[FCM] listActiveNotificationTokens failed:", err);
    return [];
  }
}
