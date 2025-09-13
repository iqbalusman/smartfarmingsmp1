// src/pages/IrigasiTetes.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { WifiOff, Wifi, Download, Thermometer, Activity, Droplets, CloudRain, Leaf, CheckCircle, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";

import DataLoggerIrigasi from "@/components/DataLoggerIrigasi";
import SensorChartIrigasi from "@/components/SensorChartIrigasi";
import useSpreadsheet from "@/hooks/useSpreadsheet";
import { requestNotificationPermission } from "@/utils/notifications";

const SPREADSHEET_ID = "1Y_LrC7kzvRlMPthtowIohP3ubRVGYDLoZEvjR2YPt1g";
const SHEET_GID = 1;

const WITA_OFFSET = 8; // jam
const pad2 = (n) => String(n).padStart(2, "0");
const asArray = (x) => (Array.isArray(x) ? x : []);
const num = (v) => (typeof v === "number" ? v : (n => Number.isFinite(n) ? n : null)(parseFloat(String(v ?? "").replace(",", "."))));

function toWitaISO(epochUtc) {
  const d = new Date(epochUtc + WITA_OFFSET * 3600 * 1000);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth()+1)}-${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
}

export default function IrigasiTetes() {
  const navigate = useNavigate();

  // Ambil sheet (polling 2s)
  const { data: sheet, loading } = useSpreadsheet(SPREADSHEET_ID, SHEET_GID, { live: true, intervalMs: 2000 });
  const [isLive, setIsLive] = useState(true);

  // Normalisasi satu kali → untuk tabel & grafik
  const normalized = useMemo(() => {
    const src = asArray(sheet);
    const rows = src.map((r) => {
      // Ambil epoch UTC dari timestamp (ISO dari fetcher) atau parse lain
      let ms = null;
      if (typeof r?.timestamp === "number") ms = r.timestamp < 1e12 ? r.timestamp * 1000 : r.timestamp;
      else if (r?.timestamp instanceof Date) ms = r.timestamp.getTime();
      else if (typeof r?.timestamp === "string") {
        const mDate = r.timestamp.match(/Date\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+))?\s*\)/i);
        if (mDate) {
          const [, y, M, d, hh="0", mi="0", ss="0"] = mDate;
          ms = Date.UTC(+y, +M, +d, +hh, +mi, +ss) - 7 * 60 * 60 * 1000; // sumber WIB → UTC
        } else {
          const p = Date.parse(r.timestamp);
          if (!isNaN(p)) ms = p;
        }
      }
      if (!Number.isFinite(ms)) return null;

      const row = {
        tsWitaEpoch: ms,                       // UTC ms (untuk grafik/sort)
        timestamp: toWitaISO(ms),              // tampil WITA
        temperature: num(r.temperature ?? r.soilTemp ?? r["Suhu Tanah"] ?? r["Suhu Tanah (°C)"]),
        temperatureAir: num(r.temperatureAir ?? r.airTemp ?? r["Suhu Udara"] ?? r["Suhu Udara (°C)"]),
        humidity: num(r.humidity ?? r["Kelembaban Udara"] ?? r["Kelembaban Udara (%)"]),
        soilMoisture: num(r.soilMoisture ?? r["Kelembapan Tanah"] ?? r["Kelembaban Tanah (%)"]),
        ph: num(r.ph ?? r["pH"] ?? r["pH Tanah"]),
        flowRate: num(r.flowRate ?? r["Flow Rate"] ?? r["Flow Rate (L/min)"]),
      };
      return row;
    }).filter(Boolean);

    return rows;
  }, [sheet]);

  // TABEL = terbaru di atas
  const rowsDesc = useMemo(() => {
    const a = normalized.slice();
    a.sort((x, y) => y.tsWitaEpoch - x.tsWitaEpoch);
    return a;
  }, [normalized]);

  // GRAFIK = urut naik + kirim ts (ms)
  const rowsForChart = useMemo(() => {
    const a = normalized.slice();
    a.sort((x, y) => x.tsWitaEpoch - y.tsWitaEpoch);
    return a.map((d) => ({
      ts: d.tsWitaEpoch,
      temperature: d.temperature,
      temperatureAir: d.temperatureAir,
      humidity: d.humidity,
      soilMoisture: d.soilMoisture,
      ph: d.ph,
      flowRate: d.flowRate,
    }));
  }, [normalized]);

  // unduh CSV (dari rowsDesc, sumber sama dgn tabel)
  const handleDownloadCSV = () => {
    const rows = rowsDesc;
    const csv =
      "Timestamp (WITA),Suhu Tanah,Suhu Udara,Kelembaban Udara,Kelembapan Tanah,pH,Flow Rate\n" +
      rows.map((d) =>
        [
          d.timestamp,
          d.temperature ?? "",
          d.temperatureAir ?? "",
          d.humidity ?? "",
          d.soilMoisture ?? "",
          d.ph ?? "",
          d.flowRate ?? "",
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
      { name: "Suhu Tanah", icon: Thermometer, border: "border-red-300", text: "text-red-500" },
      { name: "Suhu Udara", icon: Sun, border: "border-yellow-300", text: "text-yellow-500" },
      { name: "Kelembaban Udara", icon: CloudRain, border: "border-blue-300", text: "text-blue-500" },
      { name: "Kelembapan Tanah", icon: Leaf, border: "border-green-300", text: "text-green-500" },
      { name: "pH Tanah", icon: Droplets, border: "border-purple-300", text: "text-purple-500" },
      { name: "Flow", icon: Activity, border: "border-orange-300", text: "text-orange-500" },
    ];
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-8">
        {sensors.map((s, idx) => (
          <motion.div key={s.name} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: idx * 0.1 }}
            className={`flex flex-col items-center justify-center border-2 ${s.border} rounded-xl p-4 bg-white shadow`}>
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
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              onClick={async () => { await requestNotificationPermission(); }}>
              Aktifkan
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div className="text-center mt-6" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 className="text-4xl font-extrabold text-red-700 flex justify-center items-center gap-3">
            <span className="text-5xl">🌶️</span> Monitoring Irigasi Tetes
          </h1>
          <p className="text-gray-600">Data yang ditampilkan adalah <strong>Real-Time</strong></p>
          <p className="text-red-700 mt-1">Tanaman: <strong>Cabai</strong> | Metode: <strong>Irigasi Tetes Otomatis</strong></p>
          <div className="flex justify-center mt-4 gap-4">
            <button onClick={() => navigate("/berandairigasi")} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">Masuk ke Beranda Irigasi</button>
          </div>
        </motion.div>

        <motion.div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 bg-white rounded-xl shadow p-4 mt-8"
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
          <div className="flex items-center gap-2 text-red-600">
            {isLive ? <Wifi className="h-5 w-5 text-green-500" /> : <WifiOff className="h-5 w-5 text-red-500" />}
            <span className="text-sm font-semibold">{isLive ? "Mode Live: Spreadsheet (WITA)" : "Mode Simulasi: Data Dummy (WITA)"}</span>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setIsLive(v => !v)} className="px-4 py-2 bg-white border rounded-lg text-green-700 hover:bg-green-50">
              {isLive ? "Matikan Live" : "Aktifkan Live"}
            </button>
            <button onClick={handleDownloadCSV} className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              <Download className="h-4 w-4 mr-2" /> Unduh CSV
            </button>
          </div>
        </motion.div>

        {/* Grafik: kirim data yang sudah berisi ts (ms) */}
        <SensorChartIrigasi data={rowsForChart} />

        <div className="mt-10">
          <DataLoggerIrigasi data={rowsDesc} isLive={isLive} loading={loading} />
        </div>
      </div>
    </section>
  );
}
