import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Staking de Tokens & Rendimentos | Instead DeFi',
  description: 'Maximize seus lucros com o Instead Staking. Ganhe recompensas em tempo real ajudando na segurança e liquidez do protocolo.',
  keywords: 'staking crypto, rendimento passivo, defi rewards, staking instant',
  openGraph: {
    title: 'Instead Staking | Maximize seus Rendimentos',
    description: 'Participe dos pools de liquidez e ganhe recompensas diárias.',
    url: 'https://instead.finance/staking',
  },
};

export default function StakingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
