import { MetadataRoute } from 'next';
import { PUBLIC_OFFER_LANDINGS } from '@/lib/revenueLanding';
import { getPublicAppOrigin } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getPublicAppOrigin();
  const locales = ['en', 'pt'];
  const routes = [
    '',
    '/lending',
    '/os',
    '/factory',
    '/solutions',
    ...PUBLIC_OFFER_LANDINGS.map((landing) => `/solutions/${landing.slug}`),
    '/staking',
    '/docs',
    '/security',
    '/simulator',
  ];

  return locales.flatMap((locale) =>
    routes.map((route) => ({
      url: `${baseUrl}/${locale}${route}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: route === '' ? 1 : 0.8,
    })),
  );
}
