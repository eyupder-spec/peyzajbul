/// <reference lib="deno.ns" />

/**
 * Collects project photo URLs from a firm's website with Firecrawl.
 *
 * Auth: admins only (requireAdmin). Invoked from the admin photo crawler.
 * At most 60 crawls per admin and hour. Secrets: FIRECRAWL_API_KEY.
 *
 * Every returned photo URL is checked with normalizePublicHttpUrl and
 * dropped on failure, so private or loopback hosts never reach the image
 * proxy that downloads these photos.
 */

import { HttpError, rateLimit, requireAdmin } from "../_shared/auth.ts";
import { readJson, serveSecure } from "../_shared/http.ts";
import { normalizePublicHttpUrl } from "../_shared/security.ts";

async function scrapeUrlForPhotos(apiKey: string, url: string, prompt: string, getLinks: boolean = false) {
  const formats = getLinks ? ['extract', 'links'] : ['extract'];
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats,
      extract: {
        prompt,
        schema: {
          type: 'object',
          properties: {
            photos: {
              type: 'array',
              items: { type: 'string' },
              description: 'Absolute URLs of high-quality environment, landscaping, or garden photos found on the website. Must exclude small icons, logos, social media icons, and small UI elements. Only return realistic photographic images, ideally related to landscaping, plants, outdoors or the company\'s project gallery.'
            }
          },
          required: ['photos']
        },
      },
    }),
    signal: AbortSignal.timeout(60000),
  });
  return response.json();
}

function publicUrlOrNull(value: string): string | null {
  try {
    return normalizePublicHttpUrl(value);
  } catch {
    return null;
  }
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
    throw new HttpError(500, 'Firecrawl API Anahtarı eksik.');
  }

  await rateLimit(admin, `firecrawl:${user.id}`, 60, 3600);

  console.log('Scraping photos from main page:', formattedUrl);

  const mainPrompt = `Bu bir peyzaj/bahçe/çevre düzenleme firmasının web sitesidir.
Sitedeki yüksek kaliteli, şirketin yaptığı işleri, peyzajı, bahçe düzenlemelerini gösteren tüm büyük ve anlamlı görsellerin (img) *tam (absolute)* URL'lerini çıkar.
- Logoları (logo.png vb.), sosyal medya ikonlarını (instagram.png vb.), küçük UI butonlarını (arrow.svg vb.) KESİNLİKLE dahil etme.
- Sadece projelere veya gerçek ortamlara ait fotoğrafları (jpg, jpeg, png, webp) listeye ekle. Yüksek çözünürlüklü/kaliteli olanları önceliklendir.`;

  // 1. Ana sayfayı tara ve linkleri de iste
  let resultData;
  try {
    resultData = await scrapeUrlForPhotos(apiKey, formattedUrl, mainPrompt, true);
  } catch (error) {
    console.error('Firecrawl request failed:', error);
    throw new HttpError(502, 'Resimler taranamadı');
  }

  if (!resultData?.success && !resultData?.data) {
    console.error('Firecrawl API error:', resultData);
    throw new HttpError(400, resultData?.error || 'Resimler taranamadı');
  }

  const extracted = resultData?.data?.extract || resultData?.extract || null;
  let allPhotos: string[] = extracted?.photos || [];
  const links: string[] = resultData?.data?.links || resultData?.links || [];

  // 2. Alt sayfaları tespit et (Galeri, Projeler, Hizmetler)
  let extraPhotos: string[] = [];
  if (links && links.length > 0) {
    const targetPatterns = ['galeri', 'gallery', 'portfolyo', 'portfolio', 'proje', 'projects', 'referans', 'reference', 'hizmet', 'service'];
    const baseUrl = formattedUrl.replace(/\/+$/, '');

    // Filtrele ve sadece 2 tane en alakalı olanı seç ki işlem süresi çok uzamasın (5-10 saniyeyi geçmemesi için)
    const targetLinks = links.flatMap((link: string) => {
      if (typeof link !== 'string') return [];
      // Ana sayfanın kendisini tekrar eklememek için
      if (link === baseUrl || link === baseUrl + '/') return [];
      const linkLower = link.toLowerCase();
      if (!targetPatterns.some(p => linkLower.includes(p))) return [];
      // Linkler taranan siteden geldiği için istek adresiyle aynı herkese açık adres kontrolünden geçer
      const safeLink = publicUrlOrNull(link);
      return safeLink ? [safeLink] : [];
    });

    // Birden fazla varsa sadece en çok benzeyen 2'sini alalım (önceliğimiz portfolyo/galeri)
    const topLinks = targetLinks.slice(0, 2);

    if (topLinks.length > 0) {
      console.log(`Found subpages to scrape: ${topLinks.join(', ')}`);

      // 3. Alt sayfaları paralel (Concurrent) olarak tara
      const fetchPromises = topLinks.map((subUrl: string) => {
        console.log('Scraping subpage:', subUrl);
        return scrapeUrlForPhotos(apiKey, subUrl, mainPrompt, false)
          .catch(err => {
            console.error(`Error scraping ${subUrl}:`, err);
            return null;
          });
      });

      const results = await Promise.all(fetchPromises);

      results.forEach(res => {
        if (res?.success || res?.data) {
          const subExtracted = res?.data?.extract || res?.extract || null;
          if (subExtracted?.photos) {
            extraPhotos = [...extraPhotos, ...subExtracted.photos];
          }
        }
      });
    }
  }

  // 4. Bütün resimleri birleştirip filtrele
  allPhotos = [...allPhotos, ...extraPhotos];

  const filteredPhotos = allPhotos.flatMap((p: string) => {
    if (!p || typeof p !== 'string') return [];
    const lower = p.toLowerCase();
    // Küçük logolar ve ikonları elimine etme denemesi
    if (lower.includes('logo') || lower.includes('icon') || lower.includes('avatar') || lower.includes('favicon')) return [];
    if (lower.endsWith('.svg') || lower.endsWith('.gif')) return [];
    if (!p.startsWith('http://') && !p.startsWith('https://')) return [];
    // Özel, yerel veya geçersiz adresler görsel proxy'sine ulaşmasın diye elenir
    const safePhoto = publicUrlOrNull(p);
    return safePhoto ? [safePhoto] : [];
  });

  // Tekrarlayan URL'leri çıkart
  const photos = Array.from(new Set(filteredPhotos));

  console.log(`Total valid unique photos found: ${photos.length}`);

  return { success: true, photos };
});
