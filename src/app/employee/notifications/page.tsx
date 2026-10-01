"use client";

import { useAuth } from "@/context/AuthContext";
import {
  NotificationsList,
  useNotifications,
} from "@/modules/notifications";

export default function NotificationsPage() {
  const { user } = useAuth();
  const { items, loading, error, markRead } = useNotifications(user?.uid);

  return (
    <NotificationsList
      homeHref="/employee/dashboard"
      items={items}
      loading={loading}
      error={error}
      onMarkRead={markRead}
    />
  );
}
