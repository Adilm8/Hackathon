import type { Metadata, Viewport } from 'next';
import { Baloo_2, Nunito } from 'next/font/google';
import './globals.css';
import { ThemeSync } from '@/components/ui/ThemeSync';
import { THEME_BOOT_SCRIPT } from '@/lib/theme';

const nunito = Nunito({ variable: '--font-nunito', subsets: ['latin'], display: 'swap' });
const baloo = Baloo_2({ variable: '--font-baloo', subsets: ['latin'], weight: ['700', '800'], display: 'swap' });

/** Absolute base for the share image (opengraph-image.png). Empty locally = Next falls back to localhost. */
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL
  || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '');

export const metadata: Metadata = {
  ...(BASE_URL ? { metadataBase: new URL(BASE_URL) } : {}),
  // Every route sets a short title; the template adds the app name ("Settings · Big Day Stories").
  // Event screens refine theirs with the event and child name (components/ui/EventTitle.tsx).
  title: { default: 'Big Day Stories', template: '%s · Big Day Stories' },
  description: 'Get your child ready for a big day in five evenings: a short story each night, built around their own questions.',
  applicationName: 'Big Day Stories',
  manifest: '/manifest.webmanifest',
  appleWebApp: { title: 'Big Day', capable: true, statusBarStyle: 'default' },
  openGraph: { siteName: 'Big Day Stories', title: 'Big Day Stories', type: 'website' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Updated at runtime to the chosen palette (lib/theme.ts applyTheme).
  themeColor: '#fff9f0',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-palette="warm" data-mode="light" suppressHydrationWarning className={`${nunito.variable} ${baloo.variable} h-full antialiased`}>
      <head>
        {/* Applies the saved colours before the first paint (no flash of the default palette). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-ink">
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
