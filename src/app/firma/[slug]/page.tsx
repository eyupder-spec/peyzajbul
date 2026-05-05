import { createClient } from "@/lib/supabase/server";
import { extractFirmIdFromSlug } from "@/lib/firmUtils";
import FirmaDetayClient from "@/views/FirmaDetay";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const supabase = await createClient();
  const firmId = extractFirmIdFromSlug(slug);

  const { data: firm } = await supabase
    .from("firms")
    .select("company_name, description, city, district")
    .eq("slug", slug)
    .single();

  if (!firm) {
    // Fallback: try by id prefix
    const { data: firmById } = await supabase
      .from("firms")
      .select("company_name, description, city, district")
      .like("id", `${firmId}%`)
      .single();
    if (!firmById) return { title: "Firma Bulunamadı" };
    const fallbackTitle = `${firmById.company_name} - ${firmById.city} Peyzaj Firması | Peyzajbul`;
    const fallbackDesc = `${firmById.city} ${firmById.district || ""} bölgesinde hizmet veren ${firmById.company_name} peyzaj firması.`;
    return { title: fallbackTitle, description: fallbackDesc, openGraph: { title: fallbackTitle, description: fallbackDesc, type: "website" } };
  }

  const title = `${firm.company_name} - ${firm.city} Peyzaj Firması | Peyzajbul`;
  const description = `${firm.city} ${firm.district || ""} bölgesinde hizmet veren ${firm.company_name} peyzaj firması hakkında detaylı bilgi, hizmetler ve yorumlar.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://www.peyzajbul.com/firma/${slug}`,
    },
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

export default async function FirmaDetayPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const supabase = await createClient();
  
  const { data: firm } = await supabase
    .from("firms")
    .select("company_name, description, city, district, address, phone, email, logo_url")
    .eq("slug", slug)
    .single();

  const jsonLd = firm ? {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": firm.company_name,
    "image": firm.logo_url || "https://www.peyzajbul.com/icon.png",
    "@id": `https://www.peyzajbul.com/firma/${slug}`,
    "url": `https://www.peyzajbul.com/firma/${slug}`,
    "telephone": firm.phone,
    "email": firm.email,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": firm.address || "",
      "addressLocality": firm.district || "",
      "addressRegion": firm.city || "",
      "addressCountry": "TR"
    },
    "description": firm.description || `${firm.city} ${firm.district || ""} peyzaj firması.`,
  } : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <FirmaDetayClient slug={slug} />
    </>
  );
}

// ISR: Her 1 saatte bir arka planda yenileme yapılması için (Opsiyonel)
export const revalidate = 3600;
