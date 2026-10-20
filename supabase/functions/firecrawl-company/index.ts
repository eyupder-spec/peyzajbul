/// <reference lib="deno.ns" />

/**
 * Extracts company contact details from a firm's website with Firecrawl.
 *
 * Auth: admins only (requireAdmin). Invoked from the admin panel
 * (bulk firm import and the firm form). At most 60 scrapes per admin and hour.
 * Secrets: FIRECRAWL_API_KEY.
 */

import { HttpError, rateLimit, requireAdmin } from "../_shared/auth.ts";
import { readJson, serveSecure } from "../_shared/http.ts";
import { normalizePublicHttpUrl } from "../_shared/security.ts";

async function scrapeUrl(apiKey: string, url: string, prompt: string) {
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: ['extract', 'links'],
      extract: {
        prompt,
        schema: {
          type: 'object',
          properties: {
            company_name: { type: 'string', description: 'Official company/brand name' },
            phone: { type: 'string', description: 'Primary phone number with country code if available. Look in header, footer, contact sections, meta tags.' },
            phones: { type: 'array', items: { type: 'string' }, description: 'All phone numbers found on the page' },
            email: { type: 'string', description: 'Primary email address. Look in header, footer, contact sections, mailto links.' },
            emails: { type: 'array', items: { type: 'string' }, description: 'All email addresses found on the page' },
            address: { type: 'string', description: 'Full physical/street address' },
            city: { type: 'string', description: 'City name in Turkish (e.g. İstanbul, Ankara, İzmir)' },
            district: { type: 'string', description: 'District/ilçe name (e.g. Kadıköy, Çankaya, Karşıyaka)' },
            description: { type: 'string', description: 'Company description, about text, or slogan' },
            services: { type: 'array', items: { type: 'string' }, description: 'List of services offered' },
            instagram: { type: 'string', description: 'Instagram profile URL if found' },
            facebook: { type: 'string', description: 'Facebook page URL if found' },
            twitter: { type: 'string', description: 'Twitter or X profile URL if found' },
            linkedin: { type: 'string', description: 'LinkedIn company URL if found' },
            youtube: { type: 'string', description: 'YouTube channel URL if found' }
          },
        },
      },
    }),
    signal: AbortSignal.timeout(60000),
  });
  return response.json();
}

serveSecure(async (req) => {
  const { user, admin } = await requireAdmin(req);

  const body = await readJson(req);
  if (typeof body.url !== 'string' || !body.url.trim()) {
    throw new HttpError(400, 'URL gerekli');
  }

  let formattedUrl: string;
  try {
    formattedUrl = normalizePublicHttpUrl(body.url);
  } catch {
    throw new HttpError(400, 'Geçersiz web adresi.');
  }

  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) {
    throw new HttpError(500, 'Firecrawl bağlantısı yapılandırılmamış');
  }

  await rateLimit(admin, `firecrawl:${user.id}`, 60, 3600);

  console.log('Scraping company info from:', formattedUrl);

  const mainPrompt = `Bu bir Türk peyzaj/bahçe/çevre düzenleme firmasının web sitesidir. Aşağıdaki bilgileri çok dikkatli bir şekilde, Türkçe karakterlere uygun olarak çıkar:

1. FİRMA ADI: Resmi firma veya marka adı (Örn: "Peyzaj Bul", "XYZ Bahçe Düzenleme").
2. TELEFON: Sayfanın header, footer, iletişim bölümü, "Bizi Arayın" butonları, tel: linkleri, WhatsApp numaraları dahil her yere bak. Numarayı +90 formatında veya 05xx şeklinde ver.
3. E-POSTA: mailto: linkleri, footer, iletişim sayfası dahil her yere bak.
4. ADRES: Firmanın tam fiziksel adresi (Mahalle, Sokak, No vb.).
5. İL (city): Firmanın bulunduğu il. SADECE il adı olmalı (Örn: "İstanbul", "Ankara", "İzmir", "Bursa").
6. İLÇE (district): Firmanın bulunduğu ilçe (Örn: "Kadıköy", "Çankaya", "Konak").
7. AÇIKLAMA (description): Firma hakkında kısa bir özet, tarihçe veya sunulan temel hizmetlerden oluşan açıklama metni.
8. HİZMETLER: Sunulan hizmetlerin virgülle ayrılmış listesi.

ÖNEMLİ: Eğer bir bilgiyi bulamıyorsan null dön. "Not provided" gibi ifadeler kullanma. Özellikle sayfanın en altındaki (footer) ve en üstündeki (header) metinlere odaklan. İletişim sayfasındaki adres bloğunu dikkatle oku.`;

  // Scrape main page
  let mainData;
  try {
    mainData = await scrapeUrl(apiKey, formattedUrl, mainPrompt);
  } catch (error) {
    console.error('Firecrawl request failed:', error);
    throw new HttpError(502, 'Sayfa taranamadı');
  }

  if (!mainData?.success && !mainData?.data) {
    console.error('Firecrawl API error:', mainData);
    throw new HttpError(400, mainData?.error || 'Sayfa taranamadı');
  }

  const extracted = mainData?.data?.extract || mainData?.extract || null;
  const links = mainData?.data?.links || mainData?.links || [];

  console.log('Main page extracted fields:', extracted ? Object.keys(extracted).length : 0);
  console.log('Found links:', links?.length);

  // If phone or email is missing, try contact/iletisim page
  const needsMore = !extracted?.phone || extracted?.phone === 'Not provided' || extracted?.phone === '' ||
                    !extracted?.email || extracted?.email === 'Not provided' || extracted?.email === '';

  if (needsMore && links && links.length > 0) {
    // Find contact page URL
    const contactPatterns = ['iletisim', 'iletişim', 'contact', 'bize-ulasin', 'bize-ulaşın', 'hakkimizda', 'hakkımızda', 'about'];
    const foundContactUrl = links.find((link: string) =>
      typeof link === 'string' && contactPatterns.some(p => link.toLowerCase().includes(p))
    );

    // Links come from the scraped site, so they get the same public-URL check as the request URL.
    let contactUrl: string | null = null;
    try {
      contactUrl = foundContactUrl ? normalizePublicHttpUrl(foundContactUrl) : null;
    } catch {
      contactUrl = null;
    }

    if (contactUrl) {
      console.log('Scraping contact page:', contactUrl);
      try {
        const contactData = await scrapeUrl(apiKey, contactUrl,
          `Bu bir iletişim/hakkımızda sayfasıdır. Telefon numarası, e-posta adresi, fiziksel adres, il ve ilçe bilgilerini çıkar. Tüm telefon numaralarını ve e-posta adreslerini bul. Header, footer, ana içerik alanı dahil her yere bak.`
        );

        const contactExtracted = contactData?.data?.extract || contactData?.extract || null;
        console.log('Contact page extracted fields:', contactExtracted ? Object.keys(contactExtracted).length : 0);

        if (contactExtracted) {
          // Merge: prefer contact page data for missing fields
          if ((!extracted.phone || extracted.phone === 'Not provided' || extracted.phone === '') && contactExtracted.phone && contactExtracted.phone !== 'Not provided') {
            extracted.phone = contactExtracted.phone;
          }
          if ((!extracted.email || extracted.email === 'Not provided' || extracted.email === '') && contactExtracted.email && contactExtracted.email !== 'Not provided') {
            extracted.email = contactExtracted.email;
          }
          if ((!extracted.address || extracted.address === 'Not provided' || extracted.address === '') && contactExtracted.address && contactExtracted.address !== 'Not provided') {
            extracted.address = contactExtracted.address;
          }
          if ((!extracted.city || extracted.city === 'Not provided' || extracted.city === '') && contactExtracted.city && contactExtracted.city !== 'Not provided') {
            extracted.city = contactExtracted.city;
          }
          if ((!extracted.district || extracted.district === 'Not provided' || extracted.district === '') && contactExtracted.district && contactExtracted.district !== 'Not provided') {
            extracted.district = contactExtracted.district;
          }
          // Use phones/emails arrays as fallback
          if ((!extracted.phone || extracted.phone === 'Not provided' || extracted.phone === '') && contactExtracted.phones?.length > 0) {
            extracted.phone = contactExtracted.phones[0];
          }
          if ((!extracted.email || extracted.email === 'Not provided' || extracted.email === '') && contactExtracted.emails?.length > 0) {
            extracted.email = contactExtracted.emails[0];
          }
        }
      } catch (e) {
        console.error('Contact page scrape failed:', e);
      }
    }
  }

  // Use phones/emails arrays from main extraction as fallback
  if (extracted) {
    if ((!extracted.phone || extracted.phone === 'Not provided' || extracted.phone === '') && extracted.phones?.length > 0) {
      extracted.phone = extracted.phones[0];
    }
    if ((!extracted.email || extracted.email === 'Not provided' || extracted.email === '') && extracted.emails?.length > 0) {
      extracted.email = extracted.emails[0];
    }
    // Clean up extracted email if it has http prefix
    if (extracted.email && typeof extracted.email === 'string') {
      extracted.email = extracted.email.replace(/^https?:\/\//, "");
    }
    // Clean up "Not provided" values to empty string
    for (const key of ['phone', 'email', 'address', 'city', 'district']) {
      if (extracted[key] === 'Not provided' || extracted[key] === null) {
        extracted[key] = '';
      }
    }
    // Remove helper arrays from response
    delete extracted.phones;
    delete extracted.emails;
  }

  if (!extracted) {
    return { success: false, error: 'Firma bilgileri çıkarılamadı' };
  }

  console.log('Final extracted company fields:', Object.keys(extracted).length);

  return { success: true, company: extracted };
});
