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
  const category = getCategoryBySlug(resolvedParams.slug);

  // Service schema
  const serviceSchema = category ? {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": category.label,
    "description": category.seoDescription,
    "image": `https://www.peyzajbul.com${category.imageUrl}`,
    "areaServed": { "@type": "Country", "name": "Türkiye" },
    "provider": {
      "@type": "Organization",
      "name": "Peyzajbul"
    },
    "url": `https://www.peyzajbul.com/hizmetler/${category.slug}`
  } : null;

  // FAQPage schema (only if faqs exist)
  const faqSchema = category && category.faqs && category.faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": category.faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  } : null;

  // BreadcrumbList schema
  const breadcrumbSchema = category ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Ana Sayfa", "item": "https://www.peyzajbul.com/" },
      { "@type": "ListItem", "position": 2, "name": "Hizmetler", "item": "https://www.peyzajbul.com/hizmetler" },
      { "@type": "ListItem", "position": 3, "name": category.label, "item": `https://www.peyzajbul.com/hizmetler/${category.slug}` }
    ]
  } : null;

  return (
    <>
      {serviceSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
        />
      )}
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      {breadcrumbSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
      )}
      <HizmetDetayClient slug={resolvedParams.slug} />
    </>
  );
}
