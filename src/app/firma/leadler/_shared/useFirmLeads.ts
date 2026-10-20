"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { queryUntyped } from "@/app/firma/panel/rpc";
import {
  loadOutcomes,
  loadOwnPurchasedIds,
  loadPurchaseCounts,
  loadRefundStatuses,
  type Lead,
  type LeadOutcomeInfo,
} from "./leadHelpers";

export interface FirmLeadsState {
  leads: Lead[];
  purchasedIds: Set<string>;
  /** null = sayılar alınamadı; FOMO satırı gösterilmez. */
  purchaseCounts: Record<string, number> | null;
  outcomes: Record<string, LeadOutcomeInfo>;
  refundStatuses: Record<string, string>;
  loading: boolean;
  loadError: boolean;
}

const INITIAL_STATE: FirmLeadsState = {
  leads: [],
  purchasedIds: new Set(),
  purchaseCounts: null,
  outcomes: {},
  refundStatuses: {},
  loading: true,
  loadError: false,
};

/**
 * Firmanın lead listesi ve satın alma bilgileri. Gerçek zamanlı kanal firma başına YALNIZCA BİR KEZ
 * açılır (kendi effect'inde, temizlikte kaldırılır); olaylar yalnızca idempotent `reload`'ı çağırır.
 * `channelName` her sayfa için sabittir (DevTools'ta tek `join` görünmelidir).
 */
export function useFirmLeads(
  userId: string | null,
  firmId: string | null,
  channelName: string,
  onNewAssignment?: () => void,
) {
  const [state, setState] = useState<FirmLeadsState>(INITIAL_STATE);
  const userIdRef = useRef<string | null>(userId);
  const newAssignmentRef = useRef(onNewAssignment);
  const requestRef = useRef(0);

  useEffect(() => {
    userIdRef.current = userId;
    newAssignmentRef.current = onNewAssignment;
  }, [userId, onNewAssignment]);

  const reload = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) return;
    const request = ++requestRef.current;

    const { data, error } = await queryUntyped<Lead[]>("leads_for_firms", (q) =>
      q.select("*").order("created_at", { ascending: false }),
    );
    if (request !== requestRef.current) return;
    if (error || !Array.isArray(data)) {
      setState((prev) => ({ ...prev, loading: false, loadError: true }));
      return;
    }

    const [ownPurchased, purchaseCounts, outcomes, refundStatuses] = await Promise.all([
      loadOwnPurchasedIds(uid),
      loadPurchaseCounts(data),
      loadOutcomes(uid),
      loadRefundStatuses(),
    ]);
    if (request !== requestRef.current) return;

    // Görünüm `is_purchased` veriyorsa (WP05) ona da güvenilir; eski görünümde kendi satın alma satırları yeterlidir.
    const purchasedIds = new Set(ownPurchased);
    for (const lead of data) {
      if (lead.is_purchased === true) purchasedIds.add(lead.id);
    }

    setState({ leads: data, purchasedIds, purchaseCounts, outcomes, refundStatuses, loading: false, loadError: false });
  }, []);

  useEffect(() => {
    if (userId) void reload();
  }, [userId, reload]);

  useEffect(() => {
    if (!firmId) return;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lead_assignments", filter: `firm_id=eq.${firmId}` },
        (payload) => {
          if (payload.eventType === "INSERT") newAssignmentRef.current?.();
          void reload();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [firmId, channelName, reload]);

  return { ...state, reload };
}
