"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Star, Building2, ArrowRight, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { getCategoryBySlug } from "@/lib/categories";

type ProjectData = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  category: string;
  city: string;
  status: string;
  firm_id: string;
};

type FirmData = {
  id: string;
  company_name: string;
  slug: string;
  city: string;
  district: string | null;
  phone: string;
  logo_url: string | null;
  avg_rating: number | null;
  review_count: number;
};

type ProjectImage = {
  id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
};

type RelatedProject = {
  id: string;
  title: string;
  slug: string;
  cover_image: string | null;
  category: string;
  city: string;
};

export default function ProjeDetayClient({ params }: { params: { kategori: string; il: string; firma: string; proje: string } }) {
  const [project, setProject] = useState<ProjectData | null>(null);
  const [firm, setFirm] = useState<FirmData | null>(null);
  const [images, setImages] = useState<ProjectImage[]>([]);
  const [related, setRelated] = useState<RelatedProject[]>([]);
  const [totalProjects, setTotalProjects] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      // 1. Load project
      const { data: projData } = await (supabase.from as any)("projects")
        .select("*")
        .eq("slug", params.proje)
        .eq("status", "published")
        .single();

      if (!projData) { setLoading(false); return; }
      setProject(projData as ProjectData);

      // 2. Load firm
      const { data: firmData } = await supabase
        .from("firms")
        .select("id, company_name, slug, city, district, phone, logo_url, avg_rating, review_count")
        .eq("id", projData.firm_id)
        .single();

      if (firmData) setFirm(firmData as any);

      // 3. Load images
      const { data: imgData } = await (supabase.from as any)("project_images")
        .select("*")
        .eq("project_id", projData.id)
        .order("sort_order", { ascending: true });

      setImages((imgData as ProjectImage[]) || []);

      // 4. Related projects (same firm, max 3)
      const { data: relData } = await (supabase.from as any)("projects")
        .select("id, title, slug, cover_image, category, city")
        .eq("firm_id", projData.firm_id)
        .eq("status", "published")
        .neq("id", projData.id)
        .limit(3);

      setRelated((relData as RelatedProject[]) || []);

      // 5. Total project count for this firm
      const { count } = await (supabase.from as any)("projects")
        .select("id", { count: "exact", head: true })
        .eq("firm_id", projData.firm_id)
        .eq("status", "published");

      setTotalProjects(count || 0);

      setLoading(false);
    };
    load();
  }, [params.proje]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen pt-20 flex flex-col items-center justify-center gap-4">
          <h1 className="text-xl font-bold text-muted-foreground animate-pulse">Proje Yükleniyor...</h1>
        </div>
      </>
    );
  }

  if (!project) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen pt-20 flex flex-col items-center justify-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">Proje Bulunamadı</h1>
          <p className="text-muted-foreground">Bu proje mevcut değil veya henüz yayınlanmamış.</p>
          <Link href="/">
            <Button>Ana Sayfaya Dön</Button>
          </Link>
        </div>
      </>
    );
  }

  const cat = getCategoryBySlug(project.category);
  const allGallery = project.cover_image
    ? [{ id: "cover", image_url: project.cover_image, caption: null as string | null, sort_order: -1 }, ...images]
    : images;

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16 bg-background">
        <div className="container mx-auto max-w-5xl px-4 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8 overflow-x-auto whitespace-nowrap scrollbar-hide">
            <Link href="/" className="hover:text-primary transition-colors">Ana Sayfa</Link>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <Link href="/projeler" className="hover:text-primary transition-colors">Projeler</Link>
            <ChevronRight className="h-3 w-3 shrink-0" />
            {cat && (
              <>
                <Link href={`/projeler?kategori=${cat.slug}`} className="hover:text-primary transition-colors">{cat.label}</Link>
                <ChevronRight className="h-3 w-3 shrink-0" />
              </>
            )}
            <span className="text-foreground font-medium truncate">{project.title}</span>
          </div>

          <div className="mb-10">
            {/* Category Badge */}
            {cat && (
              <Badge variant="secondary" className="mb-6 bg-primary/5 text-primary border-primary/10 hover:bg-primary/10 transition-colors py-1 px-3">
                {cat.icon} {cat.label}
              </Badge>
            )}

            <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
              {project.title}
            </h1>

            {firm && (
              <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground border-y border-border/50 py-4 mb-10">
                <div className="flex items-center gap-2 text-foreground">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-semibold">{firm.company_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {firm.city}{firm.district ? ` / ${firm.district}` : ""}
                </div>
                {images.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {images.slice(0, 3).map((img, i) => (
                        <div key={i} className="w-6 h-6 rounded-full border-2 border-background overflow-hidden">
                          <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                    <span>{images.length} Görsel</span>
                  </div>
                )}
              </div>
            )}

            {/* Cover Image - Inside container for a premium feel */}
            {project.cover_image && (
              <div className="relative aspect-video w-full overflow-hidden rounded-[2rem] shadow-2xl mb-12 ring-1 ring-border/50 group">
                <img 
                  src={project.cover_image} 
                  alt={project.title} 
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-16">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Description */}
              {project.description && (
                <div className="prose prose-lg max-w-none text-foreground/90">
                  {project.description.split("\n").map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              )}

              {/* Gallery Grid */}
              {images.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-4">Proje Görselleri</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {images.map((img, idx) => (
                      <button
                        key={img.id}
                        className="aspect-[4/3] rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors cursor-pointer"
                        onClick={() => setLightboxIdx(idx)}
                      >
                        <img src={img.image_url} alt={img.caption || `Görsel ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar — Firm Card */}
            <div className="space-y-6">
              {firm && (
                <Card className="border-border sticky top-20">
                  <CardContent className="p-5 space-y-4">
                    {/* Firm header */}
                    <div className="flex items-center gap-3">
                      {firm.logo_url ? (
                        <img src={firm.logo_url} alt={firm.company_name} className="w-14 h-14 rounded-lg object-cover border border-border" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-primary" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-foreground">{firm.company_name}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {firm.city}{firm.district ? ` / ${firm.district}` : ""}
                        </p>
                      </div>
                    </div>

                    {/* Rating */}
                    {firm.avg_rating && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${i < Math.round(firm.avg_rating!) ? "text-yellow-500 fill-current" : "text-muted"}`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {firm.avg_rating.toFixed(1)} ({firm.review_count} değerlendirme)
                        </span>
                      </div>
                    )}

                    {/* Phone */}
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${firm.phone}`} className="text-foreground hover:text-primary transition-colors">{firm.phone}</a>
                    </div>

                    {/* Stats */}
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-primary">{totalProjects}</p>
                      <p className="text-xs text-muted-foreground">Toplam Proje</p>
                    </div>

                    {/* Link to firm */}
                    <Link href={`/firma/${firm.slug}`} className="block">
                      <Button className="w-full gap-2">
                        Firma Profilini İncele <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Related Projects */}
          {related.length > 0 && (
            <section className="mt-12 border-t border-border pt-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">Bu Firmanın Diğer Projeleri</h2>
                {totalProjects > 3 && firm && (
                  <Link href={`/firma/${firm.slug}`} className="text-sm text-primary hover:underline flex items-center gap-1">
                    Tüm Projeler <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {related.map((rp) => {
                  const rpCat = getCategoryBySlug(rp.category);
                  const rpUrl = `/${rp.category}/${rp.city}/${firm?.slug || ""}/${rp.slug}`;
                  return (
                    <Link key={rp.id} href={rpUrl}>
                      <Card className="border-border hover:border-primary/50 transition-colors overflow-hidden group">
                        <div className="aspect-video bg-muted overflow-hidden">
                          {rp.cover_image ? (
                            <img src={rp.cover_image} alt={rp.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <Building2 className="h-8 w-8 opacity-50" />
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{rp.title}</h3>
                          {rpCat && <p className="text-xs text-muted-foreground mt-1">{rpCat.icon} {rpCat.label}</p>}
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />

      {/* Lightbox */}
      {lightboxIdx !== null && images.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setLightboxIdx(null)}>
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl font-light"
            onClick={() => setLightboxIdx(null)}
          >
            ✕
          </button>
          {lightboxIdx > 0 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx - 1); }}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {lightboxIdx < images.length - 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx + 1); }}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
          <img
            src={images[lightboxIdx].image_url}
            alt={images[lightboxIdx].caption || "Görsel"}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          {images[lightboxIdx].caption && (
            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 text-sm bg-black/50 px-4 py-2 rounded-lg">
              {images[lightboxIdx].caption}
            </p>
          )}
        </div>
      )}
    </>
  );
}
