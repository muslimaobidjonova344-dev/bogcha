/* Kichkintoy service worker: tez ochilish uchun statik fayllar keshi + oflayn sahifa.
   API (/api/) so'rovlari va shaxsiy ma'lumotlar HECH QACHON keshlanmaydi. */
const CACHE = 'kichkintoy-v2';
const OFFLINE = '/offline.html';
const PRECACHE = [OFFLINE, '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.registration.navigationPreload && self.registration.navigationPreload.enable())
      .then(() => self.clients.claim())
  );
});

const isStatic = (u) => u.pathname.startsWith('/_next/static/') || u.pathname.startsWith('/icons/');
const isImage = (u) => u.pathname.startsWith('/auth/') || /\.(png|jpg|jpeg|webp|svg|gif|woff2?)$/i.test(u.pathname);

self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/') || u.pathname.startsWith('/media/')) return;

  // Sahifalar: tarmoq birinchi (ma'lumot doim yangi), tarmoq yo'q bo'lsa oflayn sahifa
  if (r.mode === 'navigate') {
    e.respondWith((async () => {
      try { return (await e.preloadResponse) || (await fetch(r)); } catch (_) { return (await caches.match(OFFLINE)) || Response.error(); }
    })());
    return;
  }
  // Versiyali statik fayllar: kesh birinchi (o'zgarmaydi)
  if (isStatic(u)) {
    e.respondWith(caches.match(r).then((hit) => hit || fetch(r).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(r, cp)); } return res; })));
    return;
  }
  // Rasmlar: keshdan darrov, orqada yangilanadi (stale-while-revalidate)
  if (isImage(u)) {
    e.respondWith(caches.open(CACHE).then(async (c) => {
      const hit = await c.match(r);
      const net = fetch(r).then((res) => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});

self.addEventListener('push', (e) => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (_) {}
  e.waitUntil(self.registration.showNotification(d.title || 'Kichkintoy', { body: d.body || '', icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', data: { url: d.url || '/' } }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow((e.notification.data && e.notification.data.url) || '/'));
});
