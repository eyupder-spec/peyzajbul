import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import {
  getSeoTitle,
  getSeoDescription,
  getCityName,
  seoCities,
  seoDistricts,
} from '@/lib/seo-data';
import { getCategoryBySlug, getAllCategories } from '@/lib/categories';
import HizmetBolgeDetay from '@/views/HizmetBolgeDetay';

interface PageProps {
  params: Promise<{
    hizmet: string;
    il: string;
  }>;
}

export async function generateStaticParams() {
  const categories = getAllCategories();
  const params: { hizmet: string; il: string }[] = [];

  for (const cat of categories) {
    for (const city of seoCities) {
      params.push({
        hizmet: cat.slug,
        il: city.slug,
      });
    }
  }
  return params;
}

// 2. DİNAMİK METADATA OLUŞTURULMASI
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const category = getCategoryBySlug(resolvedParams.hizmet);

  if (!category) return { title: 'Sayfa Bulunamadı' };

  // İlçesiz sadece il başlığı üretelim
  const title = `${getCityName(resolvedParams.il)} ${category.label} Firmaları | Peyzajbul`;
  const description = `${getCityName(resolvedParams.il)} bölgesinde profesyonel ${category.label} hizmeti veren en iyi firmalar. Ücretsiz teklif alın.`;

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
      canonical: `https://www.peyzajbul.com/hizmet/${resolvedParams.hizmet}/${resolvedParams.il}`,
    }
  };
}

export default async function ServiceCityPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { hizmet, il } = resolvedParams;

  const category = getCategoryBySlug(hizmet);
  const cityExists = seoCities.some(c => c.slug === il);

  if (!category || !cityExists) {
    notFound();
  }

  const cityName = getCityName(il);
  const fullLocation = cityName;

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": `${cityName} ${category.label} Hizmeti`,
    "description": `${cityName} bölgesinde profesyonel ${category.label} hizmeti.`,
    "provider": {
      "@type": "Organization",
      "name": "Peyzajbul Türkiye",
      "url": "https://www.peyzajbul.com"
    },
    "areaServed": {
      "@type": "City",
      "name": cityName
    },
    "serviceType": category.label
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />
      <HizmetBolgeDetay
        category={category}
        il={il}
        cityName={cityName}
        fullLocation={fullLocation}
      />
    </>
  );
}
