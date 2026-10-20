import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import {
  getSeoTitle,
  getSeoDescription,
  getCityName,
  getDistrictName,
  seoCities,
  seoDistricts,
  generateServiceCityFaq,
  generateServiceCityDistrictParams
} from '@/lib/seo-data';
import { getCategoryBySlug, getAllCategories } from '@/lib/categories';
import HizmetBolgeDetay from '@/views/HizmetBolgeDetay';

interface PageProps {
  params: Promise<{
    hizmet: string;
    il: string;
    ilce: string;
  }>;
}

// 1. STATİK PARAMETRELERİN (SSG) ÜRETİLMESİ
export async function generateStaticParams() {
  const categories = getAllCategories();
  const services = categories.map(c => ({ slug: c.slug }));
  return generateServiceCityDistrictParams(services);
}

// 2. DİNAMİK METADATA OLUŞTURULMASI
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const category = getCategoryBySlug(resolvedParams.hizmet);

  if (!category) return { title: 'Sayfa Bulunamadı' };

  const title = getSeoTitle(category.label, resolvedParams.il, resolvedParams.ilce);
  const description = getSeoDescription(category.label, resolvedParams.il, resolvedParams.ilce);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'tr_TR',
    },
    alternates: {
      canonical: `https://www.peyzajbul.com/hizmet/${resolvedParams.hizmet}/${resolvedParams.il}/${resolvedParams.ilce}`,
    }
  };
}

export default async function ServiceLocationPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { hizmet, il, ilce } = resolvedParams;

  const category = getCategoryBySlug(hizmet);
  const cityExists = seoCities.some(c => c.slug === il);
  const districtExists = (seoDistricts[il] || []).some(d => d.slug === ilce);

  if (!category || !cityExists || !districtExists) {
    notFound();
  }

  const cityName = getCityName(il);
  const districtName = getDistrictName(il, ilce);
  const fullLocation = `${districtName}, ${cityName}`;

  // Service schema
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": `${districtName} ${category.label} Hizmeti`,
    "description": getSeoDescription(category.label, il, ilce),
    "provider": {
      "@type": "Organization",
      "name": "Peyzajbul Türkiye",
      "url": "https://www.peyzajbul.com"
    },
    "areaServed": {
      "@type": "City",
      "name": districtName,
      "containedInPlace": {
        "@type": "State",
        "name": cityName
      }
    },
    "serviceType": category.label
  };

  // FAQPage schema with dynamic city+district Q&A
  const cityFaqs = generateServiceCityFaq(category.label, cityName, districtName);
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": cityFaqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  // BreadcrumbList schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Ana Sayfa", "item": "https://www.peyzajbul.com/" },
      { "@type": "ListItem", "position": 2, "name": "Hizmetler", "item": "https://www.peyzajbul.com/hizmetler" },
      { "@type": "ListItem", "position": 3, "name": category.label, "item": `https://www.peyzajbul.com/hizmetler/${category.slug}` },
      { "@type": "ListItem", "position": 4, "name": cityName, "item": `https://www.peyzajbul.com/hizmet/${category.slug}/${il}` },
      { "@type": "ListItem", "position": 5, "name": districtName, "item": `https://www.peyzajbul.com/hizmet/${category.slug}/${il}/${ilce}` }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <HizmetBolgeDetay
        category={category}
        il={il}
        ilce={ilce}
        cityName={cityName}
        districtName={districtName}
        fullLocation={fullLocation}
      />
    </>
  );
}
