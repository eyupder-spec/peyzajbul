"use client";

import Link from "next/link";
import { featuredCities, seoDistricts } from "@/lib/seo-data";
import { getAllCategories } from "@/lib/categories";

const SeoLocationLinks = () => {
  const categories = getAllCategories();
  
  // Sadece en popüler ilk 4 kategoriyi gösterelim
  const popularCategories = categories.slice(0, 4);

  return (
    <section className="py-20 bg-muted/30 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold font-heading text-foreground mb-4">
            Türkiye'nin Her Yerinde Hizmetinizdeyiz
          </h2>
          <p className="text-muted-foreground font-body max-w-2xl mx-auto">
            Bulunduğunuz şehirdeki en iyi peyzaj firmalarını keşfedin, hayalinizdeki bahçeye kavuşun.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {featuredCities.map((city) => (
            <div key={city.slug} className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-all">
              <h3 className="font-heading text-xl font-bold text-primary mb-4 border-b pb-2 border-border/50">
                {city.name} Peyzaj
              </h3>
              
              <div className="space-y-4">
                {popularCategories.map(cat => (
                  <div key={`${city.slug}-${cat.slug}`}>
                    <Link 
                      href={`/hizmet/${cat.slug}/${city.slug}`}
                      className="inline-block text-sm font-semibold text-foreground hover:text-primary transition-colors mb-2"
                    >
                      {city.name} {cat.label}
                    </Link>
                    
                    <ul className="pl-2 border-l-2 border-primary/20 space-y-1">
                      {(seoDistricts[city.slug] || []).slice(0, 3).map((district) => (
                        <li key={district.slug}>
                          <Link 
                            href={`/hizmet/${cat.slug}/${city.slug}/${district.slug}`}
                            className="text-xs text-muted-foreground hover:text-primary transition-colors"
                          >
                            {district.name} {cat.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SeoLocationLinks;
