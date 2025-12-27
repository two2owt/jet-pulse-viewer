// Service Worker for Web Push Notifications (FCM-based) + Offline Support
// This file is used with vite-plugin-pwa injectManifest strategy
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// Precache and route assets injected by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

const MAP_TILE_CACHE = 'jet-map-tiles-v1';
const MAX_TILE_CACHE_SIZE = 500;

// Runtime caching for Mapbox API
registerRoute(
  /^https:\/\/api\.mapbox\.com\/.*/i,
  new CacheFirst({
    cacheName: 'mapbox-api-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Runtime caching for Mapbox tiles
registerRoute(
  /^https:\/\/tiles\.mapbox\.com\/.*/i,
  new CacheFirst({
    cacheName: 'mapbox-tiles-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Runtime caching for Mapbox style tiles
registerRoute(
  /^https:\/\/api\.mapbox\.com\/styles\/v1\/mapbox\/.*\/tiles\/.*/i,
  new CacheFirst({
    cacheName: 'mapbox-style-tiles-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Runtime caching for Supabase API
registerRoute(
  /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
  new StaleWhileRevalidate({
    cacheName: 'supabase-api-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 5 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Runtime caching for Google Fonts stylesheets
registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new StaleWhileRevalidate({
    cacheName: 'google-fonts-stylesheets',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Runtime caching for Google Fonts webfonts
registerRoute(
  /^https:\/\/fonts\.gstatic\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Runtime caching for external images
registerRoute(
  /^https:\/\/.*\.(png|jpg|jpeg|webp|gif|svg)$/i,
  new CacheFirst({
    cacheName: 'external-images-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Runtime caching for Supabase storage
registerRoute(
  /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
  new CacheFirst({
    cacheName: 'supabase-storage-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Navigation requests - network first with offline fallback
import { NavigationRoute, createHandlerBoundToURL } from 'workbox-routing';

// This assumes index.html is precached by Workbox
const navigationHandler = createHandlerBoundToURL('/index.html');
const navigationRoute = new NavigationRoute(navigationHandler, {
  denylist: [/^\/api/, /^\/functions/],
});
registerRoute(navigationRoute);

// Legacy Mapbox tile patterns (for manual cache if needed)
const MAPBOX_TILE_PATTERNS = [
  /^https:\/\/api\.mapbox\.com\/v4\//,
  /^https:\/\/a\.tiles\.mapbox\.com\//,
  /^https:\/\/b\.tiles\.mapbox\.com\//,
  /^https:\/\/c\.tiles\.mapbox\.com\//,
  /^https:\/\/d\.tiles\.mapbox\.com\//,
  /^https:\/\/api\.mapbox\.com\/styles\//,
  /^https:\/\/api\.mapbox\.com\/fonts\//,
  /^https:\/\/api\.mapbox\.com\/sprites\//,
];

function isMapboxTile(url) {
  return MAPBOX_TILE_PATTERNS.some(pattern => pattern.test(url));
}

async function trimCache(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxSize) {
    const deleteCount = keys.length - maxSize;
    for (let i = 0; i < deleteCount; i++) {
      await cache.delete(keys[i]);
    }
    console.log(`[SW] Trimmed ${deleteCount} items from ${cacheName}`);
  }
}

self.addEventListener('push', function(event) {
  console.log('[SW] Push event received:', event);

  let data = {};
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'JET Notification',
        body: event.data.text()
      };
    }
  }

  const title = data.title || 'JET Deal Alert';
  const options = {
    body: data.body || 'Check out this deal!',
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    tag: data.tag || 'jet-notification',
    data: {
      url: data.url || data.click_action || '/',
      dealId: data.dealId || null,
      venueId: data.venueId || null,
      venueName: data.venueName || null
    },
    actions: [
      {
        action: 'view',
        title: 'View Deal'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    vibrate: [100, 50, 100],
    requireInteraction: true,
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notification click received:', event);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const notificationData = event.notification.data || {};
  let urlToOpen = notificationData.url || '/';

  // Build deep link URL if we have deal data
  if (notificationData.dealId) {
    urlToOpen = `/?deal=${notificationData.dealId}`;
    if (notificationData.venueName) {
      urlToOpen += `&venue=${encodeURIComponent(notificationData.venueName)}`;
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Check if there's already a window open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Open a new window if none found
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

self.addEventListener('notificationclose', function(event) {
  console.log('[SW] Notification closed:', event);
});

// Handle subscription changes
self.addEventListener('pushsubscriptionchange', function(event) {
  console.log('[SW] Push subscription change event:', event);
  
  event.waitUntil(
    self.registration.pushManager.subscribe({ userVisibleOnly: true })
      .then(function(subscription) {
        console.log('[SW] New subscription:', subscription);
        
        // Send the new subscription to the server
        return fetch('/api/push-subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            keys: subscription.toJSON().keys
          })
        });
      })
  );
});

// Service worker activation - workbox handles cache cleanup via cleanupOutdatedCaches()
self.addEventListener('activate', function(event) {
  console.log('[SW] Service worker activated');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('install', function(event) {
  console.log('[SW] Service worker installed');
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Listen for skip waiting message from client
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skip waiting requested by client');
    self.skipWaiting();
  }
});