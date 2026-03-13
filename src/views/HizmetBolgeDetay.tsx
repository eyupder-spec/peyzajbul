"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Leaf, MapPin, CheckCircle2, ChevronRight, Home, Building2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LeadFormModal from "@/components/lead-form/LeadFormModal";
import { useApprovedFirms } from "@/hooks/useFirms";
import { Category } from "@/lib/categories";

interface HizmetBolgeDetayProps {
  category: Category;
  il: string;
  ilce?: string;
  cityName: string;
  districtName?: string;
  fullLocation: string;
}

const HizmetBolgeDetay = ({
  category,
  il,
  ilce,
  cityName,
  districtName,
  fullLocation,
}: HizmetBolgeDetayProps) => {
  const [formOpen, setFormOpen] = useState(false);
  const { data: firms, isLoading } = useApprovedFirms();

  // Firmaları konuma ve hizmete göre filtreleyelim
  const filteredFirms = useMemo(() => {
    if (!firms) return [];
    return firms.filter((f) => {
      const matchCity = f.city?.toLowerCase() === cityName.toLowerCase();
      const matchDistrict = !districtName || !f.district || f.district.toLowerCase() === districtName.toLowerCase();
      const matchService = f.services?.includes(category.label);
      return matchService && (matchCity || matchDistrict);
    });
  }, [firms, category.label, cityName, districtName]);

  // Eğer bölgede firma yoksa, en azından şehirden öne çıkanları gösterelim
  const sidebarFirms = useMemo(() => {
    if (filteredFirms.length > 0) return filteredFirms.slice(0, 5);
    if (!firms) return [];
    return firms
      .filter(f => f.city?.toLowerCase() === cityName.toLowerCase() && f.services?.includes(category.label))
      .slice(0, 5);
  }, [filteredFirms, firms, cityName, category.label]);

  const scrollToFirms = () => {
    const el = document.getElementById("firmalar-listesi");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        {/* BREADCRUMB */}
        <div className="container mx-auto px-4 mb-8">
          <nav className="flex items-center text-sm text-muted-foreground whitespace-nowrap overflow-x-auto pb-2">
            <Link href="/" className="hover:text-primary flex items-center">
              <Home className="h-4 w-4" />
            </Link>
            <ChevronRight className="h-4 w-4 mx-1 flex-shrink-0" />
            <Link href="/hizmetler" className="hover:text-primary">Hizmetler</Link>
            <ChevronRight className="h-4 w-4 mx-1 flex-shrink-0" />
            <Link href={`/hizmetler/${category.slug}`} className="hover:text-primary">{category.label}</Link>
            <ChevronRight className="h-4 w-4 mx-1 flex-shrink-0" />
            <span className="text-foreground font-medium">{districtName || cityName}</span>
          </nav>
        </div>

        {/* HERO SECTION */}
        <section className="container mx-auto px-4 mb-12">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary mb-6">
              <MapPin className="h-4 w-4" />
              <span className="text-sm font-medium">{fullLocation} Bölgesi</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
              {districtName || cityName} <span className="text-primary">{category.label}</span> Hizmeti
            </h1>
            
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              {districtName} bölgesinde profesyonel {category.label.toLowerCase()} hizmeti veren en iyi peyzaj firmalarını sizin için listeledik. Yaşam alanlarınızı güzelleştirmek için uzman ekiplerden hemen ücretsiz teklif alın.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="text-base h-12 px-8" onClick={() => setFormOpen(true)}>
                Ücretsiz Teklif Al
              </Button>
              <Button size="lg" variant="outline" className="text-base h-12 px-8" onClick={scrollToFirms}>
                Firmaları İncele
              </Button>
            </div>
          </div>
        </section>

        {/* İÇERİK VE FİRMALAR GRID */}
        <section className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* SOL KOLON (Makale & Projeler) */}
            <div className="lg:col-span-2 space-y-12">
              <article className="prose prose-gray max-w-none prose-headings:text-foreground prose-p:text-muted-foreground">
                <h2>{fullLocation} Bölgesinde {category.label} Çözümleri</h2>
                <p>
                  {category.seoArticle || ""} <strong>{districtName}</strong> bölgesinin iklimsel koşulları, toprak yapısı ve mimari dokusu göz önünde bulundurularak {category.label.toLowerCase()} uygulamaları profesyonel peyzaj mimarları tarafından özenle planlanmalıdır. Özellikle <strong>{cityName}</strong> gibi büyükşehirlerde dış mekanların doğru değerlendirilmesi yaşam kalitesini doğrudan artırır.
                </p>
                
                <h3>Ayrıcalıklı Hizmet Anlayışı</h3>
                <p>
                  Sürecin ilk aşamasında alan keşfi ve toprak analizi yapılır. {category.label} projelerinde doğru karar verebilmek için mekanın güneş alma süresi, rüzgar yönü ve mevcut altyapı detaylıca incelenir. {districtName} çevresindeki konutlarda ve ticari alanlarda uygulanan modern peyzaj trendleri mekana hem estetik bir değer hem de ekonomik bir artı katar.
                </p>
                
                <ul className="not-prose grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 mt-6">
                  {['Ücretsiz Alan Keşfi ve Projelendirme', 'Uzman Peyzaj Mimarı Kadrosu', 'Bölge İklimine Uygun Bitki Seçimi', 'Garantili ve Sürekli Bakım Hizmeti'].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>

              <div id="firmalar-listesi" className="pt-8">
                <h3 className="text-2xl font-bold mb-6">{districtName || cityName} Bölgesindeki Uzmanlar</h3>
                {isLoading ? (
                  <p>Yükleniyor...</p>
                ) : filteredFirms.length > 0 ? (
                  <div className="grid gap-6">
                    {filteredFirms.map((firm) => (
                      <Card key={firm.id} className="overflow-hidden hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row gap-6">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="text-xl font-bold">{firm.company_name}</h4>
                                {firm.is_premium && <Badge className="bg-amber-500">PREMIUM</Badge>}
                              </div>
                              <p className="text-muted-foreground line-clamp-2 mb-4">{firm.description}</p>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {firm.city}</span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 justify-center">
                              <Button asChild>
                                <Link href={`/firma/${firm.slug}`}>Profili Gör</Link>
                              </Button>
                              <Button variant="outline" onClick={() => setFormOpen(true)}>Teklif Al</Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="bg-muted/30 rounded-xl p-8 text-center border border-dashed border-border">
                    <p className="text-muted-foreground italic">Bu bölgede henüz listelenmiş firma bulunmuyor. Şehrinizdeki diğer uzmanları inceleyebilirsiniz.</p>
                  </div>
                )}
              </div>
            </div>

            {/* SAĞ KOLON (Sidebar) */}
            <div className="space-y-6">
              <div className="sticky top-24">
                <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Öne Çıkan Firmalar
                </h3>
                
                <div className="space-y-4">
                  {sidebarFirms.map((firm) => (
                    <Card key={firm.id} className="group hover:border-primary/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                            {firm.company_name}
                          </h4>
                          {firm.is_premium && (
                            <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-[10px] px-1.5 py-0 h-4">PRO</Badge>
                          )}
                        </div>
                        <Button variant="outline" size="sm" className="w-full text-xs" asChild>
                          <Link href={`/firma/${firm.slug}`}>Profili İncele</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="mt-8 bg-primary/5 rounded-xl p-6 border border-primary/10 text-center">
                  <h4 className="font-bold mb-2">Hızlı Teklif Alın</h4>
                  <p className="text-sm text-muted-foreground mb-4">Size en yakın profesyonellerden fiyat teklifi toplayalım.</p>
                  <Button className="w-full" onClick={() => setFormOpen(true)}>
                    Teklif Formunu Aç
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <LeadFormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
};

export default HizmetBolgeDetay;
