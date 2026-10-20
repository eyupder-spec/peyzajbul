"use client";

import type { FounderSlots as FounderSlotsData } from "@/app/firma/panel/firmStats";

interface FounderSlotsProps {
  cap: number;
  slots: FounderSlotsData | null;
}

/** 'Kalan kontenjan X/25'. Sayı bilinmiyorsa yalnızca 'Sınırlı kontenjan' yazılır, sayı uydurulmaz. */
export default function FounderSlots({ cap, slots }: FounderSlotsProps) {
  return (
    <p className="text-sm font-medium text-foreground">
      {slots ? `Kalan kontenjan ${slots.remaining}/${slots.cap}` : `Sınırlı kontenjan (ilk ${cap} firma)`}
    </p>
  );
}
