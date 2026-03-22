"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FirmCard from "@/components/FirmCard";
import { Button } from "@/components/ui/button";
import { getCityBySlug, generateCitySeoContent, CITIES } from "@/lib/cities";
import { useFirmsByCity } from "@/hooks/useFirms";
import { ArrowLeft, MapPin } from "lucide-react";
import RelatedBlogPosts from "@/components/RelatedBlogPosts";


interface IlFirmalariProps {
  slug: string;
}

const IlFirmalari = ({ slug }: IlFirmalariProps) => {
  // slug format: istanbul-peyzaj-firmalari
  const citySlug = slug?.replace(/-peyzaj-firmalari$/, "") || "";
  const city = getCityBySlug(citySlug);

  const { data: firms, isLoading } = useFirmsByCity(city?.name || "");

  if (!city) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center flex-col gap-4 pt-24">
          <p className="text-muted-foreground text-lg">İl bulunamadı</p>
          <Link href="/iller"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Tüm İller</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  const seo = generateCitySeoContent(city.name);



  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        <div className="bg-primary py-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 text-primary-foreground/70 text-sm mb-4">
              <Link href="/" className="hover:text-primary-foreground">Ana Sayfa</Link>
              <span>/</span>
              <Link href="/iller" className="hover:text-primary-foreground">İller</Link>
              <span>/</span>
              <span className="text-primary-foreground">{city.name}</span>
            </div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-primary-foreground mb-2">
              {city.name} Peyzaj Firmaları
            </h1>
            <p className="text-primary-foreground/70 font-body">
              {city.name} ilinde hizmet veren profesyonel peyzaj firmalarını keşfedin.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-10">
          {/* Firms Section First */}
          <h2 className="font-heading text-2xl font-bold text-foreground mb-6">
            <MapPin className="inline h-5 w-5 mr-2 text-primary" />
            {city.name} İlindeki Firmalar
          </h2>

          {isLoading ? (
            <p className="text-muted-foreground">Yükleniyor...</p>
          ) : firms && firms.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
              {firms.map((firm) => (
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
          ) : (
            <div className="text-center py-16 bg-card rounded-lg border border-border mb-16">
              <p className="text-muted-foreground text-lg mb-2">
                {city.name} ilinde henüz kayıtlı firma bulunmuyor.
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Bu ilde peyzaj firması mısınız? Hemen kaydolun!
              </p>
              <Link href="/firma/giris">
                <Button>Firma Olarak Kaydol</Button>
              </Link>
            </div>
          )}

          {/* SEO Article at the Bottom */}
          <div className="pt-16 border-t border-border/50 mb-16">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">{city.name} Peyzaj Rehberi ve Çözümleri</h2>
            <article className="prose prose-sm md:prose-base max-w-4xl mx-auto font-body text-muted-foreground leading-relaxed bg-card rounded-lg border border-border p-6 md:p-8 px-4">
              {seo.article.split('\n').map((line, i) => {
                const trimmedLine = line.trim();
                if (!trimmedLine) return <br key={i} className="hidden" />;

                if (trimmedLine.startsWith('###')) {
                  return (
                    <h3 key={i} className="text-xl font-bold text-foreground mt-8 mb-4 border-l-4 border-primary pl-3">
                      {trimmedLine.replace('###', '').trim()}
                    </h3>
                  );
                }
                if (trimmedLine.startsWith('##')) {
                  return <h2 key={i} className="text-2xl font-bold text-foreground mt-10 mb-6">{trimmedLine.replace('##', '').trim()}</h2>;
                }

                if (trimmedLine.startsWith('- ')) {
                  return (
                    <div key={i} className="flex items-start gap-2 mb-2 ml-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                      <span className="text-sm md:text-base">{trimmedLine.replace('- ', '').replace(/\*\*(.*?)\*\*/g, '$1')}</span>
                    </div>
                  );
                }

                if (/^\d+\./.test(trimmedLine)) {
                  return (
                    <div key={i} className="flex items-start gap-2 mb-2 ml-2 font-semibold text-foreground">
                      <span className="text-primary">{trimmedLine.split('.')[0]}.</span>
                      <span className="text-sm md:text-base font-normal text-muted-foreground">{trimmedLine.split('.').slice(1).join('.').trim()}</span>
                    </div>
                  );
                }

                return (
                  <p key={i} className="mb-4 text-sm md:text-base">
                    {trimmedLine.split(/\*\*(.*?)\*\*/g).map((part, index) => 
                      index % 2 === 1 ? <strong key={index} className="text-foreground">{part}</strong> : part
                    )}
                  </p>
                );
              })}
            </article>
          </div>

          {/* Related Blog Posts */}
          <RelatedBlogPosts citySlug={citySlug} title={`${city.name} Hakkında Blog Yazıları`} />


          {/* Other cities */}
          <div className="mt-16">
            <h3 className="font-heading text-xl font-semibold text-foreground mb-4">Diğer İller</h3>
            <div className="flex flex-wrap gap-2">
              {CITIES.filter((c) => c.slug !== citySlug).slice(0, 20).map((c) => (
                <Link key={c.slug} href={`/iller/${c.slug}-peyzaj-firmalari`}>
                  <Button variant="outline" size="sm">{c.name}</Button>
                </Link>
              ))}
              <Link href="/iller">
                <Button variant="ghost" size="sm">Tüm İller →</Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default IlFirmalari;
