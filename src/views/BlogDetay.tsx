"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import FirmCard from "@/components/FirmCard";
import Image from "next/image";
import LeadFormModal from "@/components/lead-form/LeadFormModal";
import BannerAd from "@/components/BannerAd";
import {
  ArrowLeft,
  Calendar,
  User,
  Clock,
  Share2,
  Facebook,
  Twitter as TwitterIcon,
  Linkedin,
  ChevronRight,
  Sparkles,
  MessageSquare,
  Bookmark,
  List,
  ChevronDown
} from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { CITIES } from "@/lib/cities";

// 1. Tip tanımını veritabanına göre netleştirdik
interface BlogPost {
  id: string;
  title: string;
  cover_image_url: string | null;
  cover_image_alt?: string | null;
  author_name: string;
  published_at: string | null;
  category_slug: string | null;
  city_slug: string | null;
  content: string | null;
  excerpt: string | null;
  slug: string;
}

// TOC Oluşturma Yardımcı Fonksiyonu
const generateTOC = (htmlStr: string) => {
  if (!htmlStr) return { html: "", toc: [] };
  const toc: { id: string; text: string; level: number }[] = [];
  const seenSlugs: Record<string, number> = {};

  const modifiedHtml = htmlStr.replace(/<h([2-4])([^>]*)>(.*?)<\/h\1>/gi, (match, levelStr, attrs, innerHtml) => {
    const level = parseInt(levelStr, 10);
    const text = innerHtml.replace(/<[^>]+>/g, '').trim();
    if (!text) return match;

    // Generate slug with correct Turkish character handling
    let slug = text
      .replace(/İ/g, "i")
      .replace(/I/g, "i")
      .replace(/ı/g, "i")
      .replace(/ğ/g, "g")
      .replace(/Ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/Ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/Ş/g, "s")
      .replace(/ö/g, "o")
      .replace(/Ö/g, "o")
      .replace(/ç/g, "c")
      .replace(/Ç/g, "c")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Deterministic slug handling for duplicates
    if (seenSlugs[slug] !== undefined) {
      seenSlugs[slug]++;
      slug = `${slug}-${seenSlugs[slug]}`;
    } else {
      seenSlugs[slug] = 0;
    }

    const uniqueId = slug;
    toc.push({ id: uniqueId, text, level });

    return `<h${level} id="${uniqueId}"${attrs}>${innerHtml}</h${level}>`;
  });

  return { html: modifiedHtml, toc };
};

// 2. Prop tanımına "post"u ekledik (Hata burada çözülüyor)
interface BlogDetayProps {
  post: BlogPost;
}

const BlogDetay = ({ post }: BlogDetayProps) => {
  const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [mentionedPlants, setMentionedPlants] = useState<any[]>([]);
  const [mentionedMaterials, setMentionedMaterials] = useState<any[]>([]);

  // Fetch all plants for auto-linking
  const { data: allPlants } = useQuery({
    queryKey: ["all-published-plants-for-blog"],
    queryFn: async () => {
      const { data } = await supabase.from("plants").select("id, name, slug, image_url").eq("is_published", true);
      return data || [];
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  // Fetch all materials for auto-linking
  const { data: allMaterials } = useQuery({
    queryKey: ["all-published-materials-for-blog"],
    queryFn: async () => {
      const { data } = await supabase.from("materials").select("id, name, slug, image_url").eq("is_published", true);
      return data || [];
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  // 3. ANA POST FETCH'İNİ SİLDİK (Gereksizdi, Server'dan geliyor)

  // İlgili firmaları çekmeye devam ediyoruz (Client-side olması iyi olur)
  const { data: relatedFirms } = useQuery({
    queryKey: ["related-firms", post?.category_slug, post?.city_slug],
    enabled: !!post,
    queryFn: async () => {
      let query = supabase
        .from("firms")
        .select("*")
        .eq("is_approved", true)
        .eq("is_active", true)
        .order("is_premium", { ascending: false })
        .limit(6);

      if (post?.city_slug) {
        const cityObj = CITIES.find((c) => c.slug === post.city_slug);
        if (cityObj) query = query.eq("city", cityObj.name);
      }

      if (post?.category_slug) {
        const catObj = CATEGORIES.find((c) => c.slug === post.category_slug);
        if (catObj) query = query.contains("services", [catObj.label]);
      }

      const { data } = await query;
      return data || [];
    },
  });

  // Son paylaşımlar
  const { data: recentPosts } = useQuery({
    queryKey: ["recent-blog-posts", post.slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, cover_image_url, published_at")
        .eq("is_published", true)
        .neq("slug", post.slug)
        .order("published_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  const categoryName = CATEGORIES.find((c) => c.slug === post.category_slug)?.label;
  const cityName = CITIES.find((c) => c.slug === post.city_slug)?.name;

  const wordCount = post.content?.replace(/<[^>]*>/g, "").split(/\s+/).length || 0;
  const readingTime = Math.ceil(wordCount / 200);

  const shareUrl = `https://www.peyzajbul.com/blog/${post.slug}`;
  const shareText = post.title;

  const { html: contentWithIds, toc } = useMemo(() => {
    try {
      if (!post.content) return { html: "", toc: [] };
      return generateTOC(post.content);
    } catch (e) {
      console.error("TOC Generation Error:", e);
      return { html: post.content || "", toc: [] };
    }
  }, [post.content]);

  const [sanitizedContent, setSanitizedContent] = useState(contentWithIds);

  useEffect(() => {
    const sanitize = async () => {
      try {
        // Dinamik import: Sadece tarayıcıda çalışır ve sunucunun jsdom yüklemesini engeller
        const DOMPurify = (await import("isomorphic-dompurify")).default;
        const sanitizeFn = (DOMPurify as any).sanitize || DOMPurify;

        if (typeof sanitizeFn === 'function') {
          // YouTube ve güvenli embed iframe'lerine izin ver
          let clean = sanitizeFn(contentWithIds, {
            ADD_TAGS: ["iframe"],
            ADD_ATTR: [
              "allow",
              "allowfullscreen",
              "frameborder",
              "scrolling",
              "src",
              "width",
              "height",
              "title",
              "loading",
              "class"
            ],
          });

          if (allPlants && allPlants.length > 0) {
            const foundPlants: any[] = [];
            allPlants.forEach((plant: any) => {
              // HTML tag'leri içinde olmayan kelimeleri bul
              // regex escape
              const escapedName = plant.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex = new RegExp(`(?![^<]*>)\\b(${escapedName})\\b`, 'i');
              if (regex.test(clean)) {
                foundPlants.push(plant);
                // Sadece ilk geçen yeri değiştir (global bayrağı 'g' yok)
                clean = clean.replace(regex, `<a href="/bitkiler/${plant.slug}" class="text-primary font-bold underline decoration-primary/30 underline-offset-4 hover:decoration-primary transition-all" title="${plant.name} Bitkisi">$1</a>`);
              }
            });
            setMentionedPlants(foundPlants);
          }
          if (allMaterials && allMaterials.length > 0) {
            const foundMaterials: any[] = [];
            allMaterials.forEach((material: any) => {
              const escapedName = material.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex = new RegExp(`(?![^<]*>)\\b(${escapedName})\\b`, 'i');
              if (regex.test(clean)) {
                foundMaterials.push(material);
                clean = clean.replace(regex, `<a href="/malzemeler/${material.slug}" class="text-amber-600 font-bold underline decoration-amber-600/30 underline-offset-4 hover:decoration-amber-600 transition-all" title="${material.name} Malzemesi">$1</a>`);
              }
            });
            setMentionedMaterials(foundMaterials);
          }

          setSanitizedContent(clean);
        }
      } catch (e) {
        console.error("Client-side Sanitization Error:", e);
      }
    };

    sanitize();
  }, [contentWithIds, allPlants, allMaterials]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        <div className="container mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8 overflow-x-auto whitespace-nowrap scrollbar-hide">
            <Link href="/" className="hover:text-primary transition-colors">Ana Sayfa</Link>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <Link href="/blog" className="hover:text-primary transition-colors">Blog</Link>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <span className="text-foreground font-medium truncate">{post.title}</span>
          </div>

          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              <div className="mb-8">
                <div className="flex flex-wrap items-center gap-2 mb-6">
                  {categoryName && (
                    <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10 hover:bg-primary/10 transition-colors">
                      {categoryName}
                    </Badge>
                  )}
                  {cityName && (
                    <Badge variant="outline" className="border-accent/30 text-accent font-medium">
                      {cityName}
                    </Badge>
                  )}
                </div>

                <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
                  {post.title}
                </h1>

                <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground border-y border-border/50 py-4 mb-10">
                  <div className="flex items-center gap-2 text-foreground">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-semibold">{post.author_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {post.published_at && new Date(post.published_at).toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {readingTime} dk okuma
                  </div>
                </div>

                {post.cover_image_url && (
                  <div className="relative aspect-video w-full overflow-hidden rounded-[2rem] shadow-2xl mb-12 ring-1 ring-border/50">
                    <Image
                      src={post.cover_image_url}
                      alt={post.cover_image_alt || post.title}
                      fill
                      className="object-cover transition-transform duration-700 hover:scale-105"
                      priority
                    />
                  </div>
                )}
              </div>

              {toc.length > 0 && (
                <div className="bg-muted/30 border border-border/50 rounded-2xl mb-12 shadow-sm overflow-hidden group/toc">
                  <div className="p-6 pb-2">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <List className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="font-heading font-bold text-lg text-foreground">
                        Bu Yazıda Neler Var?
                      </h3>
                    </div>
                    
                    <ul className="space-y-3 pt-4 border-t border-border/50 relative">
                      {(isTocOpen ? toc : toc.slice(0, 5)).map((item) => (
                        <li key={item.id} className={`${item.level === 3 ? "ml-4" : item.level === 4 ? "ml-8" : ""} transition-all duration-300`}>
                          <a
                            href={`#${item.id}`}
                            onClick={(e) => {
                              e.preventDefault();
                              document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              window.history.pushState(null, '', `#${item.id}`);
                            }}
                            className="text-muted-foreground hover:text-primary transition-all text-sm flex items-center gap-3 group/link py-1"
                          >
                            <span className="w-1.5 h-1.5 bg-primary/30 group-hover/link:bg-primary group-hover/link:scale-150 transition-all rounded-full shrink-0" />
                            <span className="group-hover/link:translate-x-1 transition-transform inline-block font-medium">{item.text}</span>
                          </a>
                        </li>
                      ))}
                      
                      {!isTocOpen && toc.length > 5 && (
                        <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-muted/30 to-transparent pointer-events-none" />
                      )}
                    </ul>
                  </div>

                  {toc.length > 5 && (
                    <button 
                      onClick={() => setIsTocOpen(!isTocOpen)}
                      className="w-full flex items-center justify-center p-4 text-xs font-bold text-primary hover:bg-primary/5 transition-all gap-2 border-t border-border/50 bg-muted/10"
                    >
                      {isTocOpen ? (
                        <>
                          <ChevronDown className="h-4 w-4 rotate-180" />
                          Listeyi Daralt
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4" />
                          Tümünü Gör ({toc.length} Başlık)
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
              
              {/* Reklam Alanı: Blog İçi (TOC Sonrası) */}
              <div className="mb-12">
                <BannerAd placement="blog_inline" className="w-full max-w-3xl mx-auto h-[90px] md:h-[120px] rounded-xl shadow-sm" />
              </div>

              <article
                className="prose prose-base md:prose-lg max-w-none text-foreground/90 
                  prose-headings:font-heading prose-headings:text-foreground prose-headings:font-bold
                  prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:scroll-mt-24
                  prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4 prose-h3:scroll-mt-24
                  prose-p:leading-relaxed prose-p:mb-6
                  prose-a:text-primary prose-a:font-semibold prose-a:no-underline hover:prose-a:underline
                  prose-img:rounded-3xl prose-img:shadow-xl prose-img:my-10
                  prose-blockquote:border-l-4 prose-blockquote:border-accent prose-blockquote:bg-accent/5 prose-blockquote:p-6 prose-blockquote:rounded-r-2xl prose-blockquote:italic
                  prose-strong:text-foreground prose-strong:font-bold"
                dangerouslySetInnerHTML={{
                  __html: sanitizedContent
                }}
              />

              {mentionedPlants.length > 0 && (
                <div className="mt-12 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-3xl p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="font-heading text-xl font-bold text-foreground">Bu Yazıda Bahsedilen Bitkiler</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {mentionedPlants.map(plant => (
                      <Link 
                        key={plant.id} 
                        href={`/bitkiler/${plant.slug}`}
                        className="group flex flex-col gap-3 p-3 rounded-2xl bg-card border border-border hover:border-emerald-400 hover:shadow-md transition-all duration-300"
                      >
                        {plant.image_url ? (
                          <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-muted">
                            <img src={plant.image_url} alt={plant.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          </div>
                        ) : (
                          <div className="w-full aspect-[4/3] rounded-xl bg-emerald-50 flex items-center justify-center text-4xl">🌿</div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-foreground group-hover:text-emerald-600 transition-colors leading-tight line-clamp-1">{plant.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">Bitki Rehberinde İncele →</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {mentionedMaterials.length > 0 && (
                <div className="mt-8 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900 rounded-3xl p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h3 className="font-heading text-xl font-bold text-foreground">Bu Yazıda Bahsedilen Malzemeler</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {mentionedMaterials.map(material => (
                      <Link 
                        key={material.id} 
                        href={`/malzemeler/${material.slug}`}
                        className="group flex flex-col gap-3 p-3 rounded-2xl bg-card border border-border hover:border-amber-400 hover:shadow-md transition-all duration-300"
                      >
                        {material.image_url ? (
                          <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-muted">
                            <img src={material.image_url} alt={material.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          </div>
                        ) : (
                          <div className="w-full aspect-[4/3] rounded-xl bg-amber-50 flex items-center justify-center text-4xl">🪨</div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-foreground group-hover:text-amber-600 transition-colors leading-tight line-clamp-1">{material.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">Malzeme Rehberinde İncele →</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-12 pt-8 border-t border-border flex items-center justify-between gap-4">
                <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Share2 className="h-4 w-4" /> Yazıyı Paylaş
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" className="rounded-full" asChild>
                    <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer">
                      <Facebook className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button variant="outline" size="icon" className="rounded-full" asChild>
                    <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer">
                      <TwitterIcon className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>

            <aside className="lg:col-span-1 space-y-8">
              <div className="sticky top-24 space-y-8">
                <div className="relative overflow-hidden rounded-3xl bg-primary p-8 text-primary-foreground shadow-2xl">
                  <div className="relative z-10">
                    <Sparkles className="h-8 w-8 text-accent mb-4" />
                    <h3 className="font-heading text-2xl font-bold mb-4">Bahçeniz İçin En İyi Teklifi Alın</h3>
                    <p className="text-primary-foreground/80 text-sm mb-6 leading-relaxed">
                      Projeniz için profesyonel peyzaj firmalarından hızlıca fiyat teklifi toplamak ister misiniz?
                    </p>
                    <Button
                      className="w-full bg-accent hover:bg-accent/90 text-white font-bold py-6 rounded-2xl shadow-xl transition-all"
                      onClick={() => setIsLeadFormOpen(true)}
                    >
                      Hemen Teklif İste
                    </Button>
                  </div>
                </div>

                {/* 4. Reklam Alanı: Sağ Sidebar (Blog Özel Dikey) */}
                <BannerAd 
                  placement="blog_sidebar" 
                  className="w-full min-h-[600px] rounded-3xl shadow-2xl mb-8 overflow-hidden" 
                />

                {/* Diğer Yazılar (Son Paylaşımlar) */}
                {recentPosts && recentPosts.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-heading font-bold text-lg px-2">Diğer Yazılar</h4>
                    <div className="space-y-4">
                      {recentPosts.map((rp) => (
                        <Link key={rp.id} href={`/blog/${rp.slug}`} className="group flex gap-3 p-2 rounded-2xl hover:bg-muted/50 transition-colors">
                          <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-border/50">
                            <img src={rp.cover_image_url || "/placeholder.jpg"} alt={rp.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          </div>
                          <div className="flex flex-col justify-center">
                            <h5 className="font-heading text-sm font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                              {rp.title}
                            </h5>
                            <span className="text-[10px] text-muted-foreground mt-1">
                              {rp.published_at && new Date(rp.published_at).toLocaleDateString("tr-TR")}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>

          {/* Related Firms */}
          {relatedFirms && relatedFirms.length > 0 && (
            <div className="mt-16">
              <h2 className="font-heading text-2xl font-bold text-foreground mb-6">
                {cityName ? `${cityName} İlindeki` : "İlgili"} Peyzaj Firmaları
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedFirms.map((firm) => (
                  <FirmCard key={firm.id} {...firm} services={firm.services || []} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <LeadFormModal open={isLeadFormOpen} onClose={() => setIsLeadFormOpen(false)} />
    </div>
  );
};

export default BlogDetay;