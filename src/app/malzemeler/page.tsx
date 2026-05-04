import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Peyzaj Malzemeleri Rehberi | Doğal Taş, Ahşap ve Deck Kaplamalar | Peyzajbul",
  description: "Bahçenizi güzelleştirecek doğal taşlar, ahşap deckler, aydınlatma ürünleri ve peyzaj malzemeleri hakkında detaylı bilgi. Uygulama yapan firmaları bulun.",
  alternates: { canonical: "https://www.peyzajbul.com/malzemeler" },
};

export const revalidate = 3600;

export default async function MalzemelerPage() {
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("material_categories")
    .select("*, materials(count)")
    .order("sort_order");

  const { data: materials } = await supabase
    .from("materials")
    .select("id, slug, name, category_id, usage_areas, material_type, image_url")
    .eq("is_published", true)
    .order("name");

  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Peyzajbul Malzeme Rehberi",
    "description": "Bahçenizi güzelleştirecek peyzaj malzemeleri, taşlar ve kaplamalar hakkında detaylı bilgi ve yakınınızdaki satan/uygulayan firmalar.",
    "url": "https://www.peyzajbul.com/malzemeler",
    "about": {
      "@type": "ItemList",
      "itemListElement": materials?.map((m, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "url": `https://www.peyzajbul.com/malzemeler/${m.slug}`,
        "name": m.name
      })) || []
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
        {/* Hero */}
        <section className="bg-primary/5 border-b border-border py-16 px-4">
          <div className="max-w-5xl mx-auto text-center space-y-4">
            <p className="text-primary text-sm font-semibold uppercase tracking-widest">Peyzajbul Malzeme Rehberi</p>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight font-heading">
              Yapısal Peyzaj ve<br />
              <span className="text-primary">Malzeme Ansiklopedisi</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Doğal taşlar, zemin kaplamaları, aydınlatma ve sulama sistemleri gibi tüm bahçe unsurlarını keşfedin. Uygulama yapan firmalara ulaşın.
            </p>
            <div className="pt-2 flex items-center justify-center gap-6 text-foreground/80 text-sm font-medium">
              <span>🪨 {materials?.length || 0}+ Malzeme</span>
              <span>📂 {categories?.length || 0} Kategori</span>
              <span>🏢 Firma Bağlantısı</span>
            </div>
          </div>
        </section>

      <div className="max-w-6xl mx-auto px-4 py-12 space-y-14">
        {/* Kategoriler */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-6">Kategorilere Göre Gözat</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {categories?.map((cat: any) => (
              <a
                key={cat.id}
                href={`#${cat.slug}`}
                className="group flex flex-col items-center gap-2 p-4 rounded-2xl border border-border bg-card hover:border-amber-400 hover:shadow-md transition-all duration-200 text-center"
              >
                <span className="text-3xl">{cat.icon || "🪨"}</span>
                <span className="text-sm font-semibold text-foreground group-hover:text-amber-600 leading-tight">{cat.name}</span>
                <span className="text-xs text-muted-foreground">
                  {materials?.filter((m: any) => m.category_id === cat.id).length || 0} malzeme
                </span>
              </a>
            ))}
          </div>
        </section>

        {/* Her kategori */}
        {categories?.map((cat: any) => {
          const catMaterials = materials?.filter((m: any) => m.category_id === cat.id) || [];
          if (catMaterials.length === 0) return null;
          return (
            <section key={cat.id} id={cat.slug}>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">{cat.icon || "🪨"}</span>
                <h2 className="text-xl font-bold text-foreground">{cat.name}</h2>
                <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{catMaterials.length} malzeme</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {catMaterials.map((material: any) => (
                  <Link
                    key={material.id}
                    href={`/malzemeler/${material.slug}`}
                    className="group flex flex-col gap-2 p-3 rounded-xl border border-border bg-card hover:border-amber-400 hover:shadow-sm transition-all duration-200"
                  >
                    {material.image_url ? (
                      <div className="w-full aspect-[4/3] rounded-lg overflow-hidden relative bg-muted">
                        <img src={material.image_url} alt={material.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    ) : (
                      <div className="w-full aspect-[4/3] rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-4xl">
                        {cat.icon || "🪨"}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-foreground group-hover:text-amber-600 leading-tight">{material.name}</p>
                      <p className="text-xs text-muted-foreground italic truncate">{material.material_type || "Peyzaj Malzemesi"}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {material.usage_areas && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                          📍 {material.usage_areas.split(',')[0]}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      </main>
      <Footer />
    </div>
  );
}
