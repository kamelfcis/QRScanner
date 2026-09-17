const CACHE_NAME = 'doctorburger-v1';
const STATIC_ASSETS = [
  '/',
  '/menu',
  '/offline',
  '/icons/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          if (event.request.destination === 'document') {
            return caches.match('/offline');
          }
        });
    })
  );
});

self.addEventListener('push', (event) => {
  let payload = {
    title: 'طلب جديد / New order',
    body: '',
    tag: 'new-order',
    url: '/dashboard/orders',
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      if (parsed && typeof parsed === 'object') {
        payload = { ...payload, ...parsed };
      }
    }
  } catch {
    // Keep default copy if the payload is not JSON.
  }

  const title =
    typeof payload.title === 'string' && payload.title ? payload.title : 'طلب جديد / New order';
  const body = typeof payload.body === 'string' ? payload.body : '';
  const url =
    typeof payload.url === 'string' && payload.url.startsWith('/')
      ? payload.url
      : '/dashboard/orders';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: typeof payload.tag === 'string' && payload.tag ? payload.tag : 'new-order',
      icon: '/icons/icon.svg',
      badge: '/icons/icon.svg',
      data: { url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawUrl = event.notification.data && event.notification.data.url;
  const path = typeof rawUrl === 'string' && rawUrl.startsWith('/') ? rawUrl : '/dashboard/orders';
  const targetUrl = new URL(path, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client && client.url.startsWith(self.location.origin)) {
          return client.focus().then((focused) => {
            if (focused && 'navigate' in focused) {
              return focused.navigate(targetUrl);
            }
          });
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
