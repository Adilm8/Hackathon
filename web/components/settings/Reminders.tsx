'use client';
import { useEffect, useState } from 'react';
import { Field, TextInput } from '@/components/ui/Field';
import { Toggle } from '@/components/ui/Toggle';
import { disablePush, enablePush, pushSupport, refreshPush, serverKey, type PushSupport } from '@/lib/push/client';
import { isValidTime } from '@/lib/push/reminders';
import { useEvents } from '@/lib/store/events';
import { usePrefs } from '@/lib/store/prefs';

const WHY: Record<Exclude<PushSupport, 'ok'>, string> = {
  unsupported: 'This browser cannot show reminders. You will still see them on the home page.',
  'ios-install': 'On iPhone and iPad, add the app to your home screen first (Share, then "Add to Home Screen"), open it from there and switch reminders on.',
  denied: 'Notifications are blocked for this site. Allow them in the browser settings to get reminders.',
  'server-off': 'Reminders on this device are not set up on this server yet. You will still see them on the home page.',
};

/** Settings > Reminders: opt-in push reminders, the evening time and quiet hours. */
export function Reminders() {
  const events = useEvents((s) => s.events);
  const p = usePrefs();
  const [status, setStatus] = useState<PushSupport | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    const s = pushSupport();
    if (s !== 'ok') queueMicrotask(() => live && setStatus(s));
    else void serverKey().then((k) => live && setStatus(k ? 'ok' : 'server-off'));
    return () => {
      live = false;
    };
  }, []);

  const time = (key: 'reminderEvening' | 'quietStart' | 'quietEnd', v: string) => {
    if (!isValidTime(v)) return;
    p.setReminderTimes({ [key]: v });
    void refreshPush(events);
  };

  return (
    <div className="flex flex-col gap-4">
      <Toggle
        id="push" label="Reminders on this device"
        hint="Story time in the evening, the morning of the big day, and the check-in the day after. No names on the lock screen."
        checked={p.push}
        onChange={async (on) => {
          if (busy) return;
          setBusy(true);
          if (on) setStatus(await enablePush(events));
          else await disablePush();
          setBusy(false);
        }}
      />
      {status && status !== 'ok' && <p role="status" className="rounded-card bg-surface-2 p-3 text-sm">{WHY[status]}</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id="rem-evening" label="Story time">
          <TextInput id="rem-evening" type="time" value={p.reminderEvening} onChange={(e) => time('reminderEvening', e.target.value)} />
        </Field>
        <Field id="rem-qs" label="Quiet from">
          <TextInput id="rem-qs" type="time" value={p.quietStart} onChange={(e) => time('quietStart', e.target.value)} />
        </Field>
        <Field id="rem-qe" label="Quiet until">
          <TextInput id="rem-qe" type="time" value={p.quietEnd} onChange={(e) => time('quietEnd', e.target.value)} />
        </Field>
      </div>
      <p className="text-xs text-ink-soft">Nothing is sent during quiet hours: a reminder that would fall there waits until they end.</p>
    </div>
  );
}
