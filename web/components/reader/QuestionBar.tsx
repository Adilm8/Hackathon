'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { BrowserListener, hasRecognition, type ListenError, type ListenMode } from '@/lib/speech/listener';
import { Icon } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';

/** Three question buttons, "Ask your own" and the counter "2 of 3 questions tonight" (4.7, 4.8). */
const noop = () => () => {};

export function QuestionBar({
  buttons, asked, limit = 3, busy, childName, onAsk, voice = false, voiceMode = 'device',
}: {
  /** F18: the parent ticked the consent box in Settings. */
  voice?: boolean;
  /** How the consent said speech is recognised (lib/speech/listener.ts). */
  voiceMode?: ListenMode;
  buttons: { id: string; text: string }[]; asked: number; limit?: number; busy: boolean; childName: string;
  onAsk: (q: { text: string; buttonId?: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  // Only whether the API exists; the on-device check runs on the tap (it can crash some Chromium builds).
  const hasApi = useSyncExternalStore(noop, hasRecognition, () => false);
  const [refused, setRefused] = useState(false);
  const canListen = hasApi && !refused;
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<ListenError | null>(null);
  const listener = useRef<BrowserListener | null>(null);
  useEffect(() => () => listener.current?.stop(), []);
  useEffect(() => {
    if (!open) listener.current?.stop();
  }, [open]);
  async function listen() {
    if (listening) return listener.current?.stop(); // a second tap ends listening and keeps the words
    setVoiceError(null);
    const l = (listener.current = new BrowserListener(voiceMode));
    // Browser mode starts inside the tap, with no await first: Safari needs the tap to open the mic.
    if (voiceMode === 'device' && !(await l.available())) {
      setRefused(true);
      setVoiceError('unavailable');
      return;
    }
    setListening(true);
    try {
      // Shown for the grown-up to check and edit before sending.
      const t = await l.listenOnce({ onInterim: (w) => setText(w.slice(0, 120)) });
      setText(t.slice(0, 120));
    } catch (e) {
      const err = (typeof e === 'string' ? e : 'unheard') as ListenError;
      setVoiceError(err);
      if (err === 'dictation_off' || err === 'unavailable') setRefused(true);
    }
    listener.current = null;
    setListening(false);
  }
  if (asked >= limit)
    return <p className="rounded-card bg-surface-2 px-4 py-3 text-center text-sm font-bold">Great questions tonight. Let&apos;s ask more tomorrow.</p>;
  const askOwn = (
    <button
      type="button"
      disabled={busy}
      onClick={() => setOpen(true)}
      className="inline-flex min-h-tap shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-pill border-2 border-dashed border-primary px-4 text-sm font-bold text-primary-text disabled:opacity-50"
    >
      <Icon name="pencil" size={18} /> Ask your own
    </button>
  );
  return (
    <section aria-label={`Questions ${childName} can ask`} className="flex min-w-0 flex-col gap-1.5">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col lg:flex-row lg:items-baseline lg:gap-3">
          <h2 className="truncate text-sm font-extrabold">Did {childName} ask something?</h2>
          <span className="whitespace-nowrap text-xs font-bold text-ink-soft">{asked} of {limit} questions tonight</span>
        </div>
        {askOwn}
      </div>
      {/* Phones: one row that scrolls sideways. Wide screens: the chips wrap on their own row, none is cut off. */}
      <div className="question-row -mx-4 flex min-w-0 snap-x gap-2 overflow-x-auto px-4 py-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
        {buttons.map((b) => (
          <button
            key={b.id}
            type="button"
            disabled={busy}
            onClick={() => onAsk({ text: b.text, buttonId: b.id })}
            className="inline-flex min-h-tap shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-pill border-2 border-line bg-surface px-4 text-sm font-bold shadow-step hover:border-primary disabled:opacity-50"
          >
            <Icon name="circle-help" size={18} /> {b.text}
          </button>
        ))}
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
            <Button variant={listening ? 'primary' : 'secondary'} onClick={listen} aria-pressed={listening} className="justify-self-start">
              <Icon name={listening ? 'mic-off' : 'mic'} size={18} /> {listening ? 'Listening… tap to stop' : 'Say it'}
            </Button>
          )}
          {voiceError === 'unheard' && <p role="alert" className="text-sm text-danger">Could not hear that. Try again or type it.</p>}
          {voiceError === 'denied' && <p role="alert" className="text-sm text-danger">Allow the microphone for this site to ask by voice, or type the question.</p>}
          {voiceError === 'dictation_off' && <p role="alert" className="text-sm text-ink-soft">Turn on Dictation in the iPhone settings (General › Keyboard) to ask by voice, or type the question.</p>}
          {voiceError === 'unavailable' && <p role="alert" className="text-sm text-ink-soft">Asking by voice is not available on this device. Please type the question.</p>}
          {!(voice && canListen) && !voiceError && <p className="text-xs text-ink-soft">Tip: the microphone on your keyboard can type it for you.</p>}
          <p className="text-right text-xs text-ink-soft">{text.length} / 120</p>
          <Button type="submit" size="l" disabled={!text.trim()}>Ask</Button>
        </form>
      </Sheet>
    </section>
  );
}
