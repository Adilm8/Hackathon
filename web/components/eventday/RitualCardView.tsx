import { Character } from '@/components/character';
import { Icon } from '@/components/icons';
import type { ChildProfile, RitualCard } from '@/lib/engine/types';
import { renderText } from '@/lib/engine/text';
import { stepIcon } from './stepIcon';

/**
 * The event-day card (docs/SPEC.md 4.12): the character in the brave pose, three numbered
 * "first → then" steps with large icons, one technique, the disclaimer. The same markup is the
 * printable A5 card (11.7, style guide screen 12): black-and-white safe, no colour needed to read it.
 */
export function RitualCardView({ card, child, label, dateText }: { card: RitualCard; child: ChildProfile; label: string; dateText: string }) {
  const name = child.name;
  return (
    <article aria-label={`${name}'s big day card`} className="ritual-card flex flex-col gap-5 rounded-card border-2 border-ink/80 bg-surface p-5 text-ink">
      <header className="flex items-center gap-4">
        <Character character={child.character} mood="brave" size={104} decorative />
        <div className="flex flex-col">
          <p className="text-sm font-bold text-ink-soft">{label} · {dateText}</p>
          <h1 className="font-display text-2xl font-extrabold leading-tight">{name}&apos;s big day</h1>
          <p className="text-base font-bold">First, then. One step at a time.</p>
        </div>
      </header>
      <ol className="flex flex-col gap-3">
        {card.steps.map((s, i) => (
          <li key={i} className="flex items-center gap-4 rounded-card border-2 border-ink/30 p-3">
            <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-pill border-2 border-ink text-lg font-extrabold">
              {i + 1}
            </span>
            <Icon name={stepIcon(s, i)} size={44} strokeWidth={1.75} />
            <span className="text-xl font-extrabold leading-snug">
              {i === 0 ? 'First: ' : i === 1 ? 'Then: ' : 'And then: '}
              {renderText(s, child)}
            </span>
          </li>
        ))}
      </ol>
      <section aria-label="If it feels hard" className="flex items-start gap-3 rounded-card border-2 border-dashed border-ink/40 p-3">
        <Icon name="hand-heart" size={32} />
        <div>
          <p className="text-sm font-bold text-ink-soft">If it feels hard</p>
          <p className="text-lg font-extrabold">{card.technique.label}</p>
          <p className="text-base">{renderText(card.technique.how, child)}</p>
        </div>
      </section>
      <p className="text-xs text-ink-soft">Not therapy or medical advice.{card.source === 'llm' ? ' Steps written with AI from our checked template.' : ''}</p>
    </article>
  );
}
