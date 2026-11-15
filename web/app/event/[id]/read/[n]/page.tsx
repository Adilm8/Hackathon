'use client';
import { useParams } from 'next/navigation';
import { Screen } from '@/components/ui/Screen';
import { Reader } from '@/components/reader/Reader';

/** Reader for chapter n (docs/SPEC.md 4.7–4.9). */
export default function ReadPage() {
  const { id, n } = useParams<{ id: string; n: string }>();
  return <Screen wide fit childMode>{() => <Reader eventId={id} index={Number(n)} />}</Screen>;
}
