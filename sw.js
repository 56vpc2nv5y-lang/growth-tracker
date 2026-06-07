const CACHE = 'growth-tracker-v14-stability';
const APP_SHELL = ['/', '/growth_tracker.html', '/stability.js', '/smoke-test.html', '/manifest.webmanifest', '/app-icon.svg', '/app-icon-192.png', '/app-icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then(hit => hit || caches.match('/growth_tracker.html')))
  );
});

self.addEventListener('push', event => {
  const data = event.data?.json?.() || {};
  event.waitUntil(self.registration.showNotification(data.title || '成长追踪提醒', {
    body: data.body || '你有一项计划需要查看',
    data: { url: data.url || '/' }
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url || '/'));
});
