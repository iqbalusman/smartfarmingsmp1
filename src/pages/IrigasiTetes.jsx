// src/pages/IrigasiTetes.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  WifiOff, Wifi, Thermometer, Activity, Droplets,
  Download, CloudRain, Leaf, CheckCircle, Sun,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import DataLoggerIrigasi from "@/components/DataLoggerIrigasi";
import SensorChartIrigasi from "@/components/SensorChartIrigasi";
import useSpreadsheet from "@/hooks/useSpreadsheet";
import { requestNotificationPermission } from "@/utils/notifications";
import useThresholdNotifications from "../hooks/useThresholdNotifications";

const SPREADSHEET_ID = "1Y_LrC7kzvRlMPthtowIohP3ubRVGYDLoZEvjR2YPt1g";
const SHEET_GID = 1; // Sheet pertama

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

// ----- PAGE -----
const IrigasiTetes = () => {
  const navigate = useNavigate();

  const [isLive, setIsLive] = useState(false);
  const [dummyData, setDummyData] = useState([]);
  const [reloadFlag, setReloadFlag] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true); // loading hanya saat awal live

  const { data: sheetData, loading } = useSpreadsheet(
    SPREADSHEET_ID,
    SHEET_GID,
    reloadFlag
  );

  // Auto-refetch saat mode live
  useEffect(() => {
    let interval;
    if (isLive) {
      setIsInitialLoad(true);
      interval = setInterval(() => setReloadFlag((f) => f + 1), 5000);
    }
    return () => clearInterval(interval);
  }, [isLive]);

  // Matikan loading setelah fetch pertama di live
  useEffect(() => {
    if (isLive && !loading) setIsInitialLoad(false);
    if (!isLive) setIsInitialLoad(false);
  }, [isLive, loading]);

  // ========= FIX: parse timestamp sesuai sheet (bulan 0-based, waktu WIB, tanpa UTC shift) =========
  function parseTimestamp(row) {
    const rawDate = row["Timestamp (UTC)"] ?? row["Timestamp"] ?? row["Tanggal"] ?? row["Waktu (WIB)"] ?? row["Waktu"];

    const parseDateLike = (val) => {
      if (!val) return null;

      // 1) Pola "Date(y,m,d,h,mi,s)" dari Google (m = 0-based)
      if (typeof val === "string") {
        const m = val.match(/Date\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+))?\s*\)/i);
        if (m) {
          const [, y, mo, d, hh = "0", mi = "0", ss = "0"] = m;
          // gunakan konstruktor lokal (bukan UTC) dan JANGAN -1 bulan: input sudah 0-based
          return new Date(+y, +mo, +d, +hh, +mi, +ss, 0);
        }
      }

      // 2) Bentuk teks "dd/mm/yyyy hh:mm:ss" (id-ID)
      if (typeof val === "string") {
        const m2 = val.match(
          /^\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[ ,T]+(\d{1,2})[:.](\d{1,2})(?:[:.](\d{1,2}))?)?\s*$/
        );
        if (m2) {
          const [, dd, mm, yyyy, hh = "0", mi = "0", ss = "0"] = m2;
          return new Date(+yyyy, +mm - 1, +dd, +hh, +mi, +ss, 0);
        }
        // 3) Coba parse native jika memungkinkan
        const nd = new Date(val);
        if (!isNaN(nd.getTime())) return nd;
      }

      if (val instanceof Date && !isNaN(val.getTime())) return val;

      return null;
    };

    // Ambil dua kolom jika ada: tanggal (full) & waktu-only (biasanya 1899-12-30)
    const rawUTC = row["Timestamp (UTC)"] ?? row["Timestamp"];
    const rawWIB = row["Waktu (WIB)"] ?? row["Waktu"];

    const dUTC = parseDateLike(rawUTC);
    const dWIB = parseDateLike(rawWIB);

    const isTimeOnly = (d) => d && d.getFullYear() <= 1900;

    let out = null;

    if (dUTC && dWIB) {
      if (isTimeOnly(dUTC) && !isTimeOnly(dWIB)) {
        // UTC kolom ternyata time-only → pakai tanggal dari WIB, jam dari UTC
        out = new Date(dWIB.getTime());
        out.setHours(dUTC.getHours(), dUTC.getMinutes(), dUTC.getSeconds(), 0);
      } else if (!isTimeOnly(dUTC) && isTimeOnly(dWIB)) {
        // WIB kolom time-only → pakai tanggal dari UTC, jam dari WIB
        out = new Date(dUTC.getTime());
        out.setHours(dWIB.getHours(), dWIB.getMinutes(), dWIB.getSeconds(), 0);
      } else {
        // dua-duanya full: pilih WIB jika ada, biar sesuai tampilan sheet
        out = dWIB || dUTC;
      }
    } else if (dUTC || dWIB) {
      const d = dWIB || dUTC;
      if (isTimeOnly(d)) return null; // time-only tanpa tanggal → tidak valid
      out = d;
    } else {
      // fallback: coba satu field gabungan
      out = parseDateLike(rawDate);
    }

    if (!out) return null;

    // Keluarkan ISO lokal TANPA Z (biar tidak bergeser time zone saat dibaca komponen lain)
    const pad = (n) => String(n).padStart(2, "0");
    const localIsoNoZ = `${out.getFullYear()}-${pad(out.getMonth() + 1)}-${pad(out.getDate())}T${pad(out.getHours())}:${pad(out.getMinutes())}:${pad(out.getSeconds())}`;

    return localIsoNoZ;
  }
  // ==============================================================================================

  // Data yang dipakai chart/logger
  const mappedData = useMemo(() => {
    if (isLive) {
      return sheetData
        .map((row) => {
          const ts = parseTimestamp(row);
          if (!ts) return null; // skip baris tanpa timestamp dari sheet
          return {
            timestamp:      ts,
            temperature:    parseNumber(row["Suhu Tanah"]),
            temperatureAir: parseNumber(row["Suhu Udara"]),
            humidity:       parseNumber(row["Kelembaban Udara"]),
            soilMoisture:   parseNumber(row["Kelembapan Tanah"]),
            ph:             parseNumber(row["pH"]),
            flowRate:       parseNumber(row["Flow Rate"]),
            status:         row["ESP_ID"] ? "connected" : "disconnected",
          };
        })
        .filter(Boolean);
    }
    return dummyData;
  }, [isLive, sheetData, dummyData]);

  // Normalisasi untuk notifikasi (key sesuai datamu)
  const notifData = useMemo(
    () =>
      mappedData.map((d) => ({
        suhuTanah:       d.temperature,
        suhuUdara:       d.temperatureAir,
        kelembabanUdara: d.humidity,
        kelembapanTanah: d.soilMoisture,
        ph:              d.ph,
        flowRate:        d.flowRate,
        timestamp:       d.timestamp,
      })),
    [mappedData]
  );

  // Aktifkan notifikasi saat live (atau set true kalau ingin selalu)
  useThresholdNotifications(notifData, isLive);

  // Debug (boleh hapus)
  useEffect(() => {
    if (isLive && sheetData.length > 0) {
      console.log("RAW:", sheetData[0]);
      console.log("MAPPED:", mappedData[0]);
    }
  }, [isLive, sheetData, mappedData]);

  // Dummy data saat simulasi
  useEffect(() => {
    if (isLive) return;
    const interval = setInterval(() => {
      setDummyData((prev) => [
        {
          timestamp: new Date().toISOString(),
          temperature: 25 + Math.random() * 5,
          temperatureAir: 28 + Math.random() * 4,
          humidity: 60 + Math.random() * 10,
          soilMoisture: 35 + Math.random() * 15,
          ph: 6 + Math.random(),
          flowRate: Math.random() * 10,
          status: "dummy",
        },
        ...prev,
      ]);
    }, 4000);
    return () => clearInterval(interval);
  }, [isLive]);

  // Download CSV dari mappedData
  const handleDownloadCSV = () => {
    const csv =
      "Timestamp,Suhu Tanah,Suhu Udara,Kelembaban Udara,Kelembapan Tanah,pH,Flow Rate\n" +
      mappedData
        .map((d) =>
          [
            d.timestamp,
            d.temperature?.toFixed(1),
            d.temperatureAir?.toFixed(1),
            d.humidity?.toFixed(1),
            d.soilMoisture?.toFixed(1),
            d.ph?.toFixed(2),
            d.flowRate?.toFixed(2),
          ].join(",")
        )
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "data-irigasi.csv";
    link.click();
  };

  // Kartu status sensor (pakai kelas statis agar aman di Tailwind)
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
    // pt-20: offset navbar fixed
    <section className="pt-20 pb-10 bg-red-100">
      {/* Banner aktifkan notifikasi (muncul bila belum granted) */}
      {needNotifPrompt && (
        <div className="max-w-7xl mx-auto px-4 mb-4">
          <div className="bg-white border rounded-xl p-4 flex items-center justify-between">
            <span className="text-sm">
              Aktifkan notifikasi agar dapat peringatan saat nilai melewati batas.
            </span>
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
          <p className="text-gray-600">
            Data yang ditampilkan adalah <strong>Real-Time</strong>
          </p>
          <p className="text-red-700 mt-1">
            Tanaman: <strong>Cabai</strong> | Metode: <strong>Irigasi Tetes Otomatis</strong>
          </p>
          <div className="flex justify-center mt-4 gap-4">
            <button
              onClick={async () => {
                await requestNotificationPermission();
                navigate("/berandairigasi");
              }}
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
              {isLive ? "Mode Live: Spreadsheet" : "Mode Simulasi: Data Dummy"}
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsLive((v) => !v)}
              className="px-4 py-2 bg-white border rounded-lg text-green-700 hover:bg-green-50"
            >
              {isLive ? "Matikan Live" : "Aktifkan Live"}
            </button>
            <button
              onClick={handleDownloadCSV}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Download className="h-4 w-4 mr-2" /> Unduh CSV
            </button>
          </div>
        </motion.div>

        <SensorStatusBar />

        <SensorChartIrigasi data={mappedData} isLive={isLive} />

        <div className="mt-10">
          <DataLoggerIrigasi
            data={mappedData}
            isLive={isLive}
            loading={isLive && isInitialLoad} // loading hanya saat awal live
          />
        </div>
      </div>
    </section>
  );
};

export default IrigasiTetes;
