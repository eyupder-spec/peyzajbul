import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: plant } = await supabase.from("plants").select("name, scientific_name, description").eq("slug", slug).single();
  if (!plant) return { title: "Bitki Bulunamadı" };
  return {
    title: `${plant.name} (${plant.scientific_name}) — Bakım Rehberi | Peyzajbul`,
    description: plant.description?.slice(0, 160) || `${plant.name} bitkisinin bakım bilgileri ve yakınınızdaki satan firmalar.`,
    alternates: { canonical: `https://www.peyzajbul.com/bitkiler/${slug}` },
  };
}

const WATERING_LABEL: Record<string, string> = { az: "Az Sulama", orta: "Orta Sulama", cok: "Bol Sulama" };
const WATERING_ICON: Record<string, string> = { az: "💧", orta: "💧💧", cok: "💧💧💧" };
const SUNLIGHT_LABEL: Record<string, string> = { tam_gunes: "Tam Güneş", yari_golge: "Yarı Gölge", golge: "Gölge" };
const SUNLIGHT_ICON: Record<string, string> = { tam_gunes: "☀️", yari_golge: "⛅", golge: "🌥️" };
const GROWTH_LABEL: Record<string, string> = { yavas: "Yavaş Büyüme", orta: "Orta Büyüme", hizli: "Hızlı Büyüme" };

export default async function BitkiDetayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: plant } = await supabase
    .from("plants")
    .select("*, plant_categories(name, slug, icon)")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!plant) notFound();

  // Bu bitkiyi satan firmalar
  const { data: firmPlants } = await supabase
    .from("firm_plants")
    .select(`
      show_price, price_display, stock_status, notes,
      firms:firm_id (id, company_name, city, district, slug, is_premium, logo_url)
    `)
    .eq("plant_id", plant.id)
    .neq("stock_status", "unavailable");

  const cat = plant.plant_categories as any;

  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": `${plant.name} - Bakım Rehberi`,
    "description": plant.description || `${plant.name} özellikleri ve bakım rehberi.`,
    "image": plant.image_url ? [plant.image_url] : [],
    "url": `https://www.peyzajbul.com/bitkiler/${slug}`,
    "mainEntity": {
      "@type": "Product",
      "name": plant.name,
      "description": plant.description || plant.scientific_name,
      "image": plant.image_url || undefined,
      "category": cat?.name,
      "offers": {
        "@type": "AggregateOffer",
        "offerCount": firmPlants?.length || 0,
        "availability": firmPlants?.length ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "priceCurrency": "TRY"
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <Navbar />
      <main className="flex-1 pt-16">
      {/* Breadcrumb */}
      <div className="bg-muted/50 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Ana Sayfa</Link>
          <span>/</span>
          <Link href="/bitkiler" className="hover:text-foreground">Bitki Rehberi</Link>
          <span>/</span>
          {cat && <Link href={`/bitkiler#${cat.slug}`} className="hover:text-foreground">{cat.icon} {cat.name}</Link>}
          <span>/</span>
          <span className="text-foreground font-medium">{plant.name}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">
        {/* Başlık */}
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {plant.image_url ? (
            <div className="w-full md:w-64 h-64 rounded-2xl border border-border overflow-hidden shrink-0 relative bg-muted shadow-sm">
              <img src={plant.image_url} alt={plant.name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-full md:w-48 h-48 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-8xl border border-emerald-100 dark:border-emerald-900 shrink-0">
              {cat?.icon || "🌿"}
            </div>
          )}
          <div className="flex-1 space-y-3">
            {cat && (
              <Link href={`/bitkiler#${cat.slug}`} className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full hover:bg-emerald-200 transition-colors">
                {cat.icon} {cat.name}
              </Link>
            )}
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">{plant.name}</h1>
            <p className="text-lg text-muted-foreground italic">{plant.scientific_name}</p>
          </div>
        </div>

        {/* Bakım Rehberi (Description) */}
        {plant.description && (
          <section className="bg-card rounded-2xl border border-border p-6 md:p-8">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              📖 Bakım Rehberi
            </h2>
            <div className="prose prose-emerald dark:prose-invert max-w-none">
              <p className="text-foreground/80 leading-relaxed text-lg whitespace-pre-wrap">
                {plant.description}
              </p>
            </div>
          </section>
        )}

        {/* Genel Özellikler */}
        <section>
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            🌱 Genel Özellikler
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {plant.watering && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-xl p-4 text-center space-y-1">
              <div className="text-2xl">{WATERING_ICON[plant.watering]}</div>
              <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">Sulama</p>
              <p className="text-sm font-bold text-foreground">{WATERING_LABEL[plant.watering]}</p>
            </div>
          )}
          {plant.sunlight && (
            <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-100 dark:border-yellow-900 rounded-xl p-4 text-center space-y-1">
              <div className="text-2xl">{SUNLIGHT_ICON[plant.sunlight]}</div>
              <p className="text-xs text-yellow-600 font-semibold uppercase tracking-wider">Işık</p>
              <p className="text-sm font-bold text-foreground">{SUNLIGHT_LABEL[plant.sunlight]}</p>
            </div>
          )}
          {plant.growth_speed && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 rounded-xl p-4 text-center space-y-1">
              <div className="text-2xl">📈</div>
              <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Büyüme</p>
              <p className="text-sm font-bold text-foreground">{GROWTH_LABEL[plant.growth_speed]}</p>
            </div>
          )}
          {plant.climate_zones && (
            <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900 rounded-xl p-4 text-center space-y-1">
              <div className="text-2xl">🌍</div>
              <p className="text-xs text-purple-600 font-semibold uppercase tracking-wider">İklim</p>
              <p className="text-sm font-bold text-foreground">{plant.climate_zones}</p>
            </div>
          )}
          {plant.soil_type && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 rounded-xl p-4 text-center space-y-1">
              <div className="text-2xl">🪨</div>
              <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider">Toprak</p>
              <p className="text-sm font-bold text-foreground">{plant.soil_type}</p>
            </div>
          )}
          </div>
        </section>

        {/* Bu bitkiyi satan firmalar */}
        <section>
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            🏢 Bu Bitkiyi Satan Firmalar
            {firmPlants && firmPlants.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{firmPlants.length} firma</span>
            )}
          </h2>

          {firmPlants && firmPlants.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {firmPlants.map((fp: any) => {
                const firm = fp.firms;
                if (!firm) return null;
                return (
                  <Link
                    key={firm.id}
                    href={`/firma/${firm.slug}`}
                    className="group flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:border-emerald-400 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shrink-0 border border-border overflow-hidden">
                      {firm.logo_url
                        ? <img src={firm.logo_url} alt={firm.company_name} className="w-full h-full object-cover" />
                        : <span className="text-xl">🏢</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground group-hover:text-emerald-600 truncate">{firm.company_name}</p>
                        {firm.is_premium && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium shrink-0">👑 Premium</span>}
                      </div>
                      <p className="text-sm text-muted-foreground">{firm.city}{firm.district ? ` / ${firm.district}` : ""}</p>
                      {fp.show_price && fp.price_display && (
                        <p className="text-sm font-semibold text-emerald-600 mt-1">{fp.price_display}</p>
                      )}
                      {fp.stock_status === "limited" && (
                        <span className="text-xs text-orange-600 font-medium">⚠️ Sınırlı Stok</span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 bg-muted/30 rounded-xl border border-dashed border-border">
              <p className="text-3xl mb-2">🏪</p>
              <p className="text-muted-foreground">Henüz bu bitkiyi satan firma bulunamadı.</p>
              <p className="text-sm text-muted-foreground mt-1">Premium firma olarak ürün listenize ekleyebilirsiniz.</p>
            </div>
          )}
        </section>

        {/* Geri dön */}
        <div className="pt-4 border-t border-border">
          <Link href="/bitkiler" className="text-sm text-emerald-600 hover:underline flex items-center gap-1">
            ← Bitki Rehberi'ne Dön
          </Link>
        </div>
      </div>
      </main>
      <Footer />
    </div>
  );
}
