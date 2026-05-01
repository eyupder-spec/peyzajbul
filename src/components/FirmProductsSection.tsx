"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

export default function FirmProductsSection({ firmId }: { firmId: string }) {
  const { data: firmPlants, isLoading: loadingPlants } = useQuery({
    queryKey: ["firm-plants-public", firmId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("firm_plants")
        .select("id, plant_id, show_price, price_display, stock_status, notes, plants(id, slug, name, scientific_name, plant_categories(name, icon))")
        .eq("firm_id", firmId)
        .neq("stock_status", "unavailable");
      if (error) console.error("Error fetching firm plants:", error);
      return data || [];
    },
    enabled: !!firmId,
  });

  const { data: firmProducts, isLoading: loadingProducts } = useQuery({
    queryKey: ["firm-products-public", firmId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("firm_products")
        .select("*")
        .eq("firm_id", firmId)
        .eq("is_active", true)
        .order("sort_order");
      if (error) console.error("Error fetching firm products:", error);
      return data || [];
    },
    enabled: !!firmId,
  });

  if (loadingPlants || loadingProducts) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm mb-16">
        <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-muted animate-pulse"></div>
          <div className="w-64 h-8 bg-muted rounded animate-pulse"></div>
        </h2>
        <div className="mb-6">
          <div className="w-40 h-5 bg-muted rounded animate-pulse mb-4"></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-xl border border-border h-32 bg-muted/40 animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const hasPlants = firmPlants && firmPlants.length > 0;
  const hasProducts = firmProducts && firmProducts.length > 0;
  
  if (!hasPlants && !hasProducts) {
    return null; // Don't show anything if no products
  }

  return (
    <section className="mb-16">
      <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-2">
        🛒 Ürünler & Bitkiler
      </h2>

      {hasPlants && (
        <div className="mb-8">
          <p className="text-sm font-semibold text-muted-foreground mb-4">🌿 Katalog Bitkiler</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {(firmPlants as any[]).map((fp: any) => {
              const plant = fp.plants;
              if (!plant) return null;
              const cat = plant.plant_categories;
              return (
                <Link
                  key={fp.plant_id || plant.id}
                  href={`/bitkiler/${plant.slug}`}
                  className="group flex flex-col gap-3 p-4 rounded-xl border border-border hover:border-primary/50 hover:shadow-md transition-all bg-card"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{cat?.icon || "🌿"}</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-tight line-clamp-1">{plant.name}</p>
                      <p className="text-[10px] text-muted-foreground italic line-clamp-1">{plant.scientific_name}</p>
                    </div>
                  </div>
                  {fp.show_price && fp.price_display && (
                    <p className="text-sm font-bold text-primary mt-auto pt-1">{fp.price_display}</p>
                  )}
                  {fp.stock_status === "limited" && (
                    <span className="text-[10px] text-orange-600 font-medium bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded w-fit">⚠️ Sınırlı Stok</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {hasProducts && (
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-4">📦 Diğer Ürünler</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {(firmProducts as any[]).map((product: any) => (
              <div key={product.id} className="flex flex-col rounded-xl border border-border overflow-hidden bg-card hover:shadow-md transition-shadow group">
                {product.image_url ? (
                  <div className="aspect-[4/3] w-full relative overflow-hidden bg-muted">
                    <img src={product.image_url} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                ) : (
                  <div className="aspect-[4/3] w-full bg-muted flex items-center justify-center">
                    <span className="text-4xl opacity-20">📦</span>
                  </div>
                )}
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="text-sm font-semibold text-foreground leading-tight line-clamp-1 group-hover:text-primary transition-colors">{product.title}</h3>
                  {product.category && <p className="text-[10px] font-medium text-muted-foreground mt-1">{product.category}</p>}
                  {product.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{product.description}</p>}
                  
                  <div className="mt-auto pt-3">
                    {product.show_price && product.price_display ? (
                      <p className="text-sm font-bold text-primary">{product.price_display}</p>
                    ) : (
                      <p className="text-[10px] font-medium text-muted-foreground italic">Fiyat bilgisi için iletişime geçin</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
