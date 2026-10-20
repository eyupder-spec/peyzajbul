import FirmalarClient from "@/views/Firmalar";
import { createClient } from "@/lib/supabase/server";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Peyzaj Firmaları | Peyzajbul Türkiye",
  description: "Türkiye genelindeki peyzaj firmalarını keşfedin. Bahçe tasarımı, peyzaj mimarlığı ve daha fazlası için güvenilir firmalar.",
};

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

export default async function Page() {
  const supabase = await createClient();

  const { data: rawFirms, error } = await supabase
    .from("firms")
    .select(FIRM_SELECT)
    .eq("is_approved", true)
    .eq("is_active", true)
    .order("is_premium", { ascending: false })
    .order("created_at", { ascending: false });

  const initialFirms = !error && rawFirms ? attachGalleryImages(rawFirms) : [];

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Ana Sayfa", "item": "https://www.peyzajbul.com" },
      { "@type": "ListItem", "position": 2, "name": "Firmalar", "item": "https://www.peyzajbul.com/firmalar" },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <FirmalarClient initialFirms={initialFirms} />
    </>
  );
}
