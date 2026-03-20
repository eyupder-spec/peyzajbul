import { NextResponse } from 'next/server';
import { getAllCategories } from '@/lib/categories';
import { seoCities, seoDistricts } from '@/lib/seo-data';

export async function GET() {
  const baseUrl = 'https://www.peyzajbul.com';
  const categories = getAllCategories();

  let xmlUrls = '';

  // 1. Ana İller Sayfası
  xmlUrls += `
  <url>
    <loc>${baseUrl}/iller</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.4</priority>
  </url>`;

  // 2. İl Bazlı Firmalar (iller/[sehir]-peyzaj-firmalari)
  seoCities.forEach(city => {
    xmlUrls += `
    <url>
      <loc>${baseUrl}/iller/${city.slug}-peyzaj-firmalari</loc>
      <lastmod>${new Date().toISOString()}</lastmod>
      <changefreq>monthly</changefreq>
      <priority>0.6</priority>
    </url>`;
  });

  // 3. Hizmet + İl ve Hizmet + İl + İlçe Sayfaları
  categories.forEach(cat => {
    seoCities.forEach(city => {
      xmlUrls += `
      <url>
        <loc>${baseUrl}/hizmet/${cat.slug}/${city.slug}</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.5</priority>
      </url>`;

      const districts = seoDistricts[city.slug] || [];
      districts.forEach(district => {
        xmlUrls += `
        <url>
          <loc>${baseUrl}/hizmet/${cat.slug}/${city.slug}/${district.slug}</loc>
          <lastmod>${new Date().toISOString()}</lastmod>
          <changefreq>monthly</changefreq>
          <priority>0.5</priority>
        </url>`;
      });
    });
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${xmlUrls}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
    },
  });
}
