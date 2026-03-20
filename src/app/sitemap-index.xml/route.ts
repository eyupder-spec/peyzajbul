import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = 'https://www.peyzajbul.com';

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Ana Genel Sayfalar -->
  <sitemap>
    <loc>${baseUrl}/sitemap-core.xml</loc>
  </sitemap>
  
  <!-- Firmalar -->
  <sitemap>
    <loc>${baseUrl}/sitemap-firms.xml</loc>
  </sitemap>
  
  <!-- İl ve İlçeler, Konum Odaklı SEO Sayfaları -->
  <sitemap>
    <loc>${baseUrl}/sitemap-locations.xml</loc>
  </sitemap>
  
  <!-- Kategori ve Hizmet Sayfaları -->
  <sitemap>
    <loc>${baseUrl}/sitemap-services.xml</loc>
  </sitemap>
  
  <!-- Blog Sistemi -->
  <sitemap>
    <loc>${baseUrl}/sitemap-blog.xml</loc>
  </sitemap>
</sitemapindex>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
    },
  });
}
