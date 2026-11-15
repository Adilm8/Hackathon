'use client';
import { Icon } from '@/components/icons';
import type { BigEvent, ChildProfile, EventTemplate } from '@/lib/engine/types';
import { renderText, summarise } from '@/lib/store/engine';

type Summary = ReturnType<typeof summarise>;

/** "What's on Max's mind" (4.10), computed by code from stored questions; updates right after a question. */
export function PanelView({ event, child, template, today, compact = false }: { event: BigEvent; child: ChildProfile; template: EventTemplate; today: string; compact?: boolean }) {
  const s = summarise(event, child, template, today);
  const r = (t: string) => renderText(t, child);
  return (
    <div className="flex flex-col gap-4">
      <h2 className={`${compact ? 'text-lg' : 'font-display text-2xl'} font-extrabold`}>What&apos;s on {child.name}&apos;s mind</h2>
      {s.memoryLines.length > 0 && <MemoryLine lines={s.memoryLines} />}
      {s.empty ? (
        <p className="rounded-card border border-dashed border-line p-4 text-sm text-ink-soft">No questions yet. They&apos;ll show up here as you read.</p>
      ) : (
        <TopicList rows={s.rows} render={r} compact={compact} />
      )}
      {s.selfAnswered.length > 0 && (
        <section className="rounded-card border border-line bg-surface p-4">
          <h3 className="text-sm font-extrabold">You answered yourself</h3>
          <ul className="mt-2 list-disc pl-5 text-sm">{s.selfAnswered.map((q) => <li key={q.id}>“{r(q.text)}”</li>)}</ul>
        </section>
      )}
      {!compact && s.dayTechnique && <TechniqueCard t={s.dayTechnique} />}
      {s.parentSkill && <SkillLine text={s.parentSkill} />}
      <p className="text-xs text-ink-soft">Tips, not a diagnosis. Not therapy or medical advice.</p>
    </div>
  );
}

export function TopicList({ rows, render, compact }: { rows: Summary['rows']; render: (t: string) => string; compact?: boolean }) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.topic} className="rounded-card border border-line bg-surface p-4 shadow-step">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-extrabold">{row.label} ({row.count})</h3>
            {row.answeredInStory && <span className="rounded-pill bg-success/20 px-2 py-0.5 text-xs font-bold">answered in the story</span>}
          </div>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {row.questions.map((q, i) => (
              <li key={i} className="text-ink-soft">“{render(q.text)}”{q.answeredInStory ? ' · answered in the story' : ''}</li>
            ))}
          </ul>
          {!compact && row.phrases.length > 0 && <PhraseCard phrases={row.phrases.map(render)} />}
        </li>
      ))}
    </ul>
  );
}

export function PhraseCard({ phrases }: { phrases: string[] }) {
  return (
    <div className="mt-3 rounded-field bg-surface-2 p-3">
      <p className="text-sm font-extrabold text-ink-soft">You can say</p>
      <ul className="mt-1 flex flex-col gap-1 text-sm font-bold">{phrases.map((p) => <li key={p}>{p}</li>)}</ul>
    </div>
  );
}

export function MemoryLine({ lines }: { lines: string[] }) {
  return (
    <div className="flex items-start gap-3 rounded-card border-2 border-accent bg-surface p-4">
      <Icon name="star" size={22} />
      <ul className="flex flex-col gap-1 text-sm font-bold">{lines.map((l) => <li key={l}>{l}</li>)}</ul>
    </div>
  );
}

export function SkillLine({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-card bg-surface-2 p-4">
      <Icon name="award" size={22} />
      <p className="text-sm"><strong>Tonight&apos;s parent skill:</strong> {text}</p>
    </div>
  );
}

function TechniqueCard({ t }: { t: { label: string; how: string } }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <p className="text-sm font-extrabold text-ink-soft">For the big day</p>
      <p className="mt-1 text-base font-extrabold">{t.label}</p>
      <p className="text-sm text-ink-soft">{t.how}</p>
    </div>
  );
}
