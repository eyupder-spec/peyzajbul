import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Calendar, ArrowRight, BookOpen } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { CITIES } from "@/lib/cities";

interface RelatedBlogPostsProps {
  citySlug?: string;
  categorySlug?: string;
  title?: string;
  limit?: number;
}

const RelatedBlogPosts = ({ citySlug, categorySlug, title, limit = 6 }: RelatedBlogPostsProps) => {
  const { data: posts } = useQuery({
    queryKey: ["related-blog-posts", citySlug, categorySlug],
    queryFn: async () => {
      let query = supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, cover_image_url, published_at, category_slug, city_slug")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(limit);

      if (citySlug) query = query.eq("city_slug", citySlug);
      if (categorySlug) query = query.eq("category_slug", categorySlug);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!(citySlug || categorySlug),
  });

  if (!posts || posts.length === 0) return null;

  const heading = title || "İlgili Blog Yazıları";

  return (
    <section className="mt-16">
      <h3 className="font-heading text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-primary" />
        {heading}
      </h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => (
          <Link
            key={post.id}
            to={`/blog/${post.slug}`}
            className="group bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg transition-shadow"
          >
            {post.cover_image_url && (
              <div className="aspect-[16/9] overflow-hidden">
                <img
                  src={post.cover_image_url}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                {post.category_slug && (
                  <Badge variant="secondary" className="text-xs">
                    {CATEGORIES.find((c) => c.slug === post.category_slug)?.label || post.category_slug}
                  </Badge>
                )}
                {post.city_slug && (
                  <Badge variant="outline" className="text-xs">
                    {CITIES.find((c) => c.slug === post.city_slug)?.name || post.city_slug}
                  </Badge>
                )}
              </div>
              <h4 className="font-heading text-base font-semibold text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-2">
                {post.title}
              </h4>
              {post.excerpt && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{post.excerpt}</p>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {post.published_at ? new Date(post.published_at).toLocaleDateString("tr-TR") : ""}
                </div>
                <span className="flex items-center gap-1 text-primary font-medium">
                  Oku <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default RelatedBlogPosts;
