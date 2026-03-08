import { useState, useMemo } from "react";
import { Star, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const allFirms = [
  { name: "Yeşil Doğa Peyzaj", city: "İstanbul", rating: 4.8, specialty: ["Bahçe Tasarımı", "Sulama Sistemleri"] },
  { name: "Anatolia Peyzaj", city: "Ankara", rating: 4.6, specialty: ["Kentsel Peyzaj", "Park Düzenleme"] },
  { name: "Ege Peyzaj Mimarlık", city: "İzmir", rating: 4.9, specialty: ["Havuz Çevresi", "Çatı Bahçesi"] },
  { name: "Karadeniz Yeşilçam", city: "Trabzon", rating: 4.5, specialty: ["Doğal Peyzaj", "Ağaçlandırma"] },
  { name: "Akdeniz Bahçe", city: "Antalya", rating: 4.7, specialty: ["Peyzaj Aydınlatma", "Süs Havuzu"] },
  { name: "Marmara Peyzaj", city: "Bursa", rating: 4.4, specialty: ["Bahçe Bakımı", "Çim Serme"] },
  { name: "Trakya Peyzaj", city: "Edirne", rating: 4.3, specialty: ["Bahçe Tasarımı", "Ağaçlandırma"] },
  { name: "İç Anadolu Yeşil", city: "Konya", rating: 4.5, specialty: ["Park Düzenleme", "Sulama Sistemleri"] },
  { name: "Güneydoğu Peyzaj", city: "Gaziantep", rating: 4.2, specialty: ["Kentsel Peyzaj", "Çim Serme"] },
];

const cities = [...new Set(allFirms.map((f) => f.city))].sort();
const services = [...new Set(allFirms.flatMap((f) => f.specialty))].sort();

const Firmalar = () => {
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");

  const filtered = useMemo(() => {
    return allFirms.filter((f) => {
      const matchSearch = f.name.toLowerCase().includes(search.toLowerCase());
      const matchCity = !cityFilter || f.city === cityFilter;
      const matchService = !serviceFilter || f.specialty.includes(serviceFilter);
      const matchRating = !ratingFilter || f.rating >= parseFloat(ratingFilter);
      return matchSearch && matchCity && matchService && matchRating;
    });
  }, [search, cityFilter, serviceFilter, ratingFilter]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        <div className="bg-primary py-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-primary-foreground mb-2">
              Peyzaj Firmaları
            </h1>
            <p className="text-primary-foreground/70 font-body">
              Türkiye genelindeki peyzaj firmalarını keşfedin.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-10">
          {/* Filters */}
          <div className="bg-card rounded-lg border border-border p-4 mb-8">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Firma ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full px-4 py-2.5 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Tüm İller</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="w-full px-4 py-2.5 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Tüm Hizmetler</option>
                {services.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className="w-full px-4 py-2.5 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Tüm Puanlar</option>
                <option value="4.5">4.5+</option>
                <option value="4.0">4.0+</option>
                <option value="3.5">3.5+</option>
              </select>
            </div>
          </div>

          {/* Results */}
          <p className="text-sm text-muted-foreground mb-4 font-body">{filtered.length} firma bulundu</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((firm, i) => (
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
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <p className="font-heading text-xl mb-2">Sonuç bulunamadı</p>
              <p className="text-sm font-body">Filtrelerinizi değiştirerek tekrar deneyin.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Firmalar;
