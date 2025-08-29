// public/sw.js
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

// Klik notifikasi → buka halaman irigasi
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/irigasitetes'));
});

// (Opsional) dukung push dari server nanti
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data?.json?.() || {}; } catch {}
  const title = data.title || 'Pemberitahuan';
  const body  = data.body  || '';
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: data.tag || 'push',
      icon: '/notif.png',
      badge: '/notif.png',
    })
  );
});
