import IndexPage from "@/views/Index";
import { Metadata } from "next";
import type { HeroStats } from "@/components/Hero";
import { CATEGORIES } from "@/lib/categories";
import { JsonLd } from "@/lib/jsonLd";
import { getPublicStats } from "@/lib/publicStats";

export const revalidate = 3600;

// eslint-disable-next-line react-refresh/only-export-components -- Next.js route module export
export const metadata: Metadata = {
  title: "Peyzajbul – Peyzaj Firmaları ve Ücretsiz Teklif",
  description: "Peyzaj firmalarını inceleyin, bahçe tasarımı, sulama, çim serme ve bakım için ücretsiz teklif isteyin.",
  alternates: {
    canonical: "https://www.peyzajbul.com/",
  },
};

const featuredCategories = CATEGORIES.slice(0, 8);

const itemListJsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Peyzajbul – Peyzaj Hizmet Kategorileri",
  "description": "Peyzaj firmalarını hizmet kategorisine göre keşfedin.",
  "url": "https://www.peyzajbul.com/",
  "numberOfItems": featuredCategories.length,
  "itemListElement": featuredCategories.map((category, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": category.label,
    "url": `https://www.peyzajbul.com/hizmetler/${category.slug}`,
  })),
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Peyzajbul",
  "url": "https://www.peyzajbul.com",
  "logo": "https://www.peyzajbul.com/icon.png",
  "description": "Türkiye'nin peyzaj firmaları rehberi ve ücretsiz teklif platformu",
  // Only profiles the owner has confirmed belong here (confirmed by the owner on 2026-10-20: Facebook, X, YouTube).
  "sameAs": [
    "https://www.facebook.com/peyzajbul",
    "https://twitter.com/peyzajbul",
    "https://www.youtube.com/@peyzajbul",
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "bilgi@peyzajbul.com",
    "contactType": "customer service",
    "availableLanguage": "Turkish",
  },
};

const webSiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Peyzajbul",
  "url": "https://www.peyzajbul.com",
  "inLanguage": "tr-TR",
  "publisher": {
    "@type": "Organization",
    "name": "Peyzajbul",
  },
};

/** Cookie-less stats read: never throws, so a build without a reachable database still succeeds. */
async function loadHeroStats(): Promise<HeroStats | null> {
  try {
    const stats = await getPublicStats();
    if (!stats) return null;
    return { firmCount: stats.firmCount, cityCount: stats.cityCount, updatedAt: stats.asOf };
  } catch {
    return null;
  }
}

export default async function Home() {
  const stats = await loadHeroStats();

  return (
    <>
      <JsonLd data={itemListJsonLd} />
      <JsonLd data={organizationJsonLd} />
      <JsonLd data={webSiteJsonLd} />
      <IndexPage stats={stats} />
    </>
  );
}
