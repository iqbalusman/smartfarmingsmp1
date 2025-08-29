// src/i18n-singlefile.js
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

/** ==== TRANSLATIONS (tambah/ubah di sini saja) ==== */
const translations = {
  id: {
    brand: 'SmartFarming',
    nav: { home: 'Beranda', monitoring: 'Monitoring', irrigation: 'Irigasi Tetes', hydroponic: 'Hidroponik', contact: 'Kontak' },
    buttons: { enable: 'Aktifkan', later: 'Nanti', go_irrigation_home: 'Masuk ke Beranda Irigasi', enable_live: 'Aktifkan Live', disable_live: 'Matikan Live', download_csv: 'Unduh CSV' },
    notifications: {
      gate_title: 'Aktifkan notifikasi?',
      gate_desc: 'Kami akan memberi peringatan jika nilai sensor melewati batas.',
      title: 'Peringatan Irigasi',
      out_of_range: '{label}: {value}{unit} di luar batas ({min}–{max}{unit}).',
    },
    ios: {
      a2hs: 'Untuk mengaktifkan notifikasi di iPhone, Tambah ke Layar Utama: Share → Add to Home Screen, lalu buka dari ikon.',
    },
    common: {
      real_time_line: 'Data yang ditampilkan adalah <b>Real-Time</b>',
      live_mode: 'Mode Live: Spreadsheet',
      sim_mode: 'Mode Simulasi: Data Dummy',
      connected: 'terhubung',
      disconnected: 'terputus',
    },
    pages: {
      irrigation: { title: 'Monitoring Irigasi Tetes', plant_line: 'Tanaman: <b>Cabai</b> | Metode: <b>Irigasi Tetes Otomatis</b>' },
      contact: {
        title: 'Kontak', desc: 'Ada pertanyaan? Tinggalkan pesan lewat form di bawah.',
        email: 'Email', whatsapp: 'WhatsApp',
        name_label: 'Nama', email_label: 'Email', message_label: 'Pesan',
        name_ph: 'Nama kamu', email_ph: 'email@contoh.com', message_ph: 'Tulis pesanmu di sini...',
        send: 'Kirim', fill_all: 'Lengkapi semua field dulu ya.', sent: 'Pesan terkirim (dummy). Ganti dengan API kamu.',
      },
    },
    sensors: {
      soil_temp: 'Suhu Tanah', air_temp: 'Suhu Udara', air_humidity: 'Kelembaban Udara',
      soil_moisture: 'Kelembapan Tanah', ph: 'pH Tanah', flow: 'Flow',
      unit: { celcius: '°C', percent: '%', flow: ' L/min' },
    },
  },
  en: {
    brand: 'SmartFarming',
    nav: { home: 'Home', monitoring: 'Monitoring', irrigation: 'Drip Irrigation', hydroponic: 'Hydroponics', contact: 'Contact' },
    buttons: { enable: 'Enable', later: 'Later', go_irrigation_home: 'Go to Irrigation Home', enable_live: 'Enable Live', disable_live: 'Disable Live', download_csv: 'Download CSV' },
    notifications: {
      gate_title: 'Enable notifications?',
      gate_desc: 'We will alert you when a sensor value crosses its threshold.',
      title: 'Irrigation Alert',
      out_of_range: '{label}: {value}{unit} is out of range ({min}–{max}{unit}).',
    },
    ios: {
      a2hs: 'To enable notifications on iPhone, Add to Home Screen: Share → Add to Home Screen, then open from the icon.',
    },
    common: {
      real_time_line: 'Data shown is <b>Real-Time</b>',
      live_mode: 'Live Mode: Spreadsheet',
      sim_mode: 'Simulation Mode: Dummy Data',
      connected: 'connected',
      disconnected: 'disconnected',
    },
    pages: {
      irrigation: { title: 'Drip Irrigation Monitoring', plant_line: 'Plant: <b>Chili</b> | Method: <b>Automatic Drip Irrigation</b>' },
      contact: {
        title: 'Contact', desc: 'Questions? Leave a message using the form below.',
        email: 'Email', whatsapp: 'WhatsApp',
        name_label: 'Name', email_label: 'Email', message_label: 'Message',
        name_ph: 'Your name', email_ph: 'you@example.com', message_ph: 'Write your message here...',
        send: 'Send', fill_all: 'Please complete all fields.', sent: 'Message sent (dummy). Replace with your API.',
      },
    },
    sensors: {
      soil_temp: 'Soil Temperature', air_temp: 'Air Temperature', air_humidity: 'Air Humidity',
      soil_moisture: 'Soil Moisture', ph: 'Soil pH', flow: 'Flow',
      unit: { celcius: '°C', percent: '%', flow: ' L/min' },
    },
  },
};

/** ==== CORE ==== */
const Ctx = createContext({ lang: 'id', setLang: () => {}, t: (k) => k });

export function I18nProvider({ children }) {
  const initial = (() => {
    const saved = localStorage.getItem('lang');
    if (saved === 'id' || saved === 'en') return saved;
    return navigator.language?.toLowerCase().startsWith('id') ? 'id' : 'en';
  })();
  const [lang, setLang] = useState(initial);

  useEffect(() => { localStorage.setItem('lang', lang); }, [lang]);

  const t = useMemo(() => {
    const dict = translations[lang] || translations.en;
    const fallback = translations.en;
    const get = (obj, path) => path.split('.').reduce((o, p) => (o && o[p] != null ? o[p] : undefined), obj);
    return (key, vars) => {
      let str = get(dict, key);
      if (str == null) str = get(fallback, key) ?? key;
      if (vars) for (const k of Object.keys(vars)) str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(vars[k]));
      return str;
    };
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);

/** Render teks berdasarkan key. 
 *  - Jika string mengandung tag HTML (mis. <b>), otomatis pakai dangerouslySetInnerHTML.
 */
export function T({ k: key, vars, as: As = 'span', className }) {
  const { t } = useI18n();
  const str = t(key, vars);
  return /<[^>]+>/.test(str)
    ? <As className={className} dangerouslySetInnerHTML={{ __html: str }} />
    : <As className={className}>{str}</As>;
}

/** Switch bahasa kecil siap pakai */
export function LangSwitch({ className = '', style }) {
  const { lang, setLang } = useI18n();
  return (
    <div className={`flex items-center gap-2 ${className}`} style={style}>
      <button onClick={() => setLang('id')} className={`px-2 py-1 rounded text-sm ${lang === 'id' ? 'bg-red-500 text-white' : 'border'}`}>ID</button>
      <button onClick={() => setLang('en')} className={`px-2 py-1 rounded text-sm ${lang === 'en' ? 'bg-red-500 text-white' : 'border'}`}>EN</button>
    </div>
  );
}
