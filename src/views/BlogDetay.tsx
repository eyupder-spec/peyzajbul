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
import { ArrowLeft, Calendar, User } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { CITIES } from "@/lib/cities";
import Image from "next/image";

interface BlogDetayProps {
  slug?: string;
}

const BlogDetay = ({ slug: propSlug }: BlogDetayProps) => {
  const params = useParams();
  const slug = propSlug || params?.slug as string;

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
      return data;
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

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        {/* Cover */}
        {post.cover_image_url && (
          <div className="w-full h-64 md:h-96 overflow-hidden relative">
            <Image src={post.cover_image_url} alt={post.title} fill className="object-cover" priority />
          </div>
        )}

        <div className="container mx-auto px-4 py-10">
          <div className="max-w-3xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
              <Link href="/" className="hover:text-primary">Ana Sayfa</Link>
              <span>/</span>
              <Link href="/blog" className="hover:text-primary">Blog</Link>
              <span>/</span>
              <span className="text-foreground">{post.title}</span>
            </div>

            {/* Tags */}
            <div className="flex items-center gap-2 mb-4">
              {categoryName && <Badge variant="secondary">{categoryName}</Badge>}
              {cityName && <Badge variant="outline">{cityName}</Badge>}
            </div>

            <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
              {post.title}
            </h1>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {post.author_name}
              </div>
              {post.published_at && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(post.published_at).toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" })}
                </div>
              )}
            </div>

            {/* Content */}
            <article
              className="prose prose-sm md:prose-base max-w-none text-foreground prose-headings:font-heading prose-headings:text-foreground prose-a:text-primary prose-img:rounded-lg"
              dangerouslySetInnerHTML={{ __html: post.content || "" }}
            />
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
    </div>
  );
};

export default BlogDetay;

