'use client';
/**
 * Browser side of push reminders: switch on (permission + subscription), keep the server's
 * reminder times up to date, switch off. Where push is not available (iPhone without the app
 * on the home screen, some browsers, a server without keys) the app shows in-app reminders.
 */
import { clock } from '@/lib/engine/clock';
import type { BigEvent } from '@/lib/engine/types';
import { usePrefs } from '@/lib/store/prefs';
import { computeReminders, type ReminderOptions } from './reminders';

export type PushSupport = 'ok' | 'unsupported' | 'ios-install' | 'denied' | 'server-off';

export function isIos(): boolean {
  return typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);
}

function standalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || !!(navigator as { standalone?: boolean }).standalone;
}

/** What the browser allows, before asking anything. */
export function pushSupport(): Exclude<PushSupport, 'server-off'> {
  if (typeof window === 'undefined') return 'unsupported';
  const has = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (!has) return isIos() && !standalone() ? 'ios-install' : 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  return 'ok';
}

let keyCache: Promise<string | null> | null = null;
export function serverKey(): Promise<string | null> {
  keyCache ??= fetch('/api/push')
    .then((r) => (r.ok ? (r.json() as Promise<{ publicKey: string | null }>) : { publicKey: null }))
    .then((j) => j.publicKey)
    .catch(() => null);
  return keyCache;
}

function keyBytes(b64u: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64u.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64u.length + 3) % 4));
  const out = new Uint8Array(new ArrayBuffer(s.length));
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  await navigator.serviceWorker.register('/sw.js');
  return navigator.serviceWorker.ready;
}

function options(): ReminderOptions {
  const p = usePrefs.getState();
  return { evening: p.reminderEvening, quietStart: p.quietStart, quietEnd: p.quietEnd };
}

async function sendReminders(endpoint: string, events: BigEvent[]): Promise<boolean> {
  const reminders = computeReminders(events, clock.today(), Date.now(), options());
  const res = await fetch('/api/push', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint, reminders }),
  }).catch(() => null);
  return !!res?.ok;
}

/** Asks for permission, subscribes and sends the reminder times. Returns why it could not. */
export async function enablePush(events: BigEvent[]): Promise<PushSupport> {
  const support = pushSupport();
  if (support !== 'ok') return support;
  const key = await serverKey();
  if (!key) return 'server-off';
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return perm === 'denied' ? 'denied' : 'unsupported';
  try {
    const reg = await registration();
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }));
    if (!(await sendReminders(sub.endpoint, events))) return 'unsupported';
    usePrefs.getState().setPush(true);
    return 'ok';
  } catch {
    return 'unsupported';
  }
}

export async function disablePush(): Promise<void> {
  usePrefs.getState().setPush(false);
  try {
    const sub = await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription();
    if (!sub) return;
    await fetch('/api/push', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => null);
    await sub.unsubscribe();
  } catch {
    /* nothing to undo */
  }
}

/** Re-sends the reminder times (big days or chapters changed, times edited). Quiet no-op when off. */
export async function refreshPush(events: BigEvent[]): Promise<void> {
  if (!usePrefs.getState().push || pushSupport() !== 'ok' || Notification.permission !== 'granted') return;
  try {
    const sub = await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription();
    if (sub) await sendReminders(sub.endpoint, events);
  } catch {
    /* next visit tries again */
  }
}
