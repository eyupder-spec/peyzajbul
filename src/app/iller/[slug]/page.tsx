import IlFirmalariClient from "@/views/IlFirmalari";
import { generateCitySeoContent, getCityBySlug, generateCityFaq } from "@/lib/cities";
import { createClient } from "@/lib/supabase/server";
import { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const citySlug = slug.replace(/-peyzaj-firmalari$/, "");
  const cityName = citySlug.charAt(0).toUpperCase() + citySlug.slice(1);
  const seo = generateCitySeoContent(cityName);

  const url = `https://www.peyzajbul.com/iller/${slug}`;

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: url,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: seo.title,
      description: seo.description,
    },
    other: {
      "geo.region": "TR",
      "geo.placename": cityName,
    },
  };
}

const FIRM_SELECT = "id, company_name, city, district, services, description, phone, email, is_premium, premium_until, google_maps_url, detailed_services, slug, website, logo_url, social_instagram, social_facebook, social_x, social_youtube, social_linkedin, response_time, trust_badges, faq_items, before_after, portfolio_items, youtube_videos, firm_gallery(image_url)";

function attachGalleryImages(firms: any[]): any[] {
  const now = new Date();
  return firms.map((firm: any) => {
    const isPremiumActive = firm.is_premium && firm.premium_until && new Date(firm.premium_until) > now;
    return {
      ...firm,
      is_premium: !!isPremiumActive,
      premium_until: undefined,
      gallery_images: (firm.firm_gallery ?? []).map((g: any) => g.image_url).filter(Boolean),
      firm_gallery: undefined,
    };
  }).sort((a: any, b: any) => {
    if (a.is_premium && !b.is_premium) return -1;
    if (!a.is_premium && b.is_premium) return 1;
    return 0;
  });
}

export default async function IlFirmalariPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const citySlug = slug.replace(/-peyzaj-firmalari$/, "");
  const city = getCityBySlug(citySlug);

  if (!city) {
    notFound();
  }

  const supabase = await createClient();

  const { data: rawFirms, error } = await supabase
    .from("firms")
    .select(FIRM_SELECT)
    .eq("is_approved", true)
    .eq("is_active", true)
    .eq("city", city.name)
    .order("is_premium", { ascending: false })
    .order("created_at", { ascending: false });

  const initialFirms = !error && rawFirms ? attachGalleryImages(rawFirms) : [];

  const seo = generateCitySeoContent(city.name);
  const faqItems = generateCityFaq(city.name);

  const url = `https://www.peyzajbul.com/iller/${slug}`;

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqItems.map((item) => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer,
      },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Ana Sayfa", "item": "https://www.peyzajbul.com" },
      { "@type": "ListItem", "position": 2, "name": "İller", "item": "https://www.peyzajbul.com/iller" },
      { "@type": "ListItem", "position": 3, "name": `${city.name} Peyzaj Firmaları`, "item": url },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <IlFirmalariClient slug={slug} initialFirms={initialFirms} faq={faqItems} />
    </>
  );
}
