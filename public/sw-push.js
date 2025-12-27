// Service Worker for Web Push Notifications (FCM-based) + Offline Support

const MAP_TILE_CACHE = 'jet-map-tiles-v1';
const STATIC_CACHE = 'jet-static-v1';
const OFFLINE_CACHE = 'jet-offline-v1';
const MAX_TILE_CACHE_SIZE = 500;

const OFFLINE_PAGE = '/offline.html';
const OFFLINE_ASSETS = [
  '/offline.html',
  '/pwa-192x192.png',
  '/jet-logo-96.png'
];

// Mapbox tile URL patterns to cache
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

function isNavigationRequest(request) {
  return request.mode === 'navigate' || 
    (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
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

// Fetch handler
self.addEventListener('fetch', function(event) {
  const url = event.request.url;
  
  if (event.request.method !== 'GET') return;
  
  // Handle navigation requests with offline fallback
  if (isNavigationRequest(event.request)) {
    event.respondWith(
      fetch(event.request)
        .catch(async () => {
          console.log('[SW] Navigation failed, serving offline page');
          const cache = await caches.open(OFFLINE_CACHE);
          const offlineResponse = await cache.match(OFFLINE_PAGE);
          return offlineResponse || new Response('Offline', { status: 503 });
        })
    );
    return;
  }
  
  // Handle Mapbox tiles with cache-first strategy
  if (isMapboxTile(url)) {
    event.respondWith(
      caches.open(MAP_TILE_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        
        if (cachedResponse) {
          if (navigator.onLine) {
            fetch(event.request).then(response => {
              if (response.ok) {
                cache.put(event.request, response.clone());
              }
            }).catch(() => {});
          }
          return cachedResponse;
        }
        
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse.ok) {
            cache.put(event.request, networkResponse.clone());
            trimCache(MAP_TILE_CACHE, MAX_TILE_CACHE_SIZE);
          }
          return networkResponse;
        } catch (error) {
          console.log('[SW] Tile fetch failed:', url);
          return new Response('', { status: 408, statusText: 'Tile unavailable offline' });
        }
      })
    );
    return;
  }
});

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

// Log service worker activation - delete old caches but preserve map tiles
self.addEventListener('activate', function(event) {
  console.log('[SW] Service worker activated');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          // Keep map tile cache, delete others
          if (cacheName !== MAP_TILE_CACHE && cacheName !== STATIC_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('install', function(event) {
  console.log('[SW] Service worker installed');
  // Precache offline assets
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then(cache => {
      console.log('[SW] Caching offline assets');
      return cache.addAll(OFFLINE_ASSETS);
    })
  );
});

// Listen for skip waiting message from client
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skip waiting requested by client');
    self.skipWaiting();
  }
});
