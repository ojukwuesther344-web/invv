// public/sw.js - WorldVest Cross-Device Background Push & Visitor Alert Service Worker

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Real-time background push notification listener (Desktop & Mobile Phone)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || '🔔 WORLDVEST CAPITAL';
  const options = {
    body: data.body || 'New website visitor detected.',
    icon: data.icon || '/logohead_light.png',
    badge: data.badge || '/logohead_light.png',
    tag: data.tag || `wv-notif-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    data: data.data || {}
  };

  // 1. Show native OS notification (displays even when browser / admin dashboard is closed)
  const showPromise = self.registration.showNotification(title, options);

  // 2. Notify any open client windows/tabs so foreground visitor alert chime can play
  const notifyClientsPromise = self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    clientList.forEach((client) => {
      client.postMessage({
        type: 'PUSH_NOTIFICATION_RECEIVED',
        title: title,
        body: options.body,
        data: options.data,
        timestamp: Date.now()
      });
    });
  });

  event.waitUntil(Promise.all([showPromise, notifyClientsPromise]));
});

// When Admin taps/clicks the notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  const targetUrl = notifData.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 1. If an existing admin window/tab is open, focus it and tell it to handle the alert
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            data: notifData
          });
          return client.focus();
        }
      }
      // 2. Otherwise open a new window pointing to the target URL
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
