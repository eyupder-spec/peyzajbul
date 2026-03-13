"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LeadFormModal from "@/components/lead-form/LeadFormModal";
import { Badge } from "@/components/ui/badge";
import { MapPin, Image as ImageIcon } from "lucide-react";
import { getCitySlug } from "@/lib/cities";

type Project = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  category: string;
  city: string;
  created_at: string;
  firms: {
    slug: string;
    company_name: string;
  };
};

export default function ProjelerClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      // Sadece `is_approved`, `is_active` ve `is_premium` olan firmaların projelerini listele
      const { data, error } = await (supabase.from as any)("projects")
        .select(`
          id, title, slug, description, cover_image, category, city, created_at,
          firms!inner ( slug, company_name, is_approved, is_active, is_premium )
        `)
        .eq("status", "published")
        .eq("firms.is_approved", true)
        .eq("firms.is_active", true)
        .eq("firms.is_premium", true)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setProjects(data as unknown as Project[]);
      }
      setLoading(false);
    };

    fetchProjects();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        <div className="bg-primary/5 pt-[80px] lg:pt-[100px] py-12 border-b border-primary/10">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex-1 space-y-4">
                <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                  Platformdaki En İyi Firmalar Tarafından Gerçekleştirilen <span className="text-primary">Peyzaj Projelerini</span> İnceleyin
                </h1>
                <p className="text-muted-foreground text-lg md:text-xl max-w-2xl">
                  Bölgenizdeki profesyonel peyzaj kurulumu gerçekleştiren firmaları keşfedin!
                  En iyi hizmeti sunan yerel işletmeleri görmek ve hepsinden aynı anda fiyat teklifi almak için hemen inceleyin.
                </p>
              </div>
              <div className="w-full md:w-[400px] shrink-0">
                <div className="relative pt-4">
                  <div className="absolute -top-3 left-6 z-10">
                    <span className="bg-[#FF9900] text-white text-sm font-bold px-3 py-1 rounded shadow-sm">
                      Yeni!
                    </span>
                  </div>
                  <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-6 border border-border/50">
                    <div className="flex justify-center gap-3 mb-4 opacity-70">
                      {/* Fake circular logos */}
                      <div className="w-10 h-10 rounded-full bg-primary/20" />
                      <div className="w-10 h-10 rounded-full bg-blue-900/20" />
                      <div className="w-10 h-10 rounded-full bg-black/20" />
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20" />
                      <div className="w-10 h-10 rounded-full bg-yellow-500/20" />
                    </div>
                    <p className="text-center text-sm text-foreground/80 mb-6 font-medium">
                      Sisteme kayıtlı bölgenizdeki peyzaj firmalarından dakikalar içinde aynı anda <span className="text-primary font-bold">ücretsiz teklif alabilirsiniz.</span>
                    </p>
                    <button 
                      onClick={() => setFormOpen(true)}
                      className="w-full bg-[#10b981] hover:bg-[#059669] text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      Dakikalar İçinde Toplu Fiyat Teklifi Al <span className="text-lg">»</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-16">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[4/3] bg-muted rounded-xl"></div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-24 border border-dashed border-border rounded-xl">
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground opacity-30 mb-4" />
              <h3 className="text-xl font-semibold text-foreground">Henüz proje eklenmemiş</h3>
              <p className="text-muted-foreground mt-2">Şu an sistemde yayında olan bir proje bulunamadı.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6 max-w-5xl mx-auto">
              {projects.map((p) => {
                const citySlug = getCitySlug(p.city);
                return (
                  <div
                    key={p.id}
                    className="group bg-card rounded-xl border border-[#10b981]/40 hover:border-[#10b981] overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row"
                  >
                    <div className="relative w-full md:w-[45%] lg:w-[40%] aspect-video md:aspect-auto md:min-h-[260px] bg-muted shrink-0">
                      {p.cover_image ? (
                        <Image
                          src={p.cover_image}
                          alt={p.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 40vw"
                          className="object-cover object-center"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
                        </div>
                      )}
                      
                      {/* Badge Top Left */}
                      <div className="absolute top-4 left-0">
                        <span className="bg-[#10b981] text-white text-sm font-semibold px-4 py-1.5 rounded-r-md shadow-sm">
                          Öne Çıkan Proje
                        </span>
                      </div>
                      
                      {/* Firm info Bottom Left */}
                      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm shadow-md rounded-lg p-3 flex items-center gap-3 w-64 max-w-[calc(100%-2rem)]">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                          <span className="font-bold text-primary text-sm">{p.firms.company_name.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">{p.firms.company_name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" /> {p.city}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right: Content Box */}
                    <div className="p-6 md:p-8 flex-1 flex flex-col justify-center">
                      <h3 className="font-heading text-xl md:text-2xl font-bold text-foreground mb-2">
                        {p.title}
                      </h3>
                      <p className="text-muted-foreground font-medium mb-4">
                        {p.category.replace(/-/g, " ")} Kategorisi
                      </p>
                      
                      {p.description && (
                        <p className="text-sm text-muted-foreground/90 line-clamp-2 md:line-clamp-3 mb-6 max-w-2xl">
                          {p.description}
                        </p>
                      )}
                      
                      <div className="mt-auto flex justify-end">
                        <Link href={`/${p.category}/${citySlug}/${p.firms.slug}/${p.slug}`}>
                          <button className="bg-[#10b981] hover:bg-[#059669] text-white font-bold py-2.5 px-6 rounded transition-colors text-sm">
                            Projeyi İncele
                          </button>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
      <LeadFormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
