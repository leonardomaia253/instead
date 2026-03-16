import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Instead DeFi | Empréstimos e Tokenização em uma Plataforma',
  description: 'A Instead Finance é um ecossistema DeFi completo para lending, borrowing e criação de tokens no-code em mais de 7 redes EVM.',
  keywords: 'defi, crypto lending, token factory, ethereum, arbitrum, polygon, web3',
  openGraph: {
    title: 'Instead DeFi',
    description: 'A maneira mais rápida de emprestar e criar tokens na blockchain.',
    url: 'https://instead.finance',
    siteName: 'Instead Finance',
    images: [
      {
        url: 'https://instead.finance/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'pt-BR',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
