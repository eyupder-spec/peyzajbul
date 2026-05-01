import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Bitki Rehberi | Türkiye'nin En Kapsamlı Peyzaj Bitki Ansiklopedisi | Peyzajbul",
  description: "Lavanta'dan Erguvan'a, Şimşir'den Palmiye'ye 100'den fazla peyzaj bitkisinin bakım bilgilerini keşfedin. Yakınınızdaki satan firmaları bulun.",
  alternates: { canonical: "https://www.peyzajbul.com/bitkiler" },
};

export const revalidate = 3600;

export default async function BitkilerPage() {
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("plant_categories")
    .select("*, plants(count)")
    .order("sort_order");

  const { data: plants } = await supabase
    .from("plants")
    .select("id, slug, name, scientific_name, category_id, watering, sunlight")
    .eq("is_published", true)
    .order("name");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-16">
        {/* Hero */}
        <section className="bg-primary/5 border-b border-border py-16 px-4">
          <div className="max-w-5xl mx-auto text-center space-y-4">
            <p className="text-primary text-sm font-semibold uppercase tracking-widest">Peyzajbul Bitki Rehberi</p>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight font-heading">
              Türkiye'nin En Kapsamlı<br />
              <span className="text-primary">Peyzaj Bitki Ansiklopedisi</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Bakım bilgileri, sulama tavsiyeleri ve yakınınızda bu bitkiyi satan firmalar.
            </p>
            <div className="pt-2 flex items-center justify-center gap-6 text-foreground/80 text-sm font-medium">
              <span>🌿 {plants?.length || 0}+ Bitki</span>
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
                className="group flex flex-col items-center gap-2 p-4 rounded-2xl border border-border bg-card hover:border-emerald-400 hover:shadow-md transition-all duration-200 text-center"
              >
                <span className="text-3xl">{cat.icon}</span>
                <span className="text-sm font-semibold text-foreground group-hover:text-emerald-600 leading-tight">{cat.name}</span>
                <span className="text-xs text-muted-foreground">
                  {plants?.filter((p: any) => p.category_id === cat.id).length || 0} bitki
                </span>
              </a>
            ))}
          </div>
        </section>

        {/* Her kategori */}
        {categories?.map((cat: any) => {
          const catPlants = plants?.filter((p: any) => p.category_id === cat.id) || [];
          if (catPlants.length === 0) return null;
          return (
            <section key={cat.id} id={cat.slug}>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">{cat.icon}</span>
                <h2 className="text-xl font-bold text-foreground">{cat.name}</h2>
                <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{catPlants.length} bitki</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {catPlants.map((plant: any) => (
                  <Link
                    key={plant.id}
                    href={`/bitkiler/${plant.slug}`}
                    className="group flex flex-col gap-2 p-3 rounded-xl border border-border bg-card hover:border-emerald-400 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="w-full aspect-[4/3] rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-4xl">
                      {cat.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground group-hover:text-emerald-600 leading-tight">{plant.name}</p>
                      <p className="text-xs text-muted-foreground italic truncate">{plant.scientific_name}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {plant.watering && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                          💧 {plant.watering === 'az' ? 'Az' : plant.watering === 'orta' ? 'Orta' : 'Çok'}
                        </span>
                      )}
                      {plant.sunlight && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">
                          ☀️ {plant.sunlight === 'tam_gunes' ? 'Güneş' : plant.sunlight === 'yari_golge' ? 'Yarı' : 'Gölge'}
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
