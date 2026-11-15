import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Payment complete' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
