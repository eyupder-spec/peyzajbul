import { Building2, MapPinned, Send, ShieldCheck, Star, type LucideIcon } from "lucide-react";
import { formatAsOf, visibleStatItems, type PublicStatKey, type PublicStats } from "@/lib/publicStats";

interface TrustBadgesProps {
  stats: PublicStats | null;
  /** "dark" expects a bg-primary parent (hero), "light" sits on white or muted backgrounds. */
  variant?: "dark" | "light";
  className?: string;
}

const ICONS: Record<PublicStatKey, LucideIcon> = {
  firms: Building2,
  cities: MapPinned,
  claimed: ShieldCheck,
  reviews: Star,
  leads30d: Send,
};

const TrustBadges = ({ stats, variant = "dark", className = "" }: TrustBadgesProps) => {
  if (!stats) return null;
  const items = visibleStatItems(stats);
  if (items.length === 0) return null;

  const dark = variant === "dark";

  return (
    <div className={`text-center ${dark ? "text-primary-foreground" : "text-foreground"} ${className}`}>
      <div className="flex flex-wrap justify-center gap-x-10 gap-y-6">
        {items.map((item) => {
          const Icon = ICONS[item.key];
          return (
            <div key={item.key} className="flex flex-col items-center min-w-[7rem]">
              <Icon className="h-6 w-6 text-accent mb-2" />
              <div className="font-heading text-2xl md:text-3xl font-bold">
                {item.value.toLocaleString("tr-TR")}
              </div>
              <div
                className={`text-xs md:text-sm font-body mt-0.5 ${
                  dark ? "text-primary-foreground/70" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
      <p
        className={`mt-6 max-w-2xl mx-auto text-xs font-body ${
          dark ? "text-primary-foreground/60" : "text-muted-foreground"
        }`}
      >
        Firma bilgileri kamuya açık kaynaklardan derlenir; sahiplenen profiller yönetici onayından geçer. Son güncelleme:{" "}
        {formatAsOf(stats.asOf)}
      </p>
    </div>
  );
};

export default TrustBadges;
