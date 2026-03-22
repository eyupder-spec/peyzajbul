"use client";

import { useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FirmCard from "@/components/FirmCard";
import { getCategoryBySlug } from "@/lib/categories";
import { useApprovedFirms } from "@/hooks/useFirms";
import RelatedBlogPosts from "@/components/RelatedBlogPosts";
import { Button } from "@/components/ui/button";
import { featuredCities, seoDistricts } from "@/lib/seo-data";
import { Sparkles } from "lucide-react";
import LeadFormBanner from "@/components/lead-form/LeadFormBanner";

interface HizmetDetayProps {
  slug: string;
}

const HizmetDetay = ({ slug }: HizmetDetayProps) => {
  const category = slug ? getCategoryBySlug(slug) : undefined;
  const { data: firms, isLoading } = useApprovedFirms();

  const filteredFirms = useMemo(() => {
    if (!firms || !category) return [];
    return firms.filter((f) => f.services?.includes(category.label));
  }, [firms, category]);

  if (!category) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-4">Hizmet Bulunamadı</h1>
        <Link href="/hizmetler">
          <Button variant="outline">Hizmetlere Dön</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Service",
        "name": category.label,
        "description": category.seoDescription,
        "areaServed": { "@type": "Country", "name": "Türkiye" },
        "provider": {
          "@type": "Organization",
          "name": "Peyzajbul"
        },
        "url": `https://www.peyzajbul.com/hizmetler/${category.slug}`
      })}</script>
      <Navbar />
      <main className="flex-1 pt-16">
        <div className="relative bg-primary py-24 overflow-hidden">
          {/* Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center z-0"
            style={{
              backgroundImage: `url(${category.imageUrl})`,
            }}
          />
          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-black/60 z-10" />

          <div className="container relative z-20 mx-auto px-4 text-center">
            <span className="text-5xl mb-4 block drop-shadow-md">{category.icon}</span>
            <h1 className="font-heading text-3xl md:text-5xl font-bold text-white mb-4 drop-shadow-md">
              {category.label}
            </h1>
            <p className="text-white/90 font-body max-w-2xl mx-auto text-lg drop-shadow">
              {category.shortDescription}
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <article className="prose prose-sm md:prose-base max-w-4xl mx-auto mb-16 font-body text-muted-foreground leading-relaxed px-4">
            {category.seoArticle.split('\n').map((line, i) => {
              const trimmedLine = line.trim();
              if (!trimmedLine) return <br key={i} className="hidden" />;

              // Başlıklar
              if (trimmedLine.startsWith('###')) {
                return <h3 key={i} className="text-xl font-bold text-foreground mt-8 mb-4 border-l-4 border-primary pl-3">{trimmedLine.replace('###', '').trim()}</h3>;
              }
              if (trimmedLine.startsWith('##')) {
                return <h2 key={i} className="text-2xl font-bold text-foreground mt-10 mb-6">{trimmedLine.replace('##', '').trim()}</h2>;
              }

              // Liste elemanları
              if (trimmedLine.startsWith('- ')) {
                return (
                  <div key={i} className="flex items-start gap-2 mb-2 ml-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    <span className="text-sm md:text-base">{trimmedLine.replace('- ', '').replace(/\*\*(.*?)\*\*/g, '$1')}</span>
                  </div>
                );
              }

              // Sayısal listeler
              if (/^\d+\./.test(trimmedLine)) {
                return (
                  <div key={i} className="flex items-start gap-2 mb-2 ml-2 font-semibold text-foreground">
                    <span className="text-primary">{trimmedLine.split('.')[0]}.</span>
                    <span className="text-sm md:text-base font-normal text-muted-foreground">{trimmedLine.split('.').slice(1).join('.').trim()}</span>
                  </div>
                );
              }

              // Normal Paragraf (Kalın metin desteği ile)
              return (
                <p key={i} className="mb-4 text-sm md:text-base">
                  {trimmedLine.split(/\*\*(.*?)\*\*/g).map((part, index) =>
                    index % 2 === 1 ? <strong key={index} className="text-foreground">{part}</strong> : part
                  )}
                </p>
              );
            })}

            <div className="mt-8 pt-8 border-t border-border/50 italic text-sm">
              Profesyonel <strong>{category.label.toLowerCase()}</strong> hizmetleri, sadece estetik bir görünüm değil, aynı zamanda mülkünüzün değerini artıran bir yatırımdır. Peyzajbul olarak doğru uzmanla eşleşmenizi sağlıyoruz.
            </div>
          </article>

          <LeadFormBanner />

          <h2 className="heading-premium-h3 text-2xl font-bold text-foreground mb-6 text-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" /> {category.label} Hizmeti Veren Firmalar
          </h2>

          {isLoading ? (
            <p className="text-center text-muted-foreground">Yükleniyor...</p>
          ) : filteredFirms.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFirms.map((firm) => (
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
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <p className="font-heading text-xl mb-2">Henüz firma bulunamadı</p>
              <p className="text-sm font-body">Bu hizmette yakında firmalar eklenecek.</p>
            </div>
          )}

          {/* Related Blog Posts */}
          <RelatedBlogPosts categorySlug={slug} title={`${category.label} Hakkında Yazılar`} />

          {/* SEO INTERNAL LINKS: HİZMET BÖLGELERİ */}
          <div className="mt-20 pt-16 border-t border-border">
            <h2 className="heading-premium-h3 text-2xl font-bold text-foreground mb-8 text-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" /> {category.label} Hizmet Bölgeleri
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredCities.map((city) => (
                <div key={city.slug} className="space-y-3">
                  <Link
                    href={`/hizmet/${category.slug}/${city.slug}`}
                    className="inline-block text-lg font-semibold text-primary hover:underline"
                  >
                    {city.name} {category.label}
                  </Link>
                  <ul className="grid grid-cols-2 gap-2">
                    {(seoDistricts[city.slug] || []).map((district) => (
                      <li key={district.slug}>
                        <Link
                          href={`/hizmet/${category.slug}/${city.slug}/${district.slug}`}
                          className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 before:content-[''] before:w-1.5 before:h-1.5 before:bg-primary/50 before:rounded-full"
                        >
                          {district.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default HizmetDetay;
