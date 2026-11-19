// Vid Search app helper ("service worker").
// Makes the site installable as an app and lets it open with a weak or no signal.
// Always tries the internet first, so website updates show straight away; the saved
// copy is only used when the internet isn't available.
// The pages themselves are always checked with GitHub (not taken from the phone's
// 10-minute memory), so a change shows the next time the app or site is opened.
// Only Vid Search's own files are handled; video players, TMDB, sync etc. are left alone.

const CACHE = 'vidsearch-v2';
const FILES = ['./', './index.html', './manifest.json', './icon-32.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // Pages (index.html, test.html, the home address): always ask GitHub if there's a newer one
  const path = new URL(req.url).pathname;
  const isPage = req.mode === 'navigate' || path.endsWith('/') || path.endsWith('.html');
  const fresh = isPage ? fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(req);

  event.respondWith(
    fresh
      .then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});
