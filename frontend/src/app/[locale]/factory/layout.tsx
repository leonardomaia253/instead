import { Metadata } from 'next';
import { getPublicAppOrigin } from '@/lib/site';

const siteUrl = getPublicAppOrigin();

export const metadata: Metadata = {
  title: 'Emissão de ativos digitais | Instead',
  description: 'Lance seu próprio token ERC-20 em segundos. Deploy no-code em mais de 7 redes EVM. Mintable, Burnable e Taxable.',
  keywords: 'criar token, token factory, no-code crypto, lançar criptomoeda, erc20 generator',
  openGraph: {
    title: 'Crie seu Token em Minutos | Instead DeFi Factory',
    description: 'A maneira mais fácil e rápida de lançar seu projeto blockchain.',
    url: `${siteUrl}/factory`,
  },
};

export default function FactoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
