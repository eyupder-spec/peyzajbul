import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FirmCard from "@/components/FirmCard";
import { Button } from "@/components/ui/button";
import { getCityBySlug, generateCitySeoContent, CITIES } from "@/lib/cities";
import { useFirmsByCity } from "@/hooks/useFirms";
import { ArrowLeft, MapPin } from "lucide-react";
import { Helmet } from "react-helmet-async";

const IlFirmalari = () => {
  const { slug } = useParams<{ slug: string }>();
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
          <Link to="/iller"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Tüm İller</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  const seo = generateCitySeoContent(city.name);

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <link rel="canonical" href={`https://peyzaj-rehberi-turkiye.lovable.app/iller/${citySlug}-peyzaj-firmalari`} />
      </Helmet>
      <Navbar />
      <main className="flex-1 pt-16">
        <div className="bg-primary py-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 text-primary-foreground/70 text-sm mb-4">
              <Link to="/" className="hover:text-primary-foreground">Ana Sayfa</Link>
              <span>/</span>
              <Link to="/iller" className="hover:text-primary-foreground">İller</Link>
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
          {/* SEO Article */}
          <article className="prose prose-slate dark:prose-invert max-w-none mb-12 bg-card rounded-lg border border-border p-6 md:p-8">
            <div dangerouslySetInnerHTML={{ __html: markdownToHtml(seo.article) }} />
          </article>

          {/* Firms */}
          <h2 className="font-heading text-2xl font-bold text-foreground mb-6">
            <MapPin className="inline h-5 w-5 mr-2 text-primary" />
            {city.name} İlindeki Firmalar
          </h2>

          {isLoading ? (
            <p className="text-muted-foreground">Yükleniyor...</p>
          ) : firms && firms.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {firms.map((firm) => (
                <FirmCard
                  key={firm.id}
                  id={firm.id}
                  company_name={firm.company_name}
                  city={firm.city}
                  district={firm.district}
                  services={firm.services || []}
                  description={firm.description}
                  slug={firm.slug}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-card rounded-lg border border-border">
              <p className="text-muted-foreground text-lg mb-2">
                {city.name} ilinde henüz kayıtlı firma bulunmuyor.
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Bu ilde peyzaj firması mısınız? Hemen kaydolun!
              </p>
              <Link to="/firma/giris">
                <Button>Firma Olarak Kaydol</Button>
              </Link>
            </div>
          )}

          {/* Other cities */}
          <div className="mt-16">
            <h3 className="font-heading text-xl font-semibold text-foreground mb-4">Diğer İller</h3>
            <div className="flex flex-wrap gap-2">
              {CITIES.filter((c) => c.slug !== citySlug).slice(0, 20).map((c) => (
                <Link key={c.slug} to={`/iller/${c.slug}-peyzaj-firmalari`}>
                  <Button variant="outline" size="sm">{c.name}</Button>
                </Link>
              ))}
              <Link to="/iller">
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

// Simple markdown to HTML converter for the article
function markdownToHtml(md: string): string {
  return md
    .replace(/### (.*)/g, '<h3>$1</h3>')
    .replace(/## (.*)/g, '<h2>$1</h2>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.*)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hul])/gm, (match) => match ? match : '')
    ;
}

export default IlFirmalari;
