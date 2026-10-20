import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // AI botlarına tam erişim
      { userAgent: 'GPTBot', allow: '/' },
      { userAgent: 'ChatGPT-User', allow: '/' },
      { userAgent: 'OAI-SearchBot', allow: '/' },
      { userAgent: 'ClaudeBot', allow: '/' },
      { userAgent: 'Claude-User', allow: '/' },
      { userAgent: 'PerplexityBot', allow: '/' },
      { userAgent: 'Google-Extended', allow: '/' },
      { userAgent: 'Applebot-Extended', allow: '/' },
      { userAgent: 'Bytespider', allow: '/' },
      { userAgent: 'Amazonbot', allow: '/' },
      { userAgent: 'Meta-ExternalAgent', allow: '/' },
      { userAgent: 'Bingbot', allow: '/' },
      // Genel kurallar — kullanıcı panelleri ve yönetim sayfaları
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/firma/giris',
          '/firma/panel',
          '/firma/leadler',
          '/firma/jeton',
          '/firma/premium',
          '/firma/reklam',
          '/firma/urunler',
          '/firma/galeri',
          '/firma/landing',
          '/firma/projeler',
          '/hesabim',
          '/hesap-silme',
          '/talebiniz-alindi',
          '/api/',
        ],
      },
    ],
    sitemap: 'https://www.peyzajbul.com/sitemap-index.xml',
  };
}
