/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'vexoiwpreylhwxzdkfxc.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'peyzajbul.com',
      },
    ],
    minimumCacheTTL: 86400,
    formats: ['image/avif', 'image/webp'],
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
};

export default nextConfig;
