import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KISHWAR',
  description: 'FAST-NUCES Multan Mega Event Registration & Management System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
