import { Metadata } from "next";
import { getCategoryBySlug } from "@/lib/categories";
import HizmetDetayClient from "@/views/HizmetDetay";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const category = getCategoryBySlug(resolvedParams.slug);

  if (!category) return { title: "Hizmet Bulunamadı" };

  return {
    title: category.seoTitle,
    description: category.seoDescription,
    alternates: {
      canonical: `https://www.peyzajbul.com/hizmetler/${category.slug}`,
    },
  };
}

export default async function HizmetDetayPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  return <HizmetDetayClient slug={resolvedParams.slug} />;
}
