"use client";

import FounderSlots from "./FounderSlots";
import { useFounderSlots } from "./useFounderSlots";
import PricingCta from "./PricingCta";

interface FounderCardProps {
  name: string;
  priceLabel: string;
  unit: string;
  taxLabel: string;
  normalPriceLine: string;
  renewalLine: string | null;
  cap: number;
  features: string[];
  cta: string;
}

/**
 * Kurucu Üye kartı. Sunucuda sayısız ('Sınırlı kontenjan') çizilir; kontenjan tükenmişse
 * (remaining <= 0) kart istemcide gizlenir.
 */
export default function FounderCard({
  name,
  priceLabel,
  unit,
  taxLabel,
  normalPriceLine,
  renewalLine,
  cap,
  features,
  cta,
}: FounderCardProps) {
  const slots = useFounderSlots(cap);

  if (slots && slots.remaining <= 0) return null;

  return (
    <article className="flex flex-col rounded-xl border border-primary bg-card p-6 shadow-card ring-1 ring-primary">
      <h3 className="font-heading text-xl font-semibold text-foreground">{name}</h3>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="font-heading text-4xl text-foreground">{priceLabel}</span>
        <span className="text-muted-foreground">/{unit}</span>
      </div>
      <p className="text-xs text-muted-foreground">{taxLabel}</p>
      <p className="mt-3 text-sm text-muted-foreground">{normalPriceLine}</p>
      {renewalLine && <p className="text-sm text-muted-foreground">{renewalLine}</p>}
      <div className="mt-3">
        <FounderSlots cap={cap} slots={slots} />
      </div>
      <ul className="my-5 space-y-2 text-sm text-foreground">
        {features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <span aria-hidden="true" className="text-verified">
              ✓
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <PricingCta className="mt-auto" signedInHref="/firma/premium?plan=founder" label={cta} variant="accent" showLogin />
    </article>
  );
}
