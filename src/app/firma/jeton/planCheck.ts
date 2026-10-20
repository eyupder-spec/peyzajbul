import { COIN_PACKS, PRO_PLANS } from "@/lib/pricing";
import { queryUntyped } from "@/app/firma/panel/rpc";

interface PricingPlanRow {
  id: string;
  kind: string;
  coins: number | null;
  unit_amount_minor: number;
  currency: string;
  billing_interval: string | null;
  active: boolean;
}

const MINOR_PER_TRY = 100;

/**
 * Ekranda gösterilen fiyatla ödemede tahsil edilecek fiyatın (pricing_plans, checkout fonksiyonları
 * bunu okur) aynı olduğunu doğrular. Satırı eksik, pasif veya farklı olan paket/plan id'lerini döner;
 * arayüz bunları satışa açmaz. Tablo okunamazsa null döner (sunucu doğrulaması yine de geçerlidir).
 */
export async function findPlanMismatches(): Promise<Set<string> | null> {
  const { data, error } = await queryUntyped<PricingPlanRow[]>("pricing_plans", (q) =>
    q.select("id, kind, coins, unit_amount_minor, currency, billing_interval, active"),
  );
  if (error || !Array.isArray(data)) return null;

  const rows = new Map(data.map((row) => [row.id, row]));
  const mismatched = new Set<string>();

  for (const pack of COIN_PACKS) {
    const row = rows.get(pack.id);
    if (
      !row ||
      !row.active ||
      row.kind !== "coin_pack" ||
      row.currency !== "try" ||
      row.unit_amount_minor !== pack.priceTRY * MINOR_PER_TRY ||
      row.coins !== pack.totalJeton
    ) {
      mismatched.add(pack.id);
    }
  }

  for (const plan of PRO_PLANS) {
    const row = rows.get(plan.id);
    if (
      !row ||
      !row.active ||
      row.kind !== "pro_sub" ||
      row.currency !== "try" ||
      row.unit_amount_minor !== plan.priceTRY * MINOR_PER_TRY ||
      row.billing_interval !== plan.interval
    ) {
      mismatched.add(plan.id);
    }
  }

  return mismatched;
}
