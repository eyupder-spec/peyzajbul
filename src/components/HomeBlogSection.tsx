"use client";

import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Calendar, ArrowRight } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";

const HomeBlogSection = () => {
  const { data: posts } = useQuery({
    queryKey: ["home-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, cover_image_url, published_at, category_slug")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data;
    },
  });

  if (!posts || posts.length === 0) return null;

  return (
    <section className="py-16 bg-primary/5 border-y border-primary/10">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="font-heading text-3xl font-bold text-foreground mb-3">
            Blog & Rehberler
          </h2>
          <div className="w-16 h-1 bg-accent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground font-body max-w-xl mx-auto">
            Bahçe ve peyzaj dünyasından ipuçları, trendler ve uzman tavsiyeleri.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {posts.map((post) => {
            const catLabel = CATEGORIES.find((c) => c.slug === post.category_slug)?.label;
            return (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                {post.cover_image_url ? (
                  <div className="aspect-[16/9] overflow-hidden relative">
                    <Image
                      src={post.cover_image_url}
                      alt={post.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="aspect-[16/9] bg-muted/50 flex items-center justify-center text-4xl">
                    🌿
                  </div>
                )}
                <div className="p-4">
                  {catLabel && (
                    <Badge variant="secondary" className="text-xs mb-2">
                      {catLabel}
                    </Badge>
                  )}
                  <h3 className="font-heading text-sm font-semibold text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-2">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                      {post.excerpt}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {post.published_at
                        ? new Date(post.published_at).toLocaleDateString("tr-TR", {
                            day: "numeric",
                            month: "short",
                          })
                        : ""}
                    </div>
                    <span className="flex items-center gap-1 text-primary font-medium">
                      Oku <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <Link
            href="/blog"
            className="text-sm font-medium text-primary hover:underline font-body"
          >
            Tüm yazıları görüntüle →
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HomeBlogSection;
