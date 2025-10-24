import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Polyglot Experience Starter',
  description:
    'Multilingual Next.js starter configured with Tailwind CSS, RTL support and next-intl.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
