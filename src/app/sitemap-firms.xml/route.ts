import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const baseUrl = 'https://www.peyzajbul.com';
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: firms } = await supabase
    .from('firms')
    .select('slug, updated_at, company_name')
    .eq('is_approved', true)
    .eq('is_active', true)
    .not('company_name', 'ilike', '%deneme%')
    .not('company_name', 'ilike', '%test%')
    .not('slug', 'ilike', '%deneme%')
    .not('slug', 'ilike', '%test%');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${(firms || []).map(firm => `
  <url>
    <loc>${baseUrl}/firma/${firm.slug}</loc>
    <lastmod>${new Date(firm.updated_at || new Date()).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`).join('')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
    },
  });
}
