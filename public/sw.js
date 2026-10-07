const CACHE_NAME = 'doctorburger-v2';
const OFFLINE_URL = '/offline';
const STATIC_ICON = '/icons/icon.svg';

const PRECACHE_ASSETS = [OFFLINE_URL, STATIC_ICON];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS)).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function shouldBypassCache(url) {
  const { pathname } = url;

  if (pathname.startsWith('/dashboard')) return true;
  if (pathname.startsWith('/_next')) return true;
  if (pathname.startsWith('/api')) return true;

  return false;
}

function isStaticIconRequest(url) {
  return url.pathname === STATIC_ICON || url.pathname.endsWith('/icon.svg');
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    return Response.error();
  }
}

async function cacheFirstStaticIcon(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const fallback = await caches.match(STATIC_ICON);
    if (fallback) return fallback;
    return Response.error();
  }
}

async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch {
    return Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (shouldBypassCache(url)) {
    event.respondWith(networkOnly(event.request));
    return;
  }

  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }

  if (isStaticIconRequest(url)) {
    event.respondWith(cacheFirstStaticIcon(event.request));
    return;
  }

  event.respondWith(networkOnly(event.request));
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
      icon: STATIC_ICON,
      badge: STATIC_ICON,
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
