import { MapPin, ArrowRight, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
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
};

const FirmCard = ({ id, company_name, city, district, services, description, is_premium, slug: dbSlug }: FirmCardProps) => {
  const slug = dbSlug || generateFirmSlug(company_name, id);

  return (
    <div className={`bg-card rounded-lg border p-6 hover:shadow-lg transition-shadow group flex flex-col relative ${is_premium ? "border-primary/50 ring-1 ring-primary/20" : "border-border"}`}>
      {is_premium && (
        <div className="absolute top-3 right-3">
          <Badge className="bg-primary text-primary-foreground gap-1 text-xs">
            <Crown className="h-3 w-3" /> Premium
          </Badge>
        </div>
      )}
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${is_premium ? "bg-primary/10" : "bg-secondary"}`}>
        <span className="font-heading text-lg font-bold text-primary">{company_name[0]}</span>
      </div>
      <h3 className="font-heading text-lg font-semibold text-foreground mb-1">{company_name}</h3>
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
        <MapPin className="h-3.5 w-3.5" />
        {city}{district ? ` / ${district}` : ""}
      </div>
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
        <Link to={`/firma/${slug}`}>
          <Button variant="outline" size="sm" className="w-full group-hover:border-primary group-hover:text-primary transition-colors">
            Firmayı İncele <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default FirmCard;
