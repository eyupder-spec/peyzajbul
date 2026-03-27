import { useApprovedFirms } from "@/hooks/useFirms";
import FirmCard from "@/components/FirmCard";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Sparkles, Star } from "lucide-react";
import BannerAd from "@/components/BannerAd";

const FeaturedFirms = () => {
  const { data: firms, isLoading } = useApprovedFirms();
  
  // Separate premium and new firms
  const premiumFirms = firms?.filter((f) => f.is_premium).slice(0, 6) || [];
  const newFirms = firms?.filter((f) => !f.is_premium).slice(0, 6) || [];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {isLoading ? (
          <p className="text-center text-muted-foreground">Yükleniyor...</p>
        ) : (
          <div className="flex gap-6 justify-center">
            
            {/* Sol Reklam Alanı (Skyscraper - Sadece Masaüstü) */}
            <div className="hidden xl:block w-[160px] shrink-0 pt-28">
              <div className="sticky top-24">
                <BannerAd placement="home_left" className="w-[160px] h-[600px] rounded-lg shadow-sm" />
              </div>
            </div>

            {/* Orta İçerik (Firmalar Grid'i) */}
            <div className="flex-1 max-w-5xl">
              <div className="space-y-20">
            {/* VIP Premium Firms Section */}
            {premiumFirms.length > 0 && (
              <div>
                <div className="text-center mb-10">
                  <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-accent text-accent-foreground mb-4 shadow-md">
                    <Sparkles className="h-4 w-4" />
                    <span className="font-bold text-sm uppercase tracking-widest">Önerilenler</span>
                  </div>
                  <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
                    Öne Çıkan Premium Firmalar
                  </h2>
                  <p className="text-muted-foreground max-w-xl mx-auto">
                    Platformumuz tarafından onaylanmış, yüksek hizmet kalitesine sahip güvenilir firmalar.
                  </p>
                </div>
                
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                  {premiumFirms.map((firm) => (
                    <FirmCard
                      key={firm.id}
                      id={firm.id}
                      company_name={firm.company_name}
                      city={firm.city}
                      district={firm.district}
                      services={firm.services || []}
                      description={firm.description}
                      is_premium={firm.is_premium}
                      slug={firm.slug}
                      logo_url={firm.logo_url}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* New Arrivals Section */}
            {newFirms.length > 0 && (
              <div>
                 <div className="text-center mb-10">
                  <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-4">
                    Aramıza Yeni Katılanlar
                  </h2>
                  <p className="text-muted-foreground max-w-xl mx-auto">
                    Peyzajbul ailesine katılan en yeni işletmeleri keşfedin.
                  </p>
                </div>
                
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                  {newFirms.map((firm) => (
                    <FirmCard
                      key={firm.id}
                      id={firm.id}
                      company_name={firm.company_name}
                      city={firm.city}
                      district={firm.district}
                      services={firm.services || []}
                      description={firm.description}
                      slug={firm.slug}
                      logo_url={firm.logo_url}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {firms?.length === 0 && (
                  <p className="text-center text-muted-foreground">Henüz kayıtlı firma bulunmuyor.</p>
                )}
              </div>
            </div>

            {/* Sağ Reklam Alanı (Skyscraper - Sadece Masaüstü) */}
            <div className="hidden xl:block w-[160px] shrink-0 pt-28">
              <div className="sticky top-24">
                <BannerAd placement="home_right" className="w-[160px] h-[600px] rounded-lg shadow-sm" />
              </div>
            </div>

          </div>
        )}

        <div className="text-center mt-16 pt-10 border-t border-border/50 max-w-3xl mx-auto">
          <h3 className="text-xl font-bold mb-4 font-heading">İhtiyacınıza en uygun firmayı zorlanmadan bulun</h3>
          <Link href="/firmalar">
            <Button variant="default" size="lg" className="w-full sm:w-auto h-12 px-8">
              Tüm Firmaları İncele
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedFirms;
