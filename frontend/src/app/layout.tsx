import { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Instead DeFi | Empréstimos e Tokenização em uma Plataforma',
  description: 'A Instead Finance é um ecossistema DeFi completo para lending, borrowing e criação de tokens no-code em mais de 7 redes EVM.',
  keywords: 'defi, crypto lending, token factory, ethereum, arbitrum, polygon, web3',
  openGraph: {
    title: 'Instead DeFi | Lending e Tokenização em uma Plataforma',
    description: 'A maneira mais rápida de emprestar e criar tokens na blockchain com segurança e transparência.',
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
    locale: 'pt-BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Instead DeFi',
    description: 'DeFi Lending & Token Factory em mais de 7 redes EVM.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon.png', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png' },
    ],
  },
  manifest: '/site.webmanifest',
  themeColor: '#7c3aed',
  alternates: {
    canonical: 'https://instead.finance',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    'name': 'Instead DeFi',
    'url': 'https://instead.finance',
    'description': 'Ecossistema DeFi completo para lending e criação de tokens no-code.',
    'applicationCategory': 'FinanceApplication',
    'operatingSystem': 'Web',
    'offers': {
      '@type': 'Offer',
      'price': '0',
    },
  };

  return (
    <html lang="pt-BR">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
