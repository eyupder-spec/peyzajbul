"use client";

import { Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LEAD_PRICE_UNKNOWN_LABEL, formatLeadPrice, hasLeadPrice } from "@/lib/pricing";
import { MAX_LEAD_BUYERS, type Lead } from "./leadHelpers";

interface LeadPriceButtonProps {
  lead: Lead;
  /** null = sayı bilinmiyor; düğme yalnızca sayı kontenjanı gösterdiğinde 'Tükendi' olur. */
  purchaseCount: number | null;
  busy: boolean;
  onBuy: (lead: Lead) => void;
  variant?: "default" | "accent";
  prefix?: string;
  className?: string;
  id?: string;
}

/**
 * Lead satın alma düğmesi. Fiyat her zaman lead'in kendi `token_price` değeridir: fiyat yoksa
 * düğme devre dışı kalır ve 'Fiyat belirleniyor' yazar (sessiz bir varsayılan fiyat yoktur).
 */
export function LeadPriceButton({
  lead,
  purchaseCount,
  busy,
  onBuy,
  variant = "default",
  prefix,
  className = "",
  id,
}: LeadPriceButtonProps) {
  const base = `h-auto min-h-11 whitespace-normal text-center leading-tight ${className}`;

  if (purchaseCount !== null && purchaseCount >= MAX_LEAD_BUYERS) {
    return (
      <Button size="sm" disabled className={base} id={id}>
        Tükendi
      </Button>
    );
  }

  if (!hasLeadPrice(lead.token_price)) {
    return (
      <Button size="sm" disabled className={base} id={id}>
        {LEAD_PRICE_UNKNOWN_LABEL}
      </Button>
    );
  }

  return (
    <Button size="sm" variant={variant} className={base} disabled={busy} onClick={() => onBuy(lead)} id={id}>
      <Coins className="h-4 w-4" />
      <span>
        {prefix}
        {formatLeadPrice(lead.token_price)}
      </span>
    </Button>
  );
}
