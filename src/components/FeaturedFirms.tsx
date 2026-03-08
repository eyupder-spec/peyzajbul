import { Star, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const firms = [
  { name: "Yeşil Doğa Peyzaj", city: "İstanbul", rating: 4.8, specialty: ["Bahçe Tasarımı", "Sulama Sistemleri"] },
  { name: "Anatolia Peyzaj", city: "Ankara", rating: 4.6, specialty: ["Kentsel Peyzaj", "Park Düzenleme"] },
  { name: "Ege Peyzaj Mimarlık", city: "İzmir", rating: 4.9, specialty: ["Havuz Çevresi", "Çatı Bahçesi"] },
  { name: "Karadeniz Yeşilçam", city: "Trabzon", rating: 4.5, specialty: ["Doğal Peyzaj", "Ağaçlandırma"] },
  { name: "Akdeniz Bahçe", city: "Antalya", rating: 4.7, specialty: ["Peyzaj Aydınlatma", "Süs Havuzu"] },
  { name: "Marmara Peyzaj", city: "Bursa", rating: 4.4, specialty: ["Bahçe Bakımı", "Çim Serme"] },
];

const FeaturedFirms = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
          Öne Çıkan Firmalar
        </h2>
        <p className="text-muted-foreground text-center max-w-xl mx-auto mb-14">
          Türkiye genelinde en çok tercih edilen peyzaj firmaları.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {firms.map((firm, i) => (
            <div
              key={i}
              className="bg-card rounded-lg border border-border p-6 hover:shadow-lg transition-shadow group"
            >
              <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center mb-4">
                <span className="font-heading text-lg font-bold text-primary">{firm.name[0]}</span>
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground mb-1">{firm.name}</h3>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {firm.city}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-accent fill-accent" />
                  {firm.rating}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {firm.specialty.map((s) => (
                  <span key={s} className="text-xs bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full font-body">
                    {s}
                  </span>
                ))}
              </div>
              <Button variant="outline" size="sm" className="w-full group-hover:border-primary group-hover:text-primary transition-colors">
                İncele
              </Button>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link to="/firmalar">
            <Button variant="default" size="lg">
              Tüm Firmaları Gör
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedFirms;
