import { Metadata } from "next";
import ProjelerClient from "@/views/Projeler";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Tüm Projeler | Peyzajbul",
  description: "Türkiye'nin en iyi peyzaj firmalarının yayınlamış olduğu güncel peyzaj ve bahçe tasarımı projeleri. İlham almak için inceleyin.",
  alternates: {
    canonical: "https://www.peyzajbul.com/projeler",
  },
};

export default async function ProjelerPage() {
  const supabase = await createClient();

  const { data, error } = await (supabase.from as any)("projects")
    .select(`
      id, title, slug, description, cover_image, category, city, created_at,
      firms!inner ( slug, company_name, is_approved, is_active, is_premium )
    `)
    .eq("status", "published")
    .eq("firms.is_approved", true)
    .eq("firms.is_active", true)
    .eq("firms.is_premium", true)
    .order("created_at", { ascending: false });

  const initialProjects = !error && data ? (data as any[]) : [];

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Ana Sayfa", "item": "https://www.peyzajbul.com" },
      { "@type": "ListItem", "position": 2, "name": "Projeler", "item": "https://www.peyzajbul.com/projeler" },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <ProjelerClient initialProjects={initialProjects} />
    </>
  );
}
