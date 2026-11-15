import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Parent panel' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
