'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Character } from '@/components/character';
import { Icon } from '@/components/icons';
import { PanelView } from '@/components/panel/PanelView';
import { Button, ButtonLink } from '@/components/ui/Button';
import { PlanNotFound } from '@/components/ui/NotFound';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { clock } from '@/lib/engine/clock';
import type { Page, Question } from '@/lib/engine/types';
import { useEvents } from '@/lib/store/events';
import { useEventCtx } from '@/lib/store/hooks';
import { newId } from '@/lib/store/id';
import { useSettings } from '@/lib/store/settings';
import { isChapterOpen, questionButtonsForPage, questionsInChapter, renderText, updatedChipText } from '@/lib/store/engine';
import { cleanText, isBlank, LIMITS, precheck } from '@/lib/safety/filters';
import { askQuestion, generateChapter } from '@/lib/store/story';
import { PagePhotos } from '@/components/photos/PagePhotos';
import { isOn } from '@/lib/flags';
import { getRecording, deleteRecording, recordingKey } from '@/lib/speech/recordings';
import { getWorkspace } from '@/lib/store/workspace';
import { ListenButton } from './ListenButton';
import { RecordButton } from './RecordButton';
import { PageView } from './PageView';
import { ParentCheck } from './ParentCheck';
import { QuestionBar } from './QuestionBar';
import { SafeMessage } from './SafeMessage';

type Mode = { kind: 'read' } | { kind: 'check'; q: Question; draft?: string } | { kind: 'unsafe' } | { kind: 'end' };

export function Reader({ eventId, index }: { eventId: string; index: number }) {
  const ctx = useEventCtx(eventId);
  const router = useRouter();
  const st = useEvents.getState();
  const textSize = useSettings((s) => s.textSize);
  const nightMode = useSettings((s) => s.nightMode);
  const voiceConsent = useSettings((s) => s.voiceQuestionConsentOn);
  const setTextSize = useSettings((s) => s.setTextSize);
  const [live, setLive] = useState<Page[] | null>(null);
  const [pageIdx, setPageIdx] = useState(0);
  const [mode, setMode] = useState<Mode>({ kind: 'read' });
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const started = useRef(false);
  const [recs, setRecs] = useState<{ key: string; has: boolean }>({ key: '', has: false });
  const [recTick, setRecTick] = useState(0);

  const chapter = ctx?.event.chapters.find((c) => c.index === index);
  const allowed = ctx && chapter ? isChapterOpen(chapter, ctx.event, ctx.today, ctx.hasAccess) : false;
  const needsPay = !!ctx && !!chapter && index > 1 && !ctx.hasAccess;

  useEffect(() => {
    if (!ctx || !chapter) return;
    if (needsPay) router.replace(`/event/${eventId}/paywall`);
    else if (!allowed) router.replace(`/event/${eventId}`);
  }, [ctx, chapter, allowed, needsPay, router, eventId]);

  // Generate once; a stored chapter is never generated again (4.7).
  useEffect(() => {
    if (!ctx || !chapter || !allowed || chapter.pages.length > 0 || started.current) return;
    started.current = true;
    void generateChapter({ event: ctx.event, child: ctx.child, template: ctx.template, index }, setLive).then((r) => {
      if ('error' in r) return router.replace(`/event/${eventId}/paywall`);
      useEvents.getState().applyChapter(eventId, index, { pages: r.pages, summary: r.summary, usedTechniques: r.usedTechniques, place: r.place, source: r.source }, clock.today());
      setLive(null);
    });
  }, [ctx, chapter, allowed, index, eventId, router]);

  const pages = chapter && chapter.pages.length > 0 ? chapter.pages : live ?? [];
  const page = pages[Math.min(pageIdx, Math.max(0, pages.length - 1))];
  const night = nightMode === 'on' || (nightMode === 'auto' && (clock.hour() >= 19 || clock.hour() < 6));
  const render = useMemo(() => (t: string) => renderText(t, ctx?.child ?? null), [ctx?.child]);
  const touchX = useRef<number | null>(null);
  const recKey = page ? recordingKey(getWorkspace(), eventId, index, page.id) : '';
  useEffect(() => {
    if (!isOn('parentVoice') || !recKey) return;
    let live = true;
    getRecording(recKey).then((b) => live && setRecs({ key: recKey, has: !!b })).catch(() => {});
    return () => { live = false; };
  }, [recKey, recTick]);

  if (!ctx) return <PlanNotFound />;
  if (!chapter || !allowed) return <Skeleton className="h-96" />;
  const { event, child, template } = ctx;
  const total = event.chapters.length;
  const asked = questionsInChapter(event, index);
  const storyPages = pages.filter((p) => p.kind === 'story');
  const isLast = pageIdx >= pages.length - 1;

  const next = () => {
    if (!isLast) return setPageIdx(pageIdx + 1);
    st.markChapterRead(eventId, index, clock.today());
    setMode({ kind: 'end' });
  };
  const prev = () => setPageIdx(Math.max(0, pageIdx - 1));

  const ask = async ({ text, buttonId }: { text: string; buttonId?: string }) => {
    if (!page || busy) return;
    const clean = buttonId ? text : cleanText(text, { max: LIMITS.question, childName: child.name, pronunciation: child.pronunciation }).text;
    if (isBlank(clean)) return;
    // Level 1 in the browser too (8.6): an unsafe question never leaves the device.
    const pre = buttonId ? null : precheck(clean).category;
    if (pre === 'unsafe') return setMode({ kind: 'unsafe' });
    setBusy(true);
    const nextStory = pages.slice(pageIdx + 1).find((p) => p.kind === 'story');
    const res = await askQuestion({
      event, child, template, chapter: index, text: clean, source: buttonId ? 'button' : 'custom', buttonId,
      currentPage: page, nextPage: nextStory, questionsInChapter: asked, forced: pre === 'sensitive' ? 'sensitive' : undefined,
    });
    setBusy(false);
    if (res.category === 'unsafe') return setMode({ kind: 'unsafe' });
    const rec = st.recordQuestion(
      eventId,
      {
        id: newId(), chapter: index, afterPageId: page.id, text: clean, source: buttonId ? 'button' : 'custom', buttonId,
        category: res.category, topic: res.topic, answer: res.answer, parentPhrase: res.parentPhrase,
      },
      clock.today(),
    );
    if (!rec.ok) return;
    const q = rec.question;
    if (res.category === 'sensitive') return setMode({ kind: 'check', q, draft: res.draft || undefined });
    st.insertAnswer(eventId, index, { questionId: q.id, afterPageId: page.id, sentences: res.answer, background: page.background, source: res.source });
    if (res.category === 'on_topic' && res.nextPage && nextStory && child.styleMode === 'story') {
      st.rewritePage(eventId, index, nextStory.id, res.nextPage, q.id, res.source);
      // A page rewritten after a question loses its recording (SPEC 11.6).
      void deleteRecording(recordingKey(getWorkspace(), eventId, index, nextStory.id)).catch(() => {});
    }
    setPageIdx(pageIdx + 1);
  };

  const updatedText = (() => {
    if (!page?.updatedBecause) return undefined;
    const q = event.questions.find((x) => x.id === page.updatedBecause);
    return q ? updatedChipText(q, child.name) : undefined;
  })();

  const body = (() => {
    if (mode.kind === 'end') return <ChapterEnd ctx={ctx} index={index} total={total} onReread={() => { setPageIdx(0); setMode({ kind: 'read' }); }} />;
    if (mode.kind === 'unsafe') return <SafeMessage onBack={() => setMode({ kind: 'read' })} />;
    if (mode.kind === 'check')
      return (
        <ParentCheck
          question={render(mode.q.text)}
          draft={mode.draft}
          onShow={(text, edited) => {
            const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean).map((t) => ({ text: t, kind: 'describe' as const }));
            st.setParentAction(eventId, mode.q.id, edited ? 'edited' : 'shown', sentences);
            st.insertAnswer(eventId, index, { questionId: mode.q.id, afterPageId: mode.q.afterPageId, sentences, source: 'llm' });
            setMode({ kind: 'read' });
            setPageIdx(pageIdx + 1);
          }}
          onSelf={() => {
            st.setParentAction(eventId, mode.q.id, 'self');
            setMode({ kind: 'read' });
          }}
        />
      );
    if (!page)
      return (
        <div role="status" aria-label="Writing tonight's chapter" className="flex flex-col gap-4">
          <Skeleton className="aspect-[4/3] w-full sm:aspect-[16/9]" />
          <Skeleton className="h-6 w-11/12" />
          <Skeleton className="h-6 w-4/5" />
          <Skeleton className="h-6 w-2/3" />
          <p className="text-sm text-ink-soft">Writing tonight&apos;s chapter…</p>
        </div>
      );
    return (
      <div
        className="flex flex-col gap-5"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 60) (dx < 0 ? next : prev)();
        }}
      >
        <PageView page={page} character={child.character} render={render} textSize={textSize} night={night} active={active} updatedText={updatedText} />
        {isOn('placePhotos') && page.kind === 'story' && storyPages[0] === page && chapter.beats.includes('what_happens') && event.photos.length > 0 && (
          <PagePhotos photos={event.photos} />
        )}
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={prev} disabled={pageIdx === 0} aria-label="Previous page">
            <Icon name="arrow-right" size={20} className="rotate-180" />
          </Button>
          <ListenButton key={page.id} sentences={page.sentences.map((s) => renderText(s.text, child, { speak: true, pronunciation: child.pronunciation }))} onSentence={setActive}
            recordingKey={isOn('parentVoice') ? recKey : undefined} hasRecording={recs.key === recKey && recs.has} voiceName={child.values.family[0]} />
          <Button className="flex-1" onClick={next}>
            {isLast ? 'Finish' : page.kind === 'answer' ? 'Back to story' : 'Next'}
          </Button>
        </div>
        {isOn('parentVoice') && (
          <RecordButton recKey={recKey} has={recs.key === recKey && recs.has} onChange={() => setRecTick((n) => n + 1)} />
        )}
        <Dots count={pages.length} current={pageIdx} />
        {page.kind === 'story' && (
          <QuestionBar buttons={questionButtonsForPage(template, storyPages.indexOf(page) + 1).map((b) => ({ id: b.id, text: render(b.text) }))} asked={asked} busy={busy} childName={child.name} onAsk={ask} voice={isOn('voiceQuestion') && !!voiceConsent} />
        )}
        {busy && <p role="status" className="text-sm font-bold text-ink-soft">Thinking about {child.name}&apos;s question…</p>}
      </div>
    );
  })();

  return (
    <div className={`${night ? 'reader-night' : ''} -mx-4 -my-6 min-h-[calc(100dvh-8rem)] bg-bg px-4 py-6 text-ink`}>
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex items-center gap-2">
            <Link href={`/event/${eventId}`} aria-label="Back to the plan" className="inline-flex size-tap items-center justify-center rounded-pill hover:bg-surface-2">
              <Icon name="door-open" size={22} />
            </Link>
            <div className="flex-1">
              <ProgressBar value={mode.kind === 'end' ? storyPages.length : Math.min(pageIdx + 1, pages.length || 1)} max={Math.max(pages.length, 1)} label={`Chapter ${index} of ${total}, page ${pageIdx + 1}`} />
            </div>
            <button
              type="button"
              onClick={() => setTextSize(textSize === 'm' ? 'l' : textSize === 'l' ? 'xl' : 'm')}
              aria-label={`Text size: ${textSize.toUpperCase()}. Tap to change`}
              className="inline-flex size-tap items-center justify-center rounded-pill font-extrabold hover:bg-surface-2"
            >
              Aa
            </button>
            <button
              type="button"
              onClick={() => useSettings.getState().setNightMode(night ? 'off' : 'on')}
              aria-label={night ? 'Switch to day colours' : 'Switch to night colours'}
              className="inline-flex size-tap items-center justify-center rounded-pill hover:bg-surface-2"
            >
              <Icon name={night ? 'sun' : 'moon'} size={22} />
            </button>
          </div>
          <p className="text-xs font-bold text-ink-soft">
            {total === 1 ? 'Quick prep' : `Chapter ${index} of ${total}`} · {chapter.title}
          </p>
          {body}
        </div>
        <aside aria-label="Parent panel" className="room-parent hidden h-fit rounded-card border border-line bg-bg p-5 text-ink lg:block">
          <PanelView event={event} child={child} template={template} today={ctx.today} compact />
          <ButtonLink href={`/event/${eventId}/panel`} variant="ghost" className="mt-3">Open the full panel</ButtonLink>
        </aside>
      </div>
    </div>
  );
}

function Dots({ count, current }: { count: number; current: number }) {
  if (count <= 1) return null;
  return (
    <div aria-hidden className="flex justify-center gap-2">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={`h-2.5 rounded-pill transition-all duration-fast ${i === current ? 'w-6 bg-primary' : 'w-2.5 bg-line'}`} />
      ))}
    </div>
  );
}

function ChapterEnd({ ctx, index, total, onReread }: { ctx: NonNullable<ReturnType<typeof useEventCtx>>; index: number; total: number; onReread: () => void }) {
  const { event, child, hasAccess } = ctx;
  const chapter = event.chapters.find((c) => c.index === index)!;
  const nextCh = event.chapters.find((c) => c.index === index + 1);
  const last = index === total;
  return (
    <section className="flex flex-col items-center gap-4 py-4 text-center">
      <Character character={child.character} mood="happy" size={140} decorative />
      <h2 className="font-display text-2xl font-extrabold">{total === 1 ? 'Quick prep done!' : `Chapter ${index} of ${total} done`}</h2>
      <p className="text-base text-ink-soft">{last ? `${child.name} knows the whole story now.` : nextCh ? 'The next chapter opens tomorrow evening.' : ''}</p>
      {chapter.parentSkill && (
        <div className="w-full rounded-card bg-surface-2 p-4 text-left text-sm">
          <strong>Tonight&apos;s parent skill:</strong> {chapter.parentSkill}
        </div>
      )}
      <div className="grid w-full gap-3 sm:grid-cols-2">
        <ButtonLink href={`/event/${event.id}/panel${index === 1 && !hasAccess ? '?after=1' : ''}`} size="l">
          See what&apos;s on {child.name}&apos;s mind
        </ButtonLink>
        <Button variant="secondary" size="l" onClick={onReread}>Read it again</Button>
      </div>
      <Link href={`/event/${event.id}`} className="inline-flex min-h-tap items-center font-bold text-primary-text underline">Back to the plan</Link>
    </section>
  );
}
