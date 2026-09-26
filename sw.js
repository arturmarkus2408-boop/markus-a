/* MARKUS-A service worker: offline cache + notification actions */
const CACHE = 'markus-a-v7';
const CORE = ['./', './index.html', './config.js', './manifest.json', './css/app.css',
  './js/core.js', './js/native.js', './js/i18n-dict.js', './js/i18n.js', './js/logic.js', './js/ai.js', './js/cloud.js', './js/ui.js', './js/screens.js', './js/extras.js', './js/actions.js', './js/places.js', './js/help.js', './js/assist.js', './js/voice.js', './js/main.js',
  './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // never cache API calls (Supabase, Gemini, Telegram)
  if (/supabase\.co|googleapis\.com\/v1|generativelanguage|telegram|openstreetmap\.org|nominatim/.test(url.href) && !/fonts\.googleapis/.test(url.href)) return;
  const sameOrigin = url.origin === self.location.origin;
  if (sameOrigin) {
    // network-first for app files so updates arrive; cache fallback offline
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html'))));
  } else {
    // CDN libs & fonts: cache-first
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    })));
  }
});
self.addEventListener('notificationclick', e => {
  const n = e.notification; n.close();
  const d = n.data || {};
  const action = e.action || (d.url ? '' : 'open');
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const target = d.url ? d.url : (d.id ? '#' + (action === 'open' ? 'item' : action) + '/' + d.id : '');
    if (list.length) {
      const c = list[0];
      if (d.url) { c.postMessage({ type: 'action', action: d.url.replace(/^#/, '').split('/')[0], id: d.url.split('/')[1] }); }
      else if (d.id) c.postMessage({ type: 'action', action: action === 'open' ? 'open' : action, id: d.id });
      return c.focus();
    }
    return self.clients.openWindow('./' + target);
  }));
});
