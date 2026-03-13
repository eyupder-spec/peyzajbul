import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getCategoryBySlug } from "@/lib/categories";
import ProjeDetayClient from "@/views/ProjeDetay";

type Params = {
  kategori: string;
  il: string;
  firma: string;
  proje: string;
};

export async function generateMetadata(
  props: { params: Promise<Params> }
): Promise<Metadata> {
  try {
    const params = await props.params;
    const { kategori, il, firma, proje } = params;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: project } = await (supabase.from as any)("projects")
      .select("title, description, cover_image, city, category, firms!inner(company_name, city, slug)")
      .eq("slug", proje)
      .eq("status", "published")
      .single();

    if (!project) return { title: "Proje Bulunamadı | Peyzajbul" };

    const firmName = (project as any).firms?.company_name || "";
    const cityName = (project as any).firms?.city || il;
    const cat = getCategoryBySlug(project.category);
    const catLabel = cat?.label || project.category;

    const title = `${project.title} | ${firmName} | ${cityName} — Peyzajbul`;
    const description = project.description
      ? project.description.slice(0, 155)
      : `${firmName} tarafından ${cityName} ilinde gerçekleştirilen ${catLabel} projesi.`;

    const baseUrl = "https://peyzajbul.com";
    const canonical = `${baseUrl}/${kategori}/${il}/${firma}/${proje}`;

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title,
        description,
        type: "article",
        url: canonical,
        images: project.cover_image ? [{ url: project.cover_image, width: 1200, height: 630 }] : undefined,
      },
    };
  } catch (error) {
    console.error("Error in generateMetadata:", error);
    return { title: "Hata" };
  }
}

export async function generateStaticParams() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: projects, error } = await (supabase.from as any)("projects")
      .select("slug, category, city, firms!inner(slug)")
      .eq("status", "published");

    if (error) {
      console.error("Supabase Error in generateStaticParams:", error);
      return [];
    }

    if (!projects) return [];

    return (projects as any[]).map((p: any) => ({
      kategori: p.category || "kategori",
      il: p.city || "il",
      firma: p.firms?.slug || "firma",
      proje: p.slug || "proje",
    }));
  } catch (err) {
    console.error("Error in generateStaticParams:", err);
    return [];
  }
}

export const revalidate = 3600;

export default async function ProjeDetayPage(
  props: { params: Promise<Params> }
) {
  const params = await props.params;
  return <ProjeDetayClient params={params} />;
}
