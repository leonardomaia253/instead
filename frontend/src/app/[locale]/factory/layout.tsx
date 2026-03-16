import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Token Factory - Criar Token Sem Código | Instead DeFi',
  description: 'Lance seu próprio token ERC-20 em segundos. Deploy no-code em mais de 7 redes EVM. Mintable, Burnable e Taxable.',
  keywords: 'criar token, token factory, no-code crypto, lançar criptomoeda, erc20 generator',
  openGraph: {
    title: 'Crie seu Token em Minutos | Instead DeFi Factory',
    description: 'A maneira mais fácil e rápida de lançar seu projeto blockchain.',
    url: 'https://instead.finance/factory',
  },
};

export default function FactoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
