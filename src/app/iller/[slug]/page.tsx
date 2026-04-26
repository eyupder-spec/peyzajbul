import IlFirmalariClient from "@/views/IlFirmalari";
import { generateCitySeoContent } from "@/lib/cities";
import { Metadata } from "next";

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

export default async function IlFirmalariPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  return <IlFirmalariClient slug={resolvedParams.slug} />;
}
