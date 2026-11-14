import type { Metadata, Viewport } from 'next';
import { Baloo_2, Nunito } from 'next/font/google';
import './globals.css';
import { ThemeSync } from '@/components/ui/ThemeSync';
import { THEME_BOOT_SCRIPT } from '@/lib/theme';

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
