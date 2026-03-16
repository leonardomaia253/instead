import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://instead.finance';
  const routes = [
    '',
    '/lending',
    '/factory',
    '/staking',
    '/docs',
    '/security',
    '/simulator',
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Error().stack?.includes('sitemap') ? new Date() : new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }));
}
