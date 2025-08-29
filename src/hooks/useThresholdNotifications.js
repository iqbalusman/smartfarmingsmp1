import { useEffect } from 'react';
import { showLocalNotification } from '@/utils/notifications';

export const THRESHOLDS = {
  suhuTanah:       { min: 18,  max: 35,  label: 'Suhu Tanah',       unit: '°C' },
  suhuUdara:       { min: 18,  max: 38,  label: 'Suhu Udara',       unit: '°C' },
  kelembabanUdara: { min: 40,  max: 90,  label: 'Kelembaban Udara', unit: '%'  },
  kelembapanTanah: { min: 69,  max: 78,  label: 'Kelembapan Tanah', unit: '%'  },
  ph:              { min: 5.5, max: 7.2, label: 'pH Tanah',         unit: ''   },
  flowRate:        { min: 0.2, max: 8,   label: 'Flow',             unit: ' L/min' },
};

const THROTTLE_MS = 60_000; // 1 menit per-metrik

export default function useThresholdNotifications(data, enabled = true) {
  useEffect(() => {
    if (!enabled || !Array.isArray(data) || data.length === 0) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const latest = data[data.length - 1];
    const now = Date.now();

    Object.entries(THRESHOLDS).forEach(([key, rule]) => {
      const val = Number(latest?.[key]);
      if (!Number.isFinite(val)) return;

      const outOfRange = val < rule.min || val > rule.max;
      if (!outOfRange) return;

      const tag = `thr-${key}`;
      const last = Number(localStorage.getItem(tag) || 0);
      if (now - last < THROTTLE_MS) return;

      showLocalNotification({
        title: 'Peringatan Irigasi',
        body: `${rule.label}: ${val}${rule.unit} di luar batas (${rule.min}–${rule.max}${rule.unit}).`,
        tag,
      });
      localStorage.setItem(tag, String(now));
    });
  }, [data, enabled]);
}
