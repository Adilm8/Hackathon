import { Icon } from '@/components/icons';

/** "Updated because Max asked: 'Will it hurt?'" (A14). */
export function UpdatedChip({ text }: { text: string }) {
  return (
    <p className="inline-flex items-center gap-2 self-start rounded-pill border-2 border-primary bg-surface px-3 py-1.5 text-xs font-bold text-primary-text">
      <Icon name="sparkles" size={16} /> {text}
    </p>
  );
}
