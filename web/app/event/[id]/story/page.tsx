'use client';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { GenrePicker } from '@/components/story/GenrePicker';
import { StoryOptions } from '@/components/story/StoryOptions';
import { Button, ButtonLink } from '@/components/ui/Button';
import { PlanNotFound } from '@/components/ui/NotFound';
import { Screen } from '@/components/ui/Screen';
import { applyStoryPrefs, canReplan, eventLabel, maxChapters } from '@/lib/store/engine';
import { useEvents } from '@/lib/store/events';
import { useEventCtx } from '@/lib/store/hooks';
import { cleanStoryText } from '@/lib/store/storyPrefs';
import type { BigEvent, ChildProfile, EventTemplate, StoryPrefs } from '@/lib/engine/types';

/** Story options of one event, changeable after New Story. New settings apply to chapters not written yet. */
export default function StoryOptionsPage() {
  const { id } = useParams<{ id: string }>();
  return <Screen room="parent">{() => <Editor id={id} />}</Screen>;
}

function Editor({ id }: { id: string }) {
  const ctx = useEventCtx(id);
  if (!ctx) return <PlanNotFound />;
  return <Form event={ctx.event} child={ctx.child} template={ctx.template} today={ctx.today} />;
}

function Form({ event, child, template, today }: { event: BigEvent; child: ChildProfile; template: EventTemplate; today: string }) {
  const router = useRouter();
  const update = useEvents((s) => s.updateEvent);
  const [value, setValue] = useState<StoryPrefs>(() => event.story ?? {});
  const replan = canReplan(event) && today <= event.date;
  const written = event.chapters.filter((c) => c.pages.length > 0).length;

  const save = () => {
    update(event.id, (e) => applyStoryPrefs(e, cleanStoryText(value, child.name, child.pronunciation), today, template));
    router.push(`/event/${encodeURIComponent(event.id)}`);
  };

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-extrabold">Story options</h1>
        <p className="text-sm text-ink-soft">
          {eventLabel(event, template)}.{' '}
          {written > 0
            ? `${written} ${written === 1 ? 'chapter is' : 'chapters are'} already written; changes apply to the next ones.`
            : 'Changes apply to every chapter.'}
        </p>
      </header>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-extrabold">Kind of story</h2>
        <GenrePicker value={value.genre} onChange={(genre) => setValue({ ...value, genre })} />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-extrabold">Make the story yours</h2>
        <StoryOptions
          value={value} onChange={setValue} template={template}
          maxEvenings={replan ? maxChapters(event.date, today) : event.chapters.length}
          family={child.values.family} canChangeEvenings={replan}
        />
      </section>
      <div className="sticky bottom-0 flex gap-3 bg-bg/90 py-3 backdrop-blur">
        <Button size="l" className="flex-1" onClick={save}>Save</Button>
        <ButtonLink href={`/event/${encodeURIComponent(event.id)}`} variant="ghost" size="l">Cancel</ButtonLink>
      </div>
    </div>
  );
}
