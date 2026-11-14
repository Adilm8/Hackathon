'use client';
import { useEffect, useState } from 'react';
import { BrowserListener } from '@/lib/speech/listener';
import { Icon } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';

/** Three question buttons, "Ask your own" and the counter "2 of 3 questions tonight" (4.7, 4.8). */
export function QuestionBar({
  buttons, asked, limit = 3, busy, childName, onAsk, voice = false,
}: {
  /** F18: the parent ticked the consent box in Settings. The mic shows only where recognition runs on the device. */
  voice?: boolean;
  buttons: { id: string; text: string }[]; asked: number; limit?: number; busy: boolean; childName: string;
  onAsk: (q: { text: string; buttonId?: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [canListen, setCanListen] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState(false);
  useEffect(() => {
    if (!voice) return;
    let live = true;
    new BrowserListener().available().then((v) => live && setCanListen(v));
    return () => { live = false; };
  }, [voice]);
  async function listen() {
    setVoiceError(false); setListening(true);
    try {
      const t = await new BrowserListener().listenOnce();
      setText(t.slice(0, 120)); // shown for the parent to check and edit before sending
    } catch {
      setVoiceError(true);
    }
    setListening(false);
  }
  if (asked >= limit)
    return <p className="rounded-card bg-surface-2 p-4 text-center text-base font-bold">Great questions tonight. Let&apos;s ask more tomorrow.</p>;
  return (
    <section aria-label={`Questions ${childName} can ask`} className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-extrabold">Did {childName} ask something?</h2>
        <span className="text-xs font-bold text-ink-soft">{asked} of {limit} questions tonight</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {buttons.map((b) => (
          <button
            key={b.id}
            type="button"
            disabled={busy}
            onClick={() => onAsk({ text: b.text, buttonId: b.id })}
            className="inline-flex min-h-tap items-center gap-2 rounded-pill border-2 border-line bg-surface px-4 text-sm font-bold shadow-step hover:border-primary disabled:opacity-50"
          >
            <Icon name="circle-help" size={18} /> {b.text}
          </button>
        ))}
        <button
          type="button"
          disabled={busy}
          onClick={() => setOpen(true)}
          className="inline-flex min-h-tap items-center gap-2 rounded-pill border-2 border-dashed border-primary px-4 text-sm font-bold text-primary-text disabled:opacity-50"
        >
          <Icon name="pencil" size={18} /> Ask your own
        </button>
      </div>
      <Sheet open={open} onOpenChange={setOpen} title={`What did ${childName} ask?`} description="Type it the way your child said it. Only the question is sent, never the name.">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const t = text.trim();
            if (!t) return;
            setOpen(false);
            setText('');
            onAsk({ text: t });
          }}
        >
          <label htmlFor="own-q" className="sr-only">Question</label>
          <TextArea id="own-q" maxLength={120} value={text} onChange={(e) => setText(e.target.value)} placeholder="Will the dentist be nice?" autoFocus />
          {voice && canListen && (
            <Button variant="secondary" onClick={listen} disabled={listening} className="justify-self-start">
              <Icon name="mic" size={18} /> {listening ? 'Listening…' : 'Say it'}
            </Button>
          )}
          {voiceError && <p role="alert" className="text-sm text-danger">Could not hear that. Try again or type it.</p>}
          <p className="text-right text-xs text-ink-soft">{text.length} / 120</p>
          <Button type="submit" size="l" disabled={!text.trim()}>Ask</Button>
        </form>
      </Sheet>
    </section>
  );
}
