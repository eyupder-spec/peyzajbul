/// <reference lib="deno.ns" />

export {};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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
  });
  return response.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL gerekli' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl API Anahtarı eksik.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Scraping photos from main page:', formattedUrl);

    const mainPrompt = `Bu bir peyzaj/bahçe/çevre düzenleme firmasının web sitesidir.
Sitedeki yüksek kaliteli, şirketin yaptığı işleri, peyzajı, bahçe düzenlemelerini gösteren tüm büyük ve anlamlı görsellerin (img) *tam (absolute)* URL'lerini çıkar. 
- Logoları (logo.png vb.), sosyal medya ikonlarını (instagram.png vb.), küçük UI butonlarını (arrow.svg vb.) KESİNLİKLE dahil etme.
- Sadece projelere veya gerçek ortamlara ait fotoğrafları (jpg, jpeg, png, webp) listeye ekle. Yüksek çözünürlüklü/kaliteli olanları önceliklendir.`;

    // 1. Ana sayfayı tara ve linkleri de iste
    const resultData = await scrapeUrlForPhotos(apiKey, formattedUrl, mainPrompt, true);

    if (!resultData?.success && !resultData?.data) {
      console.error('Firecrawl API error:', resultData);
      return new Response(
        JSON.stringify({ success: false, error: resultData?.error || 'Resimler taranamadı' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let extracted = resultData?.data?.extract || resultData?.extract || null;
    let allPhotos: string[] = extracted?.photos || [];
    const links: string[] = resultData?.data?.links || resultData?.links || [];

    // 2. Alt sayfaları tespit et (Galeri, Projeler, Hizmetler)
    let extraPhotos: string[] = [];
    if (links && links.length > 0) {
      const targetPatterns = ['galeri', 'gallery', 'portfolyo', 'portfolio', 'proje', 'projects', 'referans', 'reference', 'hizmet', 'service'];
      
      // Filtrele ve sadece 2 tane en alakalı olanı seç ki işlem süresi çok uzamasın (5-10 saniyeyi geçmemesi için)
      const targetLinks = links.filter((link: string) => {
        // Ana sayfanın kendisini tekrar eklememek için
        if (link === formattedUrl || link === formattedUrl + '/') return false;
        const linkLower = link.toLowerCase();
        return targetPatterns.some(p => linkLower.includes(p));
      });

      // Birden fazla varsa sadece en çok benzeyen 2'sini alalım (önceliğimiz portfolyo/galeri)
      const topLinks = targetLinks.slice(0, 2);

      if (topLinks.length > 0) {
        console.log(`Found subpages to scrape: ${topLinks.join(', ')}`);
        
        // 3. Alt sayfaları paralel (Concurrent) olarak tara
        const fetchPromises = topLinks.map(subUrl => {
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

    let filteredPhotos = allPhotos.filter((p: string) => {
      if (!p || typeof p !== 'string') return false;
      const lower = p.toLowerCase();
      // Küçük logolar ve ikonları elimine etme denemesi
      if (lower.includes('logo') || lower.includes('icon') || lower.includes('avatar') || lower.includes('favicon')) return false;
      if (lower.endsWith('.svg') || lower.endsWith('.gif')) return false;
      return p.startsWith('http://') || p.startsWith('https://');
    });

    // Tekrarlayan URL'leri çıkart
    filteredPhotos = Array.from(new Set(filteredPhotos));

    console.log(`Total valid unique photos found: ${filteredPhotos.length}`);

    return new Response(
      JSON.stringify({ success: true, photos: filteredPhotos }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
