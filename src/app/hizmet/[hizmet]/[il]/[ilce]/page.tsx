import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import {
  getSeoTitle,
  getSeoDescription,
  getCityName,
  getDistrictName,
  seoCities,
  seoDistricts,
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

  const schemaData = {
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
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
