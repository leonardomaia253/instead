import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
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
    sitemap: 'https://instead.volupai.com/sitemap.xml',
  };
}
