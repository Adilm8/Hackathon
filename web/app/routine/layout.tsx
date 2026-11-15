import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Bedtime routine' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
