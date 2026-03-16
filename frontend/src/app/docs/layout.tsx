import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documentação & Ajuda | Instead DeFi',
  description: 'Aprenda como utilizar a plataforma Instead DeFi: lending, tokenização e staking explicados passo a passo.',
  keywords: 'documentação defi, ajuda cripto, como criar token, tutorial lending',
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
