import { Metadata } from 'next';
import { Providers } from '../providers';
import '../globals.css';
import { NextIntlClientProvider, useMessages } from 'next-intl';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  return {
    title: locale === 'pt' ? 'Instead DeFi | Empréstimos e Tokenização' : 'Instead DeFi | Lending and Tokenization',
    description: locale === 'pt' 
      ? 'A Instead Finance é um ecossistema DeFi completo para lending, borrowing e criação de tokens no-code.' 
      : 'Instead Finance is a complete DeFi ecosystem for lending, borrowing, and no-code token creation.',
    keywords: 'defi, crypto lending, token factory, ethereum, arbitrum, polygon, web3',
    openGraph: {
      title: 'Instead DeFi',
      description: 'The fastest way to lend and create tokens on blockchain.',
      url: 'https://instead.finance',
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
      description: 'DeFi Lending & Token Factory in 7+ EVM networks.',
      images: ['/og-image.png'],
    },
    alternates: {
      canonical: 'https://instead.finance',
    },
  };
}

export default function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const messages = useMessages();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    'name': 'Instead DeFi',
    'url': 'https://instead.finance',
    'description': 'Complete DeFi ecosystem for lending and no-code token creation.',
    'applicationCategory': 'FinanceApplication',
    'operatingSystem': 'Web',
    'offers': {
      '@type': 'Offer',
      'price': '0',
    },
  };

  return (
    <html lang={locale}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
