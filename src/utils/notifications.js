// src/utils/notifications.js
export async function registerSW() {
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('[SW] registered:', reg.scope);
      return reg;
    } catch (e) {
      console.error('[SW] register failed', e);
    }
  } else {
    console.warn('[SW] not supported');
  }
  return null;
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    alert('Browser tidak mendukung Notification API.');
    return 'unsupported';
  }
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }
  // HARUS dipanggil dari event klik user (mobile rules)
  const res = await Notification.requestPermission();
  if (res === 'granted') localStorage.setItem('notifEnabled', '1');
  return res;
}

export async function showLocalNotification({ title, body, tag = 'alert', icon = '/icon-192.png' }) {
  if (!('Notification' in window)) {
    // fallback minimal agar user tetap lihat alert di device yang tidak support
    alert(`${title}\n${body}`);
    navigator.vibrate?.([120, 60, 120]);
    return false;
  }
  if (Notification.permission !== 'granted') {
    console.warn('Notification permission is not granted');
    return false;
  }
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg?.showNotification) {
      await reg.showNotification(title, { body, tag, icon, badge: icon, renotify: true });
    } else {
      new Notification(title, { body, tag, icon });
    }
    navigator.vibrate?.([100, 50, 100]);
    return true;
  } catch (e) {
    console.error('showLocalNotification failed', e);
    return false;
  }
}
