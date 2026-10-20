"use client";

import { useEffect, useState } from "react";
import { fetchFounderSlots, type FounderSlots } from "@/app/firma/panel/firmStats";

/** Kurucu Üye kontenjanını okur (rpc get_founder_slots). RPC yoksa veya hata verirse null. */
export function useFounderSlots(cap: number): FounderSlots | null {
  const [slots, setSlots] = useState<FounderSlots | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchFounderSlots(cap).then((result) => {
      if (!cancelled) setSlots(result);
    });
    return () => {
      cancelled = true;
    };
  }, [cap]);

  return slots;
}
