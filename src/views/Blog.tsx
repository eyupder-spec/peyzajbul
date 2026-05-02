"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Search, ArrowRight } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { CITIES } from "@/lib/cities";

const Blog = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");

  const { data: posts, isLoading } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("is_published", true)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = posts?.filter((p) => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== "all" && p.category_slug !== categoryFilter) return false;
    if (cityFilter !== "all" && p.city_slug !== cityFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        {/* Hero */}
        <div className="bg-primary py-12">
          <div className="container mx-auto px-4">
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-primary-foreground mb-2">
              Peyzaj Blog
            </h1>
            <p className="text-primary-foreground/70 max-w-2xl">
              Bahçe bakımı, peyzaj tasarımı ve dış mekan düzenleme hakkında uzman içerikleri
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-10">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-8">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Makale ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            {mounted && (
              <>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Hizmet Kategorisi" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Hizmetler</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.slug} value={c.slug}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Şehir" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Şehirler</SelectItem>
                    {CITIES.map((c) => (
                      <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Yükleniyor...</div>
          ) : filtered && filtered.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg transition-shadow relative"
                >
                  {post.cover_image_url && (
                    <div className="aspect-[16/9] overflow-hidden relative">
                      <Image
                        src={post.cover_image_url}
                        alt={post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-5">
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
                    <h2 className="font-heading text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-2">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{post.excerpt}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {post.published_at ? new Date(post.published_at).toLocaleDateString("tr-TR") : ""}
                      </div>
                      <span className="flex items-center gap-1 text-primary font-medium">
                        Devamını Oku <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-lg">Henüz blog yazısı yok.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Blog;

