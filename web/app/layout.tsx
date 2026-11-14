import type { Metadata, Viewport } from 'next';
import { Baloo_2, Nunito } from 'next/font/google';
import './globals.css';

const nunito = Nunito({ variable: '--font-nunito', subsets: ['latin'], display: 'swap' });
const baloo = Baloo_2({ variable: '--font-baloo', subsets: ['latin'], weight: ['700', '800'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Big Day Stories',
  description: 'Get your child ready for a big day in five evenings: a short story each night, built around their own questions.',
  applicationName: 'Big Day Stories',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFF9F0' },
    { media: '(prefers-color-scheme: dark)', color: '#0E1020' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${nunito.variable} ${baloo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-bg text-ink">{children}</body>
    </html>
  );
}
