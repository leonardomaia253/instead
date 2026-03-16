import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Empréstimos de Cripto (Lending) | Instead DeFi',
  description: 'Obtenha liquidez instantânea usando seus ativos como colateral. LTV de até 70% com as melhores taxas do mercado DeFi.',
  keywords: 'lending crypto, empréstimo defi, colateral cripto, liquidez web3',
  openGraph: {
    title: 'Crypto Lending Facilitado | Instead DeFi',
    description: 'Deposite seus ativos e tome empréstimos em segundos.',
    url: 'https://instead.finance/lending',
  },
};

export default function LendingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
