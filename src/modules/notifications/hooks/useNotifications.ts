"use client";

import { useCallback, useEffect, useState } from "react";
import type { Notification } from "../types/inAppNotification";
import {
  countUnread,
  markNotificationRead,
  subscribeUserNotifications,
} from "../services/notificationsService";

export function useNotifications(userId?: string | null) {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      setError("");
      return;
    }

    setLoading(true);
    setError("");

    const unsub = subscribeUserNotifications(
      userId,
      (rows) => {
        setItems(rows);
        setLoading(false);
      },
      () => {
        setError("Could not load notifications.");
        setItems([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [userId]);

  const reload = useCallback(() => {
    // Live subscription keeps data fresh; no-op kept for API compat.
  }, []);

  const markRead = async (n: Notification) => {
    if (n.read) return;
    try {
      await markNotificationRead(n.id);
      setItems((list) =>
        list.map((x) => (x.id === n.id ? { ...x, read: true } : x))
      );
    } catch (e) {
      console.error(e);
    }
  };

  return {
    items,
    loading,
    error,
    unreadCount: countUnread(items),
    markRead,
    reload,
  };
}
