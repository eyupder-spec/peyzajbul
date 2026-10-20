"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { formatNumber, hasLeadPrice } from "@/lib/pricing";
import { purchaseLead, type Lead } from "./leadHelpers";

interface UseLeadPurchaseOptions {
  coinBalance: number;
  onBalanceChange: (balance: number) => void;
  /** Satın alma sonrası lead listesini yeniler (iletişim bilgileri açılır). */
  reload: () => Promise<void>;
}

/**
 * Lead satın alma akışı. Kontrol lead'in kendi `token_price` değerine göredir:
 * fiyat yoksa işlem yapılmaz, bakiye fiyattan azsa jeton sayfasına yönlendirilir.
 */
export function useLeadPurchase({ coinBalance, onBalanceChange, reload }: UseLeadPurchaseOptions) {
  const router = useRouter();
  const { toast } = useToast();
  const [purchasing, setPurchasing] = useState(false);

  const buy = async (lead: Lead) => {
    if (!hasLeadPrice(lead.token_price)) return;
    if (coinBalance < lead.token_price) {
      toast({ title: "Yetersiz Jeton", description: "Bu lead için jeton yüklemeniz gerekiyor.", variant: "destructive" });
      router.push("/firma/jeton");
      return;
    }

    setPurchasing(true);
    try {
      const result = await purchaseLead(lead.id);
      if (!result.ok) {
        toast({ title: "Hata", description: result.message, variant: "destructive" });
        if (result.code === "insufficient_balance") router.push("/firma/jeton");
        return;
      }
      onBalanceChange(result.newBalance);
      toast({ title: "Lead açıldı!", description: `Kalan bakiye: ${formatNumber(result.newBalance)} jeton` });
      await reload();
    } finally {
      setPurchasing(false);
    }
  };

  return { purchasing, buy };
}
