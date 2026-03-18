import { createNavigation } from 'next-intl/navigation';
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'pt'],
  defaultLocale: 'en',
  localePrefix: 'always'
});

const { Link: IntlLink, redirect, usePathname, useRouter } = createNavigation(routing);
export { IntlLink as Link, redirect, usePathname, useRouter };
