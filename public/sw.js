// public/sw.js - WorldVest Cross-Device Live Support Push Service Worker

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Real-time background push notification listener
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || '🔔 WorldVest Live Support';
  const options = {
    body: data.body || 'New live support message received.',
    icon: data.icon || '/logohead_light.png',
    badge: data.badge || '/logohead_light.png',
    tag: data.tag || 'live-support-alert',
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    data: data.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// When Admin taps/clicks the notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  const sessionId = notifData.sessionId || '';
  const targetUrl = notifData.url || `/?tab=live_support&session=${sessionId}`;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 1. If an existing admin window/tab is open, focus it and tell it to open the session
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({
            type: 'OPEN_SUPPORT_SESSION',
            sessionId: sessionId,
            clientName: notifData.clientName,
            messageText: notifData.messageText
          });
          return client.focus();
        }
      }
      // 2. Otherwise open a new window pointing directly to the live support conversation
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
