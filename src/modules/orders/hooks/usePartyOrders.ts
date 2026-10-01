"use client";

import { useCallback, useEffect, useState } from "react";
import type { Order } from "../orderTypes";
import {
  deleteOrder,
  fetchOrdersByParty,
} from "../services/ordersService";

export function usePartyOrders(partyId?: string | null) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!partyId) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const rows = await fetchOrdersByParty(partyId);
      setOrders(rows);
    } catch (e) {
      console.error(e);
      setError("Could not load orders. Check Firestore permissions.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [partyId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const remove = async (orderId: string) => {
    await deleteOrder(orderId);
    setOrders((list) => list.filter((o) => o.id !== orderId));
  };

  return { orders, loading, error, reload, remove };
}
