// src/pages/IrigasiTetes.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  WifiOff, Wifi, Thermometer, Activity, Droplets,
  Download, CloudRain, Leaf, CheckCircle, Sun,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import DataLoggerIrigasi from "@/components/DataLoggerIrigasi";
import SensorChartIrigasi from "@/components/SensorChartIrigasi";
import useSpreadsheet from "@/hooks/useSpreadsheet";
import { requestNotificationPermission } from "@/utils/notifications";
import useThresholdNotifications from "../hooks/useThresholdNotifications";

const SPREADSHEET_ID = "1Y_LrC7kzvRlMPthtowIohP3ubRVGYDLoZEvjR2YPt1g";
const SHEET_GID = 1; // sesuaikan dengan gid sheet

// Zona waktu
const WITA_OFFSET = 8; // UTC+8 (Asia/Makassar)
const WIB_OFFSET  = 7; // UTC+7

const pad2 = (n) => String(n).padStart(2, "0");

function parseNumber(value) {
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.,-]/g, "").replace(",", ".");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return typeof value === "number" ? value : 0;
}

// ----- THRESHOLDS & NOTIFICATION HOOK -----
const THRESHOLDS = {
  suhuTanah:       { min: 18,  max: 35,  label: "Suhu Tanah",       unit: "°C" },
  suhuUdara:       { min: 18,  max: 38,  label: "Suhu Udara",       unit: "°C" },
  kelembabanUdara: { min: 40,  max: 90,  label: "Kelembaban Udara", unit: "%"  },
  kelembapanTanah: { min: 30,  max: 70,  label: "Kelembapan Tanah", unit: "%"  },
  ph:              { min: 5.5, max: 7.2, label: "pH Tanah",         unit: ""   },
  flowRate:        { min: 0.2, max: 8,   label: "Flow",             unit: " L/min" },
};

// ===== Helpers tanggal → WITA =====
function parseToComponents(val) {
  if (!val) return null;

  if (typeof val === "string") {
    // Google Date(y,m,d,h,mi,s) (m 0-based)
    const m0 = val.match(/Date\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+))?\s*\)/i);
    if (m0) {
      const [, y, mo, d, hh = "0", mi = "0", ss = "0"] = m0;
      return { y:+y, mo:+mo, d:+d, hh:+hh, mi:+mi, ss:+ss, hasDate:true };
    }
    // dd/mm/yyyy [hh:mm[:ss] | hh.mm.ss]
    const m1 = val.match(/^\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[ ,T]+(\d{1,2})[:.](\d{1,2})(?:[:.](\d{1,2}))?)?\s*$/);
    if (m1) {
      const [, dd, mm, yyyy, hh = "0", mi = "0", ss = "0"] = m1;
      return { y:+yyyy, mo:+mm - 1, d:+dd, hh:+hh, mi:+mi, ss:+ss, hasDate:true };
    }
  }

  // Fallback native Date
  const nd = new Date(val);
  if (!isNaN(nd.getTime())) {
    return { y: nd.getFullYear(), mo: nd.getMonth(), d: nd.getDate(), hh: nd.getHours(), mi: nd.getMinutes(), ss: nd.getSeconds(), hasDate:true };
  }
  return null;
}

function toWitaFromZone(c, srcOffsetHours) {
  if (!c || !c.hasDate) return null;
  const epochUtc = Date.UTC(c.y, c.mo, c.d, (c.hh ?? 0) - srcOffsetHours, c.mi ?? 0, c.ss ?? 0);
  const witaMs = epochUtc + WITA_OFFSET * 3600 * 1000;
  const wita = new Date(witaMs);
  return {
    y: wita.getUTCFullYear(),
    mo: wita.getUTCMonth(),
    d: wita.getUTCDate(),
    hh: wita.getUTCHours(),
    mi: wita.getUTCMinutes(),
    ss: wita.getUTCSeconds(),
    epochUtc,
  };
}

function formatWitaISO(y, mo, d, hh, mi, ss) {
  return `${y}-${pad2(mo + 1)}-${pad2(d)}T${pad2(hh)}:${pad2(mi)}:${pad2(ss)}`;
}

/** Ambil timestamp WITA dari baris sheet.
 *  - Pakai "Timestamp (UTC)" jika ada → konversi ke WITA
 *  - else "Waktu (WIB)" / "Waktu" → konversi WIB → WITA (+1 jam)
 *  - else fallback "Tanggal" (anggap sudah lokal → treat WITA)
 *  return: { iso, epochUtc } atau null
 */
function parseTimestampWITA(row) {
  const rawUTC = row["Timestamp (UTC)"] ?? row["Timestamp"];
  const rawWIB = row["Waktu (WIB)"] ?? row["Waktu"];
  const rawTanggal = row["Tanggal"];

  if (rawUTC) {
    const c = parseToComponents(rawUTC);
    const w = toWitaFromZone(c, 0);
    if (w) return { iso: formatWitaISO(w.y, w.mo, w.d, w.hh, w.mi, w.ss), epochUtc: w.epochUtc };
  }
  if (rawWIB) {
    const c = parseToComponents(rawWIB);
    const w = toWitaFromZone(c, WIB_OFFSET); // konversi dari WIB ke WITA
    if (w) return { iso: formatWitaISO(w.y, w.mo, w.d, w.hh, w.mi, w.ss), epochUtc: w.epochUtc };
  }
  if (rawTanggal) {
    const c = parseToComponents(rawTanggal);
    if (c) {
      const epochUtc = Date.UTC(c.y, c.mo, c.d, (c.hh ?? 0) - WITA_OFFSET, c.mi ?? 0, c.ss ?? 0);
      return { iso: formatWitaISO(c.y, c.mo, c.d, c.hh ?? 0, c.mi ?? 0, c.ss ?? 0), epochUtc };
    }
  }
  return null;
}

// ----- PAGE -----
const IrigasiTetes = () => {
  const navigate = useNavigate();

  const [isLive, setIsLive] = useState(true);     // default ON biar langsung jalan
  const [dummyData, setDummyData] = useState([]);
  const [reloadFlag, setReloadFlag] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const { data: sheetData, loading } = useSpreadsheet(
    SPREADSHEET_ID,
    SHEET_GID,
    reloadFlag
  );

  // Auto-refetch cepat saat live (2s), pause saat tab hidden
  useEffect(() => {
    let interval;
    function start() {
      interval = setInterval(() => setReloadFlag((f) => f + 1), 2000); // 2 detik
    }
    function stop() {
      if (interval) clearInterval(interval);
      interval = null;
    }
    if (isLive) start();

    const onVis = () => {
      if (document.hidden) stop();
      else if (isLive && !interval) start();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => { stop(); document.removeEventListener("visibilitychange", onVis); };
  }, [isLive]);

  // Matikan loading setelah fetch pertama di live
  useEffect(() => {
    if (isLive && !loading) setIsInitialLoad(false);
    if (!isLive) setIsInitialLoad(false);
  }, [isLive, loading]);

  // Map + sort terbaru di ATAS
  const mappedData = useMemo(() => {
    if (isLive) {
      const arr = sheetData.map((row) => {
        const ts = parseTimestampWITA(row);
        if (!ts) return null;
        return {
          timestamp:      ts.iso,           // string WITA (tanpa Z)
          tsWitaEpoch:    ts.epochUtc,      // buat sort stabil
          temperature:    parseNumber(row["Suhu Tanah"]),
          temperatureAir: parseNumber(row["Suhu Udara"]),
          humidity:       parseNumber(row["Kelembaban Udara"]),
          soilMoisture:   parseNumber(row["Kelembapan Tanah"]),
          ph:             parseNumber(row["pH"]),
          flowRate:       parseNumber(row["Flow Rate"]),
          status:         row["ESP_ID"] ? "connected" : "connected",
        };
      }).filter(Boolean);

      arr.sort((a, b) => b.tsWitaEpoch - a.tsWitaEpoch); // terbaru di atas
      return arr;
    }
    return dummyData;
  }, [isLive, sheetData, dummyData]);

  // Notifikasi
  const notifData = useMemo(
    () => mappedData.map((d) => ({
      suhuTanah: d.temperature,
      suhuUdara: d.temperatureAir,
      kelembabanUdara: d.humidity,
      kelembapanTanah: d.soilMoisture,
      ph: d.ph,
      flowRate: d.flowRate,
      timestamp: d.timestamp, // WITA
    })),
    [mappedData]
  );

  useThresholdNotifications(notifData, isLive);

  // Dummy mode (kalau isLive=false)
  useEffect(() => {
    if (isLive) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const wita = new Date(now + WITA_OFFSET * 3600 * 1000);
      const iso = `${wita.getUTCFullYear()}-${pad2(wita.getUTCMonth()+1)}-${pad2(wita.getUTCDate())}T${pad2(wita.getUTCHours())}:${pad2(wita.getUTCMinutes())}:${pad2(wita.getUTCSeconds())}`;
      setDummyData((prev) => [{
        timestamp: iso,
        tsWitaEpoch: now,
        temperature: 25 + Math.random() * 5,
        temperatureAir: 28 + Math.random() * 4,
        humidity: 60 + Math.random() * 10,
        soilMoisture: 35 + Math.random() * 15,
        ph: 6 + Math.random(),
        flowRate: Math.random() * 10,
        status: "dummy",
      }, ...prev]);
    }, 3000);
    return () => clearInterval(interval);
  }, [isLive]);

  // Unduh CSV
  const handleDownloadCSV = () => {
    const csv =
      "Timestamp (WITA),Suhu Tanah,Suhu Udara,Kelembaban Udara,Kelembapan Tanah,pH,Flow Rate\n" +
      mappedData.map((d) =>
        [
          d.timestamp,
          d.temperature?.toFixed(1),
          d.temperatureAir?.toFixed(1),
          d.humidity?.toFixed(1),
          d.soilMoisture?.toFixed(1),
          d.ph?.toFixed(2),
          d.flowRate?.toFixed(2),
        ].join(",")
      ).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "data-irigasi-wita.csv";
    link.click();
  };

  const SensorStatusBar = () => {
    const sensors = [
      { name: "Suhu Tanah",        icon: Thermometer, border: "border-red-300",    text: "text-red-500" },
      { name: "Suhu Udara",        icon: Sun,         border: "border-yellow-300", text: "text-yellow-500" },
      { name: "Kelembaban Udara",  icon: CloudRain,   border: "border-blue-300",   text: "text-blue-500" },
      { name: "Kelembapan Tanah",  icon: Leaf,        border: "border-green-300",  text: "text-green-500" },
      { name: "pH Tanah",          icon: Droplets,    border: "border-purple-300", text: "text-purple-500" },
      { name: "Flow",              icon: Activity,    border: "border-orange-300", text: "text-orange-500" },
    ];
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-8">
        {sensors.map((s, idx) => (
          <motion.div
            key={s.name}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.1 }}
            className={`flex flex-col items-center justify-center border-2 ${s.border} rounded-xl p-4 bg-white shadow`}
          >
            <s.icon className={`w-8 h-8 ${s.text} mb-1`} />
            <span className="text-sm text-gray-700 font-medium">{s.name}</span>
            <CheckCircle className="w-4 h-4 text-green-500 mt-1" />
          </motion.div>
        ))}
      </div>
    );
  };

  const needNotifPrompt =
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission !== "granted";

  return (
    <section className="pt-20 pb-10 bg-red-100">
      {needNotifPrompt && (
        <div className="max-w-7xl mx-auto px-4 mb-4">
          <div className="bg-white border rounded-xl p-4 flex items-center justify-between">
            <span className="text-sm">Aktifkan notifikasi agar dapat peringatan saat nilai melewati batas.</span>
            <button
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              onClick={async () => { await requestNotificationPermission(); }}
            >
              Aktifkan
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mt-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-extrabold text-red-700 flex justify-center items-center gap-3">
            <span className="text-5xl">🌶️</span> Monitoring Irigasi Tetes
          </h1>
          <p className="text-gray-600">Data yang ditampilkan adalah <strong>Real-Time</strong></p>
          <p className="text-red-700 mt-1">Tanaman: <strong>Cabai</strong> | Metode: <strong>Irigasi Tetes Otomatis</strong></p>
          <div className="flex justify-center mt-4 gap-4">
            <button
              onClick={async () => { await requestNotificationPermission(); navigate("/berandairigasi"); }}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Masuk ke Beranda Irigasi
            </button>
          </div>
        </motion.div>

        <motion.div
          className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 bg-white rounded-xl shadow p-4 mt-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="flex items-center gap-2 text-red-600">
            {isLive ? <Wifi className="h-5 w-5 text-green-500" /> : <WifiOff className="h-5 w-5 text-red-500" />}
            <span className="text-sm font-semibold">
              {isLive ? "Mode Live: Spreadsheet (WITA)" : "Mode Simulasi: Data Dummy (WITA)"}
            </span>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setIsLive((v) => !v)} className="px-4 py-2 bg-white border rounded-lg text-green-700 hover:bg-green-50">
              {isLive ? "Matikan Live" : "Aktifkan Live"}
            </button>
            <button onClick={handleDownloadCSV} className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              <Download className="h-4 w-4 mr-2" /> Unduh CSV
            </button>
          </div>
        </motion.div>

        <SensorStatusBar />

        {/* Tabel sudah terbaru di atas; kalau grafik ingin urutan naik, kirim reverse */}
        <SensorChartIrigasi data={[...mappedData].reverse()} isLive={isLive} />

        <div className="mt-10">
          <DataLoggerIrigasi
            data={mappedData}
            isLive={isLive}
            loading={isLive && isInitialLoad}
          />
        </div>
      </div>
    </section>
  );
};

export default IrigasiTetes;
