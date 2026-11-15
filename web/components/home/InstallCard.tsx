'use client';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import { Button } from '@/components/ui/Button';

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const KEY = 'bds:install-dismissed';

function dismissed(): boolean {
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * "Add to home screen": the browser's install prompt where it has one (Chrome, Edge, Android),
 * a one-line hint on iPhone and iPad Safari. Hidden once installed or dismissed.
 */
export function InstallCard() {
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone;
    if (standalone || dismissed()) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as InstallEvent);
      setHidden(false);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    const t = window.setTimeout(() => {
      if (/iPhone|iPad|iPod/.test(navigator.userAgent) && !/CriOS|FxiOS/.test(navigator.userAgent)) {
        setIos(true);
        setHidden(false);
      }
    }, 0);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.clearTimeout(t);
    };
  }, []);

  if (hidden) return null;
  const close = () => {
    try {
      window.localStorage.setItem(KEY, '1');
    } catch {
      /* fine: hidden for this visit */
    }
    setHidden(true);
  };
  return (
    <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5 shadow-step" aria-labelledby="install-h">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-surface-2 text-primary-text"><Icon name="smartphone" size={22} /></span>
        <div className="flex-1">
          <h2 id="install-h" className="font-extrabold">Keep it on your home screen</h2>
          <p className="text-xs text-ink-soft">
            {ios ? 'Tap Share, then "Add to Home Screen". Chapters you opened also work offline.' : 'One tap opens tonight’s chapter, and chapters you opened also work offline.'}
          </p>
        </div>
        <button type="button" onClick={close} aria-label="Hide this tip" className="flex size-9 items-center justify-center rounded-pill text-ink-soft hover:bg-surface-2">×</button>
      </div>
      {evt && (
        <Button
          variant="secondary"
          className="w-full"
          onClick={async () => {
            await evt.prompt();
            const r = await evt.userChoice.catch(() => null);
            if (r?.outcome === 'accepted') setHidden(true);
            setEvt(null);
          }}
        >
          <Icon name="download" size={18} /> Add to home screen
        </Button>
      )}
    </section>
  );
}
