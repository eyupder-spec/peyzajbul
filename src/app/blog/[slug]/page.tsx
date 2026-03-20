import { createClient } from "@/lib/supabase/server";
import BlogDetayClient from "@/views/BlogDetay";
import { Metadata } from "next";

// 1. Metadata: Sosyal medya (OG) etiketleri eklendi
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const supabase = await createClient();
  const { data: post } = await supabase
    .from("blog_posts")
    .select("title, excerpt, cover_image_url")
    .eq("slug", resolvedParams.slug)
    .single();

  if (!post) return { title: "Yazı Bulunamadı" };

  const baseUrl = "https://www.peyzajbul.com";

  return {
    title: `${post.title} | Peyzajbul Blog`,
    description: post.excerpt || `${post.title} hakkında detaylı bilgi.`,
    openGraph: {
      title: post.title,
      description: post.excerpt || "",
      url: `${baseUrl}/blog/${resolvedParams.slug}`,
      images: post.cover_image_url ? [{ url: post.cover_image_url }] : [],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt || "",
      images: post.cover_image_url ? [post.cover_image_url] : [],
    },
  };
}

export const revalidate = 3600;

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const supabase = await createClient();

  // Tüm datayı tek seferde çekiyoruz
  const { data: post } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", resolvedParams.slug)
    .single();

  if (!post) return <div className="p-10 text-center">Yazı bulunamadı.</div>;

  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting", // Daha spesifik bir tip
    "headline": post.title,
    "description": post.excerpt || "",
    "image": post.cover_image_url ? [post.cover_image_url] : [],
    "datePublished": post.created_at,
    "dateModified": post.updated_at || post.created_at,
    "author": post.author_name ? [
      {
        "@type": "Person",
        "name": post.author_name
      }
    ] : {
      "@type": "Organization",
      "name": "Peyzajbul",
      "url": "https://www.peyzajbul.com"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Peyzajbul",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.peyzajbul.com/logo.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://www.peyzajbul.com/blog/${resolvedParams.slug}`
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      {/* 💡 KRİTİK: post verisini direkt prop olarak gönderiyoruz ki client tekrar fetch yapmasın! */}
      <BlogDetayClient post={post} />
    </>
  );
}