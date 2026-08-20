import { routing } from '@/navigation';
import { Metadata } from 'next';
import { Providers } from '../providers';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { getPublicAppOrigin } from '@/lib/site';

const SITE_URL = getPublicAppOrigin();

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return {
    metadataBase: new URL(SITE_URL),
    title:
      locale === 'pt'
        ? 'Instead DeFi | Empréstimos e Tokenização'
        : 'Instead DeFi | Lending and Tokenization',
    description:
      locale === 'pt'
        ? 'A Instead Finance é um ecossistema DeFi completo para lending, borrowing e criação de tokens no-code.'
        : 'Instead Finance is a complete DeFi ecosystem for lending, borrowing, and no-code token creation.',
    keywords: 'defi, crypto lending, token factory, ethereum, arbitrum, polygon, web3',
    icons: {
      icon: [{ url: '/instead-logo.svg', type: 'image/svg+xml' }],
      shortcut: ['/instead-logo.svg'],
    },
    openGraph: {
      title: 'Instead DeFi',
      description: 'The fastest way to lend and create tokens on blockchain.',
      url: SITE_URL,
      siteName: 'Instead Finance',
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: 'Instead DeFi Platform',
        },
      ],
      locale: locale === 'pt' ? 'pt-BR' : 'en-US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Instead DeFi',
      description: 'Infraestrutura para crédito com garantia e emissão de ativos em redes EVM.',
      images: ['/og-image.png'],
    },
    alternates: {
      canonical: SITE_URL,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Instead DeFi',
    url: SITE_URL,
    description: 'Complete DeFi ecosystem for lending and no-code token creation.',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <NextIntlClientProvider locale={locale} messages={messages}>
        <Providers>{children}</Providers>
      </NextIntlClientProvider>
    </>
  );
}
