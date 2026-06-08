import { createClient } from "@/lib/supabase/server";
import BlogDetayClient from "@/views/BlogDetay";
import { Metadata } from "next";
import { notFound } from "next/navigation";

// 1. Metadata: Sosyal medya (OG) etiketleri ve hata yönetimi
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try {
    const resolvedParams = await params;
    const supabase = await createClient();
    const { data: post, error } = await supabase
      .from("blog_posts")
      .select("title, excerpt, cover_image_url")
      .eq("slug", resolvedParams.slug)
      .maybeSingle();

    if (error || !post) return { title: "Yazı Bulunamadı | Peyzajbul Blog" };

    const baseUrl = "https://www.peyzajbul.com";

    return {
      title: `${post.title} | Peyzajbul Blog`,
      description: post.excerpt || `${post.title} hakkında detaylı bilgi.`,
      alternates: {
        canonical: `${baseUrl}/blog/${resolvedParams.slug}`,
      },
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
  } catch (e) {
    console.error("Metadata Generation Error:", e);
    return { title: "Peyzajbul Blog" };
  }
}

export const revalidate = 3600;

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const supabase = await createClient();

  // Tüm datayı maybesingle ile çekiyoruz
  const { data: post, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", resolvedParams.slug)
    .maybeSingle();

  if (error || !post) {
    notFound();
  }

  const wordCount = post.content ? post.content.replace(/<[^>]+>/g, "").split(/\s+/).filter(Boolean).length : 0;
  const articleBody = post.content ? post.content.replace(/<[^>]+>/g, "").substring(0, 500) : "";

  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title || "Başlıksız Yazı",
    "description": post.excerpt || "",
    "image": post.cover_image_url
      ? [{
          "@type": "ImageObject",
          "url": post.cover_image_url,
          "width": 1200,
          "height": 630
        }]
      : [{
          "@type": "ImageObject",
          "url": "https://www.peyzajbul.com/og-image.jpg",
          "width": 1200,
          "height": 630
        }],
    "url": `https://www.peyzajbul.com/blog/${resolvedParams.slug}`,
    "inLanguage": "tr-TR",
    "datePublished": post.published_at || post.created_at || new Date().toISOString(),
    "dateModified": post.updated_at || post.published_at || post.created_at || new Date().toISOString(),
    ...(wordCount > 0 ? { "wordCount": wordCount } : {}),
    ...(articleBody ? { "articleBody": articleBody } : {}),
    ...(post.tags && post.tags.length > 0 ? { "keywords": Array.isArray(post.tags) ? post.tags.join(", ") : post.tags } : { "keywords": "peyzaj, bahçe, peyzaj tasarım, bahçe bakımı" }),
    "author": post.author_name
      ? [{ "@type": "Person", "name": post.author_name }]
      : [{ "@type": "Organization", "name": "Peyzajbul", "url": "https://www.peyzajbul.com" }],
    "publisher": {
      "@type": "Organization",
      "name": "Peyzajbul",
      "url": "https://www.peyzajbul.com",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.peyzajbul.com/icon.png",
        "width": 512,
        "height": 512
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://www.peyzajbul.com/blog/${resolvedParams.slug}`
    },
    "isPartOf": {
      "@type": "Blog",
      "@id": "https://www.peyzajbul.com/blog",
      "name": "Peyzajbul Blog",
      "publisher": {
        "@type": "Organization",
        "name": "Peyzajbul"
      }
    }
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Ana Sayfa", "item": "https://www.peyzajbul.com" },
      { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://www.peyzajbul.com/blog" },
      { "@type": "ListItem", "position": 3, "name": post.title, "item": `https://www.peyzajbul.com/blog/${resolvedParams.slug}` }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <BlogDetayClient post={post} />
    </>
  );
}