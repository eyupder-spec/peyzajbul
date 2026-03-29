import { NextResponse } from 'next/server';
import { getAllCategories } from '@/lib/categories';

function escapeXml(unsafe: string) {
  return unsafe.replace(/[<>&"']/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      case "'": return '&apos;';
      default: return c;
    }
  });
}

export async function GET() {
  const baseUrl = 'https://www.peyzajbul.com';
  const categories = getAllCategories();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <!-- Ana Hizmetler Sayfası -->
  <url>
    <loc>${baseUrl}/hizmetler</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- Kategori Sayfaları -->
  ${categories.map(cat => `
  <url>
    <loc>${baseUrl}/hizmetler/${cat.slug}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
    <image:image>
      <image:loc>${baseUrl}${cat.imageUrl}</image:loc>
      <image:title>${escapeXml(cat.label)} - Peyzajbul</image:title>
      <image:caption>${escapeXml(cat.shortDescription)}</image:caption>
    </image:image>
  </url>`).join('')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
    },
  });
}
