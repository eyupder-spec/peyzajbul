"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import FirmCard from "@/components/FirmCard";
import Image from "next/image";
import { useState } from "react";
import LeadFormModal from "@/components/lead-form/LeadFormModal";
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
  Bookmark
} from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { CITIES } from "@/lib/cities";

interface BlogPost {
  title: string;
  cover_image_url: string | null;
  cover_image_alt?: string | null;
  author_name: string;
  published_at: string | null;
  category_slug: string | null;
  city_slug: string | null;
  content: string | null;
  excerpt: string | null;
}

interface BlogDetayProps {
  slug?: string;
}

const BlogDetay = ({ slug: propSlug }: BlogDetayProps) => {
  const params = useParams();
  const slug = propSlug || params?.slug as string;
  const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as BlogPost;
    },
  });

  // Related firms by category or city
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

      // Match by city name from city_slug
      if (post?.city_slug) {
        const cityObj = CITIES.find((c) => c.slug === post.city_slug);
        if (cityObj) query = query.eq("city", cityObj.name);
      }

      // Match by service category
      if (post?.category_slug) {
        const catObj = CATEGORIES.find((c) => c.slug === post.category_slug);
        if (catObj) query = query.contains("services", [catObj.label]);
      }

      const { data } = await query;
      return data || [];
    },
  });

  // Recent posts for sidebar
  const { data: recentPosts } = useQuery({
    queryKey: ["recent-blog-posts", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, cover_image_url, published_at")
        .eq("is_published", true)
        .neq("slug", slug)
        .order("published_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center pt-24">
          <p className="text-muted-foreground">Yükleniyor...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center flex-col gap-4 pt-24">
          <p className="text-muted-foreground text-lg">Yazı bulunamadı</p>
          <Link href="/blog"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Blog'a Dön</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  const categoryName = CATEGORIES.find((c) => c.slug === post.category_slug)?.label;
  const cityName = CITIES.find((c) => c.slug === post.city_slug)?.name;

  // Reading time calculation
  const wordCount = post.content?.replace(/<[^>]*>/g, "").split(/\s+/).length || 0;
  const readingTime = Math.ceil(wordCount / 200);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = post.title;

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
            {/* Main Content Column */}
            <div className="lg:col-span-2">
              <div className="mb-8">
                {/* Tags */}
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

                {/* Cover Image - Inside container for a more premium magazine feel */}
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

              {/* Enhanced Article Styling */}
              <article 
                className="prose prose-base md:prose-lg max-w-none text-foreground/90 
                  prose-headings:font-heading prose-headings:text-foreground prose-headings:font-bold
                  prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6
                  prose-p:leading-relaxed prose-p:mb-6
                  prose-a:text-primary prose-a:font-semibold prose-a:no-underline hover:prose-a:underline
                  prose-img:rounded-3xl prose-img:shadow-xl prose-img:my-10
                  prose-blockquote:border-l-4 prose-blockquote:border-accent prose-blockquote:bg-accent/5 prose-blockquote:p-6 prose-blockquote:rounded-r-2xl prose-blockquote:italic
                  prose-strong:text-foreground prose-strong:font-bold
                  prose-ul:my-6 prose-li:mb-2
                  prose-table:border-collapse prose-table:w-full prose-table:my-8
                  prose-table:border prose-table:border-border
                  prose-th:border prose-th:border-border prose-th:bg-muted/50 prose-th:p-4 prose-th:text-left
                  prose-td:border prose-td:border-border prose-td:p-4"
                dangerouslySetInnerHTML={{ __html: post.content || "" }}
              />

              {/* Social Share Bottom (Mobile only mostly or for secondary access) */}
              <div className="mt-12 pt-8 border-t border-border flex items-center justify-between gap-4">
                <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Share2 className="h-4 w-4" /> Yazıyı Paylaş
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" className="rounded-full hover:bg-[#1877F2] hover:text-white transition-colors" asChild>
                    <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer">
                      <Facebook className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button variant="outline" size="icon" className="rounded-full hover:bg-[#1DA1F2] hover:text-white transition-colors" asChild>
                    <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer">
                      <TwitterIcon className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button variant="outline" size="icon" className="rounded-full hover:bg-[#0A66C2] hover:text-white transition-colors" asChild>
                    <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer">
                      <Linkedin className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>

            {/* Sticky Sidebar */}
            <aside className="lg:col-span-1 space-y-8">
              <div className="sticky top-24 space-y-8">
                {/* GET QUOTE CTA CARD - PREMIUM */}
                <div className="relative overflow-hidden rounded-3xl bg-primary p-8 text-primary-foreground shadow-2xl">
                  <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-accent/20 rounded-full blur-3xl" />
                  <div className="relative z-10">
                    <Sparkles className="h-8 w-8 text-accent mb-4" />
                    <h3 className="font-heading text-2xl font-bold mb-4">Bahçeniz İçin En İyi Teklifi Alın</h3>
                    <p className="text-primary-foreground/80 text-sm mb-6 leading-relaxed">
                      Projeniz için profesyonel peyzaj firmalarından hızlıca fiyat teklifi toplamak ister misiniz?
                    </p>
                    <Button 
                      className="w-full bg-accent hover:bg-accent/90 text-white font-bold py-6 rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                      onClick={() => setIsLeadFormOpen(true)}
                    >
                      Hemen Teklif İste
                    </Button>
                  </div>
                </div>

                {/* SOCIAL SHARE - SIDEBAR */}
                <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                  <h4 className="font-heading font-bold mb-4 flex items-center gap-2">
                    <Bookmark className="h-4 w-4 text-accent" /> Bu Yazıyı Kaydet & Paylaş
                  </h4>
                  <div className="flex gap-3">
                    <Button variant="secondary" size="icon" title="Facebook'ta Paylaş" className="flex-1 h-12 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all" asChild>
                      <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer">
                        <Facebook className="h-5 w-5" />
                      </a>
                    </Button>
                    <Button variant="secondary" size="icon" title="X'te Paylaş" className="flex-1 h-12 rounded-xl bg-sky-50 text-sky-500 hover:bg-sky-500 hover:text-white transition-all" asChild>
                      <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer">
                        <TwitterIcon className="h-5 w-5" />
                      </a>
                    </Button>
                    <Button variant="secondary" size="icon" title="LinkedIn'de Paylaş" className="flex-1 h-12 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-700 hover:text-white transition-all" asChild>
                      <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer">
                        <Linkedin className="h-5 w-5" />
                      </a>
                    </Button>
                  </div>
                </div>

                {/* HELP CARD */}
                <div className="bg-accent/5 border border-accent/20 rounded-3xl p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <MessageSquare className="h-5 w-5 text-accent" />
                    <h4 className="font-heading font-bold">Yardıma mı ihtiyacınız var?</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Hangi hizmetin size uygun olduğuna karar veremiyor musunuz? Uzmanlarımıza danışın.
                  </p>
                  <Link href="/iller" className="text-sm font-bold text-accent hover:underline flex items-center gap-1">
                    Bölgenizdeki uzmanları bulun <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>

                {/* RECENT POSTS - SIDEBAR */}
                {recentPosts && recentPosts.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-heading font-bold text-lg px-2">Son Paylaşımlar</h4>
                    <div className="space-y-4">
                      {recentPosts.map((rp) => (
                        <Link key={rp.id} href={`/blog/${rp.slug}`} className="group flex gap-3 p-2 rounded-2xl hover:bg-muted/50 transition-colors">
                          <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-border/50">
                            <img src={rp.cover_image_url || "/placeholder.jpg"} alt={rp.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          </div>
                          <div className="flex flex-col justify-center">
                            <h5 className="text-sm font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
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

      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post.title,
        "image": post.cover_image_url ? [post.cover_image_url] : [],
        "datePublished": post.published_at,
        "dateModified": post.published_at,
        "author": [{
          "@type": "Person",
          "name": post.author_name,
        }],
        "publisher": {
          "@type": "Organization",
          "name": "Peyzajbul",
          "logo": {
            "@type": "ImageObject",
            "url": "https://peyzajbul.com/logo.png"
          }
        },
        "description": post.excerpt || post.title
      })}</script>
    </div>
  );
};

export default BlogDetay;

