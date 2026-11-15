/*
 * Big Day Stories service worker: the app opens and already-loaded screens work offline.
 * - Pages: network first, the last copy from the cache when offline.
 * - Hashed build files (/_next/static), icons, scenes and avatar layers: cache first (they never change;
 *   avatar URLs carry a content hash).
 * - API calls are never cached (family data stays in the browser store and the server).
 * Bump VERSION to drop old caches.
 */
const VERSION = 'bds-v3';
const STATIC = /^\/(_next\/static|icons|scenes|avatar)\//;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(['/home', '/manifest.webmanifest'])).catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

const OFFLINE_HTML = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline · Big Day Stories</title>
<body style="font-family:system-ui,sans-serif;background:#fff9f0;color:#2b2540;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:24px">
<div><h1>You are offline</h1><p>Chapters you opened before still work. Connect to the internet to open this page.</p><p><a href="/home">Back to home</a></p></div></body></html>`;

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (STATIC.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(VERSION).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match('/home')) || new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })),
    );
  }
});

/*
 * Push reminders arrive empty (no payload to decrypt); the worker asks the server what the
 * reminder says. Texts never contain the child's name.
 */
self.addEventListener('push', (e) => {
  e.waitUntil(
    (async () => {
      let r = null;
      try {
        const sub = await self.registration.pushManager.getSubscription();
        if (sub) {
          const res = await fetch(`/api/push/last?endpoint=${encodeURIComponent(sub.endpoint)}`, { cache: 'no-store' });
          r = (await res.json()).reminder;
        }
      } catch {
        /* show the general reminder */
      }
      const title = (r && r.title) || 'Big Day Stories';
      await self.registration.showNotification(title, {
        body: (r && r.body) || 'Tonight\'s story is ready.',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: (r && r.id) || 'bds-reminder',
        data: { url: (r && r.url) || '/home' },
      });
    })(),
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/home';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
