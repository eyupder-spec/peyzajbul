import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getAllCategories, Category } from '@/lib/categories';
import { seoCities, seoDistricts } from '@/lib/seo-data';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://peyzajbul.com';
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch all approved firms
  const { data: firms } = await supabase
    .from('firms')
    .select('slug, updated_at')
    .eq('is_approved', true)
    .eq('is_active', true);

  // Fetch all published blog posts
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('slug, published_at')
    .eq('is_published', true);

  // Fetch all published projects
  const { data: projects } = await (supabase.from as any)('projects')
    .select('slug, category, city, updated_at, firms!inner(slug)')
    .eq('status', 'published');

  const firmUrls = (firms || []).map((firm) => ({
    url: `${baseUrl}/firma/${firm.slug}`,
    lastModified: new Date(firm.updated_at || new Date()),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  const blogUrls = (posts || []).map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.published_at || new Date()),
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  const projectUrls = (projects || []).map((project: any) => ({
    url: `${baseUrl}/${project.category}/${project.city}/${project.firms?.slug || ''}/${project.slug}`,
    lastModified: new Date(project.updated_at || new Date()),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // SEO: Hizmetler (Kategoriler)
  const categories = getAllCategories();
  const serviceUrls = categories.map((cat) => ({
    url: `${baseUrl}/hizmetler/${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // SEO: İller
  const cityUrls = seoCities.map((city) => ({
    url: `${baseUrl}/iller/${city.slug}-peyzaj-firmalari`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  // SEO: Hizmet + İl Koleksiyonu
  const serviceCityUrls: MetadataRoute.Sitemap = [];
  // SEO: Hizmet + İl + İlçe Koleksiyonu
  const serviceCityDistrictUrls: MetadataRoute.Sitemap = [];

  categories.forEach((cat) => {
    seoCities.forEach((city) => {
      // /hizmet/[service]/[city]
      serviceCityUrls.push({
        url: `${baseUrl}/hizmet/${cat.slug}/${city.slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.5,
      });

      const districts = seoDistricts[city.slug] || [];
      districts.forEach((district) => {
        // /hizmet/[service]/[city]/[district]
        serviceCityDistrictUrls.push({
          url: `${baseUrl}/hizmet/${cat.slug}/${city.slug}/${district.slug}`,
          lastModified: new Date(),
          changeFrequency: 'monthly' as const,
          priority: 0.5,
        });
      });
    });
  });

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/firmalar`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/hizmetler`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/iller`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    ...serviceUrls,
    ...cityUrls,
    ...serviceCityUrls,
    ...serviceCityDistrictUrls,
    ...firmUrls,
    ...blogUrls,
    ...projectUrls,
  ];
}
