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
    .select("id, company_name, description, city, district, address, phone, email, website, logo_url")
    .eq("slug", slug)
    .single();

  let reviews: any[] = [];
  if (firm) {
    const { data } = await supabase
      .from("firm_reviews")
      .select("reviewer_name, rating, comment, created_at, photo_url")
      .eq("firm_id", firm.id)
      .eq("is_approved", true);
    if (data) reviews = data;
  }

  const jsonLd: any = firm ? {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": firm.company_name,
    "image": firm.logo_url || "https://www.peyzajbul.com/icon.png",
    "@id": `https://www.peyzajbul.com/firma/${slug}`,
    "url": firm.website || `https://www.peyzajbul.com/firma/${slug}`,
    ...(firm.phone ? { "telephone": firm.phone } : {}),
    ...(firm.email ? { "email": firm.email } : {}),
    "address": {
      "@type": "PostalAddress",
      "streetAddress": firm.address || "",
      "addressLocality": firm.district || "",
      "addressRegion": firm.city || "",
      "addressCountry": "TR"
    },
    "description": firm.description ? firm.description.substring(0, 150) : `${firm.city} ${firm.district || ""} peyzaj firması.`,
  } : null;

  if (jsonLd && reviews.length > 0) {
    const avgRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": avgRating,
      "reviewCount": reviews.length,
      "bestRating": "5",
      "worstRating": "1",
    };
    jsonLd.review = reviews.map(r => ({
      "@type": "Review",
      "author": { "@type": "Person", "name": r.reviewer_name },
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": r.rating,
        "bestRating": "5",
        "worstRating": "1",
      },
      ...(r.comment ? { "reviewBody": r.comment } : {}),
      ...(r.photo_url ? { "image": r.photo_url } : {}),
      "datePublished": r.created_at?.split("T")[0],
    }));
  }

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
