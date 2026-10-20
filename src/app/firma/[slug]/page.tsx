import { createClient } from "@/lib/supabase/server";
import { extractFirmIdFromSlug } from "@/lib/firmUtils";
import { getCitySlug } from "@/lib/cities";
import { JsonLd } from "@/lib/jsonLd";
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

// Firm-supplied website is only advertised as schema.org `url` when it is a real http(s) address.
function getSafeWebsiteUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  try {
    const parsed = new URL(raw.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export default async function FirmaDetayPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const supabase = await createClient();

  // Full firm data for SSR (same fields as FirmDetailContent uses)
  const { data: firm } = await supabase
    .from("firms")
    .select("id, company_name, city, district, services, description, phone, email, is_premium, premium_until, is_claimed, google_maps_url, detailed_services, slug, website, logo_url, social_instagram, social_facebook, social_x, social_youtube, social_linkedin, response_time, trust_badges, faq_items, before_after, portfolio_items, address, youtube_videos, firm_gallery(image_url)")
    .eq("slug", slug)
    .eq("is_approved", true)
    .eq("is_active", true)
    .single();

  // Fallback by ID prefix
  let initialFirm: any = null;
  if (!firm) {
    const firmId = extractFirmIdFromSlug(slug);
    const { data: firmById } = await supabase
      .from("firms")
      .select("id, company_name, city, district, services, description, phone, email, is_premium, premium_until, is_claimed, google_maps_url, detailed_services, slug, website, logo_url, social_instagram, social_facebook, social_x, social_youtube, social_linkedin, response_time, trust_badges, faq_items, before_after, portfolio_items, address, youtube_videos, firm_gallery(image_url)")
      .like("id", `${firmId}%`)
      .eq("is_approved", true)
      .eq("is_active", true)
      .single();
    initialFirm = firmById;
  } else {
    initialFirm = firm;
  }

  let reviews: any[] = [];
  if (initialFirm) {
    const { data } = await supabase
      .from("firm_reviews")
      .select("reviewer_name, rating, comment, created_at, photo_url")
      .eq("firm_id", initialFirm.id)
      .eq("is_approved", true);
    if (data) reviews = data;
  }

  // Gallery for SSR
  let gallery: any[] = [];
  if (initialFirm) {
    const { data: galleryData } = await supabase
      .from("firm_gallery")
      .select("*")
      .eq("firm_id", initialFirm.id)
      .order("sort_order", { ascending: true });
    if (galleryData) gallery = galleryData;
  }

  // --- JSON-LD – LocalBusiness ---
  const jsonLd: any = initialFirm ? {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": initialFirm.company_name,
    "image": initialFirm.logo_url || "https://www.peyzajbul.com/icon.png",
    "@id": `https://www.peyzajbul.com/firma/${slug}`,
    "url": getSafeWebsiteUrl(initialFirm.website) || `https://www.peyzajbul.com/firma/${slug}`,
    // Scraped listings carry unverified contact data: publish the phone only for claimed firms, never the email.
    ...(initialFirm.is_claimed === true && initialFirm.phone ? { "telephone": initialFirm.phone } : {}),
    "address": {
      "@type": "PostalAddress",
      "streetAddress": initialFirm.address || "",
      "addressLocality": initialFirm.district || "",
      "addressRegion": initialFirm.city || "",
      "addressCountry": "TR"
    },
    "description": initialFirm.description ? initialFirm.description.substring(0, 150) : `${initialFirm.city} ${initialFirm.district || ""} peyzaj firması.`,
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

  // --- JSON-LD – BreadcrumbList ---
  const citySlugLd = initialFirm?.city ? getCitySlug(initialFirm.city) : undefined;
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Ana Sayfa", "item": "https://www.peyzajbul.com" },
      { "@type": "ListItem", "position": 2, "name": "Firmalar", "item": "https://www.peyzajbul.com/firmalar" },
      ...(citySlugLd ? [{ "@type": "ListItem", "position": 3, "name": `${initialFirm.city} Peyzaj Firmaları`, "item": `https://www.peyzajbul.com/iller/${citySlugLd}-peyzaj-firmalari` }] : []),
      ...(initialFirm ? [{ "@type": "ListItem", "position": citySlugLd ? 4 : 3, "name": initialFirm.company_name, "item": `https://www.peyzajbul.com/firma/${slug}` }] : []),
    ]
  };

  return (
    <>
      {jsonLd && <JsonLd data={jsonLd} />}
      <JsonLd data={breadcrumbLd} />
      <FirmaDetayClient slug={slug} initialFirm={initialFirm} initialReviews={reviews} initialGallery={gallery} />
    </>
  );
}

// ISR: Her 1 saatte bir arka planda yenileme yapılması için (Opsiyonel)
export const revalidate = 3600;
