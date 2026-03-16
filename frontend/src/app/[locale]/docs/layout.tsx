import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Docs | Instead DeFi',
  description: 'Learn how to use Instead DeFi platform step by step.',
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
