import { Building2, Users, MapPinned } from "lucide-react";

const stats = [
  { icon: Building2, value: "250+", label: "Kayıtlı Firma" },
  { icon: Users, value: "4.500+", label: "Başarılı Eşleşme" },
  { icon: MapPinned, value: "81", label: "İl Genelinde" },
];

const TrustBadges = () => {
  return (
    <section className="py-16 bg-primary">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto text-center">
          {stats.map((stat, i) => (
            <div key={i} className="flex flex-col items-center">
              <stat.icon className="h-8 w-8 text-accent mb-3" />
              <div className="font-heading text-3xl font-bold text-primary-foreground">{stat.value}</div>
              <div className="text-primary-foreground/70 text-sm font-body mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustBadges;
