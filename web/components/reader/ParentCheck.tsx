'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/Field';
import { Icon } from '@/components/icons';

/** Parent check for sensitive questions (4.9): the child hears nothing until the parent decides. */
export function ParentCheck({
  question, draft, onShow, onSelf,
}: {
  question: string; draft?: string; onShow: (text: string, edited: boolean) => void; onSelf: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(draft ?? '');
  return (
    <section aria-label="Parent check" className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 text-ink shadow-pop">
      <p className="inline-flex items-center gap-1.5 self-start rounded-pill bg-accent px-3 py-1 text-xs font-extrabold text-accent-ink">
        <Icon name="shield-check" size={16} /> Only you see this
      </p>
      <h2 className="text-lg font-extrabold">Your child asked: “{question}”</h2>
      {draft ? (
        editing ? (
          <>
            <label htmlFor="pc-edit" className="text-sm font-bold">Your answer</label>
            <TextArea id="pc-edit" maxLength={400} value={text} onChange={(e) => setText(e.target.value)} />
            <Button size="l" disabled={!text.trim()} onClick={() => onShow(text.trim(), true)}>Show</Button>
          </>
        ) : (
          <>
            <p className="text-sm text-ink-soft">Here is a draft that follows your family&apos;s values. Show it, change it, or answer yourself.</p>
            <blockquote className="rounded-field border-l-4 border-primary bg-surface-2 p-3 text-base">{draft}</blockquote>
            <div className="grid gap-2 sm:grid-cols-3">
              <Button onClick={() => onShow(draft, false)}>Show</Button>
              <Button variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
              <Button variant="ghost" onClick={onSelf}>I&apos;ll answer myself</Button>
            </div>
          </>
        )
      ) : (
        <>
          <p className="text-base">
            We&apos;d rather you answer this one. Here is a way to start: “That&apos;s a big question. Let&apos;s talk about it together.”
          </p>
          <Button onClick={onSelf}>I&apos;ll answer myself</Button>
        </>
      )}
    </section>
  );
}

/**
 * What the child sees first after a sensitive question: no adult wording, no draft. A grown-up
 * opens the parent check (through the parent gate); otherwise the question waits in the parent panel.
 */
export function AskGrownUp({ childName, onGrownUp, onLater }: { childName: string; onGrownUp: () => void; onLater: () => void }) {
  return (
    <section aria-label="Ask a grown-up" className="flex flex-col items-center gap-4 rounded-card border border-line bg-surface p-6 text-center text-ink shadow-pop">
      <span className="flex size-14 items-center justify-center rounded-pill bg-accent text-accent-ink"><Icon name="hand-heart" size={28} /></span>
      <h2 className="font-display text-xl font-extrabold">Great question, {childName}!</h2>
      <p className="text-base">Let&apos;s ask your grown-up about this one together.</p>
      <div className="grid w-full gap-2 sm:grid-cols-2">
        <Button onClick={onGrownUp}>I&apos;m the grown-up</Button>
        <Button variant="secondary" onClick={onLater}>Keep reading</Button>
      </div>
    </section>
  );
}
