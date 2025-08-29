import { useEffect, useState } from 'react';

function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent); }
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
}

export default function IosA2HSBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const supported = 'Notification' in window;
    if (isIOS() && supported && !isStandalone()) setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed top-28 inset-x-0 z-40">
      <div className="mx-auto max-w-3xl bg-white border rounded-xl shadow p-4">
        <div className="text-sm">
          Untuk mengaktifkan notifikasi di iPhone, pertama <b>Tambah ke Layar Utama</b>: buka <b>Share</b> → <b>Add to Home Screen</b>,
          lalu buka app dari ikon tersebut.
        </div>
      </div>
    </div>
  );
}
