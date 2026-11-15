'use client';
import { Icon, type IconName } from '@/components/icons';
import { ChoiceCard } from '@/components/ui/ChoiceCard';
import { GENRE_OPTIONS } from '@/lib/engine/storyPrefs';
import type { StoryGenre } from '@/lib/engine/types';

const GENRE_ICON: Record<StoryGenre, IconName> = {
  bedtime: 'cloud-moon', funny: 'smile-plus', discover: 'book-open', values: 'hand-heart',
  fairy_tale: 'sparkles', hero: 'crown', mindful: 'wind',
};

/** Story genre (New Story, right after the big day). Missing value = Bedtime story. */
export function GenrePicker({ value, onChange }: { value: StoryGenre | undefined; onChange: (g: StoryGenre) => void }) {
  const current = value ?? 'bedtime';
  return (
    <div role="radiogroup" aria-label="Kind of story" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {GENRE_OPTIONS.map((g) => (
        <ChoiceCard
          key={g.id}
          selected={current === g.id}
          onSelect={() => onChange(g.id)}
          icon={<Icon name={GENRE_ICON[g.id]} size={26} />}
          title={g.label}
          caption={g.caption}
        />
      ))}
    </div>
  );
}
