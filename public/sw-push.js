// Service Worker for Web Push Notifications

self.addEventListener('push', function(event) {
  if (!event.data) {
    console.log('Push event but no data');
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: 'JET Deal Alert',
      body: event.data.text(),
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png'
    };
  }

  const options = {
    body: data.body || data.message || 'New deal available!',
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      dealId: data.dealId,
      venueId: data.venueId,
      venueName: data.venueName,
      url: data.url || '/'
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
    tag: data.tag || 'jet-notification',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'JET', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const data = event.notification.data || {};
  let url = '/';

  if (event.action === 'view' || !event.action) {
    // Build URL with deep link parameters
    if (data.dealId) {
      url = `/?deal=${data.dealId}`;
    } else if (data.venueName) {
      url = `/?venue=${encodeURIComponent(data.venueName)}`;
    } else if (data.url) {
      url = data.url;
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // If a window is already open, focus it
        for (let client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

self.addEventListener('notificationclose', function(event) {
  // Track notification dismissals if needed
  console.log('Notification closed', event.notification.tag);
});

// Handle subscription change (e.g., when browser updates the push subscription)
self.addEventListener('pushsubscriptionchange', function(event) {
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: self.vapidPublicKey
    }).then(function(subscription) {
      // Re-register with server
      return fetch('/api/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });
    })
  );
});
