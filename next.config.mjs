const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vexoiwpreylhwxzdkfxc.supabase.co';
const supabaseParsed = new URL(supabaseUrl);
const supabaseHost = supabaseParsed.host;

// Content-Security-Policy (production only; dev needs eval/HMR sockets).
// Any new third-party script, iframe or API origin MUST be added here or it is blocked in production.
// Emergency lever without a code change: set CSP_MODE=report-only in the hosting env and redeploy.
const csp = [
  "default-src 'self'",
  // 'unsafe-inline' is required by the Next.js RSC bootstrap and the inline init of @next/third-parties GoogleAnalytics.
  // A nonce-based policy would force dynamic rendering of every page and defeat ISR, so it is not used. No 'unsafe-eval'.
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  // Firm logos/galleries and the admin crawler preview load from arbitrary https hosts.
  "img-src 'self' data: blob: https:",
  // next/font self-hosts the font files.
  "font-src 'self' data:",
  `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://stats.g.doubleclick.net`,
  "frame-src https://www.google.com https://maps.google.com https://www.youtube.com https://www.youtube-nocookie.com https://challenges.cloudflare.com",
  "media-src 'self' https:",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join('; ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()' },
];

if (process.env.NODE_ENV === 'production') {
  securityHeaders.push({
    key: process.env.CSP_MODE === 'report-only' ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy',
    value: csp,
  });
}

const noindexHeader = { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' };

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: supabaseParsed.hostname,
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'peyzajbul.com',
      },
      {
        protocol: 'https',
        hostname: 'www.peyzajbul.com',
      },
    ],
    minimumCacheTTL: 86400,
    formats: ['image/avif', 'image/webp'],
    qualities: [75, 80, 85],
  },
  // In Next.js, we don't need the componentTagger from lovable-tagger for production
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'peyzajbul.com' }],
        destination: 'https://www.peyzajbul.com/:path*',
        permanent: true,
      },
    ];
  },
  // Single source of truth for security headers (vercel.json is intentionally empty).
  // HSTS is left to the hosting platform.
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/admin/:path*', headers: [noindexHeader] },
      { source: '/api/:path*', headers: [noindexHeader] },
    ];
  },
};


export default nextConfig;
