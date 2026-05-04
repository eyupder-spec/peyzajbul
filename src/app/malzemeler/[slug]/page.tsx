import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LightboxGallery from "./LightboxGallery";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: material } = await supabase.from("materials").select("name, material_type, description").eq("slug", slug).single();
  if (!material) return { title: "Malzeme Bulunamadı" };
  return {
    title: `${material.name} (${material.material_type || "Peyzaj Malzemesi"}) — Bilgi & Firmalar | Peyzajbul`,
    description: material.description?.slice(0, 160) || `${material.name} özellikleri ve yakınınızdaki uygulayan firmalar.`,
    alternates: { canonical: `https://www.peyzajbul.com/malzemeler/${slug}` },
  };
}

export default async function MalzemeDetayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: material } = await supabase
    .from("materials")
    .select("*, material_categories(name, slug, icon)")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!material) notFound();

  // Bu malzemeyi satan/uygulayan firmalar
  const { data: firmMaterials } = await supabase
    .from("firm_materials")
    .select(`
      show_price, price_display, stock_status, notes,
      firms:firm_id (id, company_name, city, district, slug, is_premium, logo_url)
    `)
    .eq("material_id", material.id)
    .neq("stock_status", "unavailable");

  const cat = material.material_categories as any;

  // Galeri için tüm resimleri birleştir (Ana resim + Galeri resimleri)
  const allImages: string[] = [];
  if (material.image_url) allImages.push(material.image_url);
  if (material.gallery_urls && material.gallery_urls.length > 0) {
    allImages.push(...material.gallery_urls);
  }

  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": `${material.name} - Malzeme Detay`,
    "description": material.description || `${material.name} özellikleri ve uygulayan firmalar.`,
    "image": allImages.length > 0 ? allImages : [],
    "url": `https://www.peyzajbul.com/malzemeler/${slug}`,
    "mainEntity": {
      "@type": "Product",
      "name": material.name,
      "description": material.description || material.material_type,
      "image": material.image_url || undefined,
      "category": cat?.name,
      "offers": {
        "@type": "AggregateOffer",
        "offerCount": firmMaterials?.length || 0,
        "availability": firmMaterials?.length ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
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
          <Link href="/malzemeler" className="hover:text-foreground">Malzemeler</Link>
          <span>/</span>
          {cat && <Link href={`/malzemeler#${cat.slug}`} className="hover:text-foreground">{cat.icon || "🪨"} {cat.name}</Link>}
          <span>/</span>
          <span className="text-foreground font-medium">{material.name}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">
        {/* Başlık ve Ana Görsel */}
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {material.image_url ? (
            <div className="w-full md:w-64 h-64 rounded-2xl border border-border overflow-hidden shrink-0 relative bg-muted shadow-sm">
              <img src={material.image_url} alt={material.name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-full md:w-48 h-48 rounded-2xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-8xl border border-amber-100 dark:border-amber-900 shrink-0">
              {cat?.icon || "🪨"}
            </div>
          )}
          <div className="flex-1 space-y-3">
            {cat && (
              <Link href={`/malzemeler#${cat.slug}`} className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-3 py-1 rounded-full hover:bg-amber-200 transition-colors">
                {cat.icon || "🪨"} {cat.name}
              </Link>
            )}
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">{material.name}</h1>
            <p className="text-lg text-muted-foreground italic">{material.material_type || "Peyzaj Malzemesi"}</p>
          </div>
        </div>

        {/* Galeri (Lightbox dahil) */}
        {allImages.length > 1 && (
           <LightboxGallery images={allImages} title={material.name} />
        )}

        {/* Açıklama */}
        {material.description && (
          <section className="bg-card rounded-2xl border border-border p-6 md:p-8">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              📖 Detaylı Bilgi
            </h2>
            <div className="prose prose-amber dark:prose-invert max-w-none">
              <p className="text-foreground/80 leading-relaxed text-lg whitespace-pre-wrap">
                {material.description}
              </p>
            </div>
          </section>
        )}

        {/* Genel Özellikler */}
        <section>
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            ⚙️ Özellikler
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {material.usage_areas && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-xl p-4 text-center space-y-1">
              <div className="text-2xl">📍</div>
              <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">Kullanım Alanları</p>
              <p className="text-sm font-bold text-foreground">{material.usage_areas}</p>
            </div>
          )}
          {material.material_type && (
            <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900 rounded-xl p-4 text-center space-y-1">
              <div className="text-2xl">🧱</div>
              <p className="text-xs text-purple-600 font-semibold uppercase tracking-wider">Malzeme Türü</p>
              <p className="text-sm font-bold text-foreground">{material.material_type}</p>
            </div>
          )}
          </div>
        </section>

        {/* Bu malzemeyi satan/uygulayan firmalar */}
        <section>
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            🏢 Bu Malzemeyi Satan / Uygulayan Firmalar
            {firmMaterials && firmMaterials.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{firmMaterials.length} firma</span>
            )}
          </h2>

          {firmMaterials && firmMaterials.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {firmMaterials.map((fm: any) => {
                const firm = fm.firms;
                if (!firm) return null;
                return (
                  <Link
                    key={firm.id}
                    href={`/firma/${firm.slug}`}
                    className="group flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:border-amber-400 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0 border border-border overflow-hidden">
                      {firm.logo_url
                        ? <img src={firm.logo_url} alt={firm.company_name} className="w-full h-full object-cover" />
                        : <span className="text-xl">🏢</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <p className="font-semibold text-foreground truncate group-hover:text-amber-600 transition-colors">
                          {firm.company_name}
                        </p>
                        {firm.is_premium && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold shrink-0">PRO</span>}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                        📍 {firm.city} {firm.district ? `/ ${firm.district}` : ""}
                      </p>
                      {fm.show_price && fm.price_display && (
                        <p className="text-xs font-semibold text-foreground bg-muted w-fit px-2 py-0.5 rounded">
                          💰 {fm.price_display}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-8 text-center space-y-3">
              <div className="text-4xl">🏢</div>
              <p className="text-lg font-semibold text-foreground">Henüz Ekleyen Firma Yok</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">Bu malzemeyi satan veya uygulayan bir firma iseniz, yönetim panelinizden portföyünüze ekleyebilirsiniz.</p>
            </div>
          )}
        </section>
      </div>
      </main>
      <Footer />
    </div>
  );
}
