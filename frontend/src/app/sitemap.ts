import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://instead.finance';
  const locales = ['en', 'pt'];
  const routes = [
    '',
    '/lending',
    '/factory',
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
