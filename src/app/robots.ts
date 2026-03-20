import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const secretAdminPath = process.env.NEXT_PUBLIC_ADMIN_SECRET_PATH || '/admin-dash';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/firma/panel/', '/hesabim/', secretAdminPath],
    },
    sitemap: 'https://www.peyzajbul.com/sitemap-index.xml',
  };
}
