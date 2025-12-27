// Service Worker for Web Push Notifications only
// Main caching is handled by Workbox-generated sw.js

self.addEventListener('push', function(event) {
  console.log('[SW-Push] Push event received:', event);

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
  console.log('[SW-Push] Notification click received:', event);

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
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

self.addEventListener('notificationclose', function(event) {
  console.log('[SW-Push] Notification closed:', event);
});

self.addEventListener('pushsubscriptionchange', function(event) {
  console.log('[SW-Push] Push subscription change event:', event);
  
  event.waitUntil(
    self.registration.pushManager.subscribe({ userVisibleOnly: true })
      .then(function(subscription) {
        console.log('[SW-Push] New subscription:', subscription);
        return fetch('/api/push-subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            keys: subscription.toJSON().keys
          })
        });
      })
  );
});

self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW-Push] Skip waiting requested');
    self.skipWaiting();
  }
});

self.addEventListener('install', function() {
  console.log('[SW-Push] Installed');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('[SW-Push] Activated');
  event.waitUntil(self.clients.claim());
});
