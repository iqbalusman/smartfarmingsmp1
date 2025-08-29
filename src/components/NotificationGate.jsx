import { useEffect, useState } from 'react';
import { requestNotificationPermission } from '@/utils/notifications';

export default function NotificationGate() {
  const supported = typeof window !== 'undefined' && 'Notification' in window;
  const [perm, setPerm] = useState(supported ? Notification.permission : 'unsupported');
  const [dismissed, setDismissed] = useState(localStorage.getItem('notifDismissed') === '1');

  useEffect(() => {
    if (!supported) return;
    const h = () => setPerm(Notification.permission);
    document.addEventListener('visibilitychange', h);
    return () => document.removeEventListener('visibilitychange', h);
  }, [supported]);

  if (!supported || dismissed || perm === 'granted' || perm === 'denied') return null;

  return (
    <div className="fixed top-16 inset-x-0 z-40">
      <div className="mx-auto max-w-3xl bg-white border rounded-xl shadow p-4 flex items-center justify-between">
        <div>
          <div className="font-medium">Aktifkan notifikasi?</div>
          <div className="text-sm opacity-70">Kami akan memberi peringatan jika nilai sensor melewati batas.</div>
        </div>
        <div className="flex gap-2">
          <button
            className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
            onClick={async () => {
              const r = await requestNotificationPermission();
              setPerm(r);
              if (r !== 'granted') {
                localStorage.setItem('notifDismissed', '1');
                setDismissed(true);
              }
            }}
          >
            Aktifkan
          </button>
          <button
            className="px-3 py-2 rounded-lg border"
            onClick={() => { localStorage.setItem('notifDismissed', '1'); setDismissed(true); }}
          >
            Nanti
          </button>
        </div>
      </div>
    </div>
  );
}
