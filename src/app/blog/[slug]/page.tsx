import { createClient } from "@/lib/supabase/server";
import BlogDetayClient from "@/views/BlogDetay";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const supabase = await createClient();
  const { data: post } = await supabase
    .from("blog_posts")
    .select("title, excerpt")
    .eq("slug", resolvedParams.slug)
    .single();

  if (!post) return { title: "Yazı Bulunamadı" };

  return {
    title: `${post.title} | Peyzajbul Blog`,
    description: post.excerpt || `${post.title} hakkında detaylı bilgi.`,
  };
}

export const revalidate = 3600;

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  return <BlogDetayClient slug={resolvedParams.slug} />;
}
