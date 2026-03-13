import { MapPin, ArrowRight, Crown, Star, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";
import { generateFirmSlug } from "@/lib/firmUtils";

type FirmCardProps = {
  id: string;
  company_name: string;
  city: string;
  district?: string | null;
  services: string[];
  description?: string | null;
  is_premium?: boolean;
  slug?: string | null;
  logo_url?: string | null;
  avg_rating?: number | null;
  review_count?: number | null;
  response_time?: string | null;
  gallery_images?: string[];
};

const FirmCard = ({
  id,
  company_name,
  city,
  district,
  services,
  description,
  is_premium,
  slug: dbSlug,
  logo_url,
  avg_rating,
  review_count,
  response_time,
  gallery_images,
}: FirmCardProps) => {
  const slug = dbSlug || generateFirmSlug(company_name, id);
  const previewImages = gallery_images?.slice(0, 3) ?? [];

  return (
    <div
      className={`rounded-xl border p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col relative overflow-hidden
        ${is_premium
          ? "bg-gradient-to-br from-[#fffbf0] to-[#fff9e6] dark:from-[hsl(43_30%_12%)] dark:to-[hsl(43_20%_10%)] premium-card-border"
          : "bg-card border-border"
        }`}
    >
      {/* Premium mini galeri */}
      {is_premium && previewImages.length > 0 && (
        <div className="flex gap-1 mb-4 -mx-6 -mt-6 h-24 overflow-hidden">
          {previewImages.map((url, i) => (
            <div
              key={i}
              className="flex-1 overflow-hidden relative group/img"
            >
              <Image
                src={url}
                alt={`${company_name} çalışma örneği`}
                fill
                sizes="(max-width: 768px) 33vw, 20vw"
                className="object-cover transition-transform duration-500 group-hover/img:scale-110"
              />
            </div>
          ))}
        </div>
      )}

      {/* Rozet grubu */}
      {is_premium && (
        <div className="absolute top-3 right-3 flex flex-col gap-1 items-end z-10">
          <Badge className="bg-accent text-white gap-1 text-xs shadow-sm">
            <Crown className="h-3 w-3" /> Premium
          </Badge>
          <Badge className="bg-emerald-500 text-white gap-1 text-xs shadow-sm">
            <CheckCircle className="h-3 w-3" /> Onaylı
          </Badge>
        </div>
      )}

      {/* Logo */}
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 overflow-hidden relative border border-border/50 transition-transform duration-300 group-hover:scale-105 ${is_premium ? "bg-accent/10" : "bg-secondary"}`}>
        {logo_url ? (
          <Image src={logo_url} alt={`${company_name} Logo`} fill sizes="56px" className="object-cover" />
        ) : (
          <span className="font-heading text-xl font-bold text-primary">{company_name[0]}</span>
        )}
      </div>

      {/* İsim */}
      <h3 className="font-heading text-lg font-semibold text-foreground mb-1">{company_name}</h3>

      {/* Rating chip - sadece veri varsa */}
      {is_premium && avg_rating && review_count ? (
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-full px-2 py-0.5 text-xs font-medium">
            <Star className="h-3 w-3 fill-current" />
            {avg_rating.toFixed(1)}
            <span className="text-yellow-600/70 dark:text-yellow-500/70">({review_count} yorum)</span>
          </div>
        </div>
      ) : null}

      {/* Konum */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
        <MapPin className="h-3.5 w-3.5" />
        {city}{district ? ` / ${district}` : ""}
      </div>

      {/* Response time - sadece veri varsa */}
      {is_premium && response_time && (
        <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 mb-2">
          <Clock className="h-3 w-3" />
          {response_time}
        </div>
      )}

      {description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{description}</p>
      )}

      <div className="flex flex-wrap gap-1.5 mb-4">
        {services.slice(0, 3).map((s) => (
          <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
        ))}
        {services.length > 3 && <Badge variant="outline" className="text-xs">+{services.length - 3}</Badge>}
      </div>

      <div className="mt-auto">
        <Link href={`/firma/${slug}`} className="block">
          <Button variant="outline" size="sm" className="w-full">
            Firmayı İncele <ArrowRight className="h-3.5 w-3.5 ml-1 transition-transform duration-300 group-hover:translate-x-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default FirmCard;
