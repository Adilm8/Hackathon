import { Button } from '@/components/ui/Button';
import { SAFE_ADULT_NOTE, SAFE_MESSAGE } from '@/lib/store/story';

/** Fixed message for the unsafe category (8.6). Nothing is stored or counted. */
export function SafeMessage({ onBack }: { onBack: () => void }) {
  return (
    <section role="alert" className="flex flex-col gap-3 rounded-card border-2 border-line bg-surface p-5">
      <p className="text-story-m font-semibold">{SAFE_MESSAGE}</p>
      <p className="text-xs text-ink-soft">For the adult: {SAFE_ADULT_NOTE}</p>
      <Button variant="secondary" onClick={onBack}>Back to the story</Button>
    </section>
  );
}
