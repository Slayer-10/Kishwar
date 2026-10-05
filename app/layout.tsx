import type { Metadata } from 'next';
import { Oswald, Barlow } from 'next/font/google';
import { inter } from '@/lib/fonts';
import './globals.css';
import './theme.css';

const oswald = Oswald({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-oswald',
});

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-barlow',
});

export const metadata: Metadata = {
  title: 'KISHWAR 26 | FAST-NUCES Multan',
  description:
    'KISHWAR 26, the FAST-NUCES Multan Campus festival. Register for sports, tech, arts and more.',
  icons: {
    icon: '/images/kishwar-logo.png',
  },
  openGraph: {
    title: 'KISHWAR 26 | FAST-NUCES Multan',
    description:
      'KISHWAR 26, the FAST-NUCES Multan Campus festival. Register for sports, tech, arts and more.',
    images: ['/images/kishwar-logo.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${oswald.variable} ${barlow.variable}`}>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
