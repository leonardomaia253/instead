import { MetadataRoute } from 'next';
import { getPublicAppOrigin } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getPublicAppOrigin();
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/login/',
        '/register/',
        '/pt/admin/',
        '/pt/login/',
        '/pt/register/',
        '/en/admin/',
        '/en/login/',
        '/en/register/',
        '/api/admin/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
