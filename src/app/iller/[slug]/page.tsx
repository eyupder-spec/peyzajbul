import IlFirmalariClient from "@/views/IlFirmalari";
import { generateCitySeoContent } from "@/lib/cities";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const citySlug = slug.replace(/-peyzaj-firmalari$/, "");
  const cityName = citySlug.charAt(0).toUpperCase() + citySlug.slice(1);
  const seo = generateCitySeoContent(cityName);

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: `https://peyzajbul.com/iller/${slug}`,
    },
  };
}

export default async function IlFirmalariPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  return <IlFirmalariClient slug={resolvedParams.slug} />;
}
