// src/pages/Hidroponik.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import {
  Thermometer, Droplets, Gauge, Wifi, WifiOff, Download, Activity, CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import SensorChart from '@/components/SensorChart';
import DataLogger from '@/components/DataLogger';
import Navbar from '@/components/Navbar';
import useSpreadsheetHidroponik from "@/hooks/useSpreadsheetHidroponik";

// GANTI SESUAI SHEET HIDROPONIK KAMU
const SPREADSHEET_ID = "1rL0v_f4yI4cWr6g0uTwHQSqG-ASnI4cnYw0WArDbDx";
const SHEET_GID = 1;

function parseNumber(val) {
  if (typeof val === "string") {
    const cleaned = val.replace(/[^0-9.,-]/g, "").replace(",", ".");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return typeof val === "number" ? val : 0;
}

function parseTimestamp(row) {
  if (row["Timestamp (UTC)"] && row["Waktu (WIB)"]) {
    return `${row["Timestamp (UTC)"]}T${row["Waktu (WIB)"]}`;
  }
  return row["Timestamp (UTC)"] || row["Waktu (WIB)"] || new Date().toISOString();
}

// === SensorStatusBar (3 items) ===
const SensorStatusBar = () => {
  const sensors = [
    { name: "Suhu", icon: Thermometer, border: "border-red-300", text: "text-red-500" },
    { name: "Flow Rate", icon: Activity, border: "border-orange-300", text: "text-orange-500" },
    { name: "pH", icon: Droplets, border: "border-purple-300", text: "text-purple-500" },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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

const Hidroponik = () => {
  const [isLive, setIsLive] = useState(true); // langsung live
  const [dummyData, setDummyData] = useState([]);
  const { toast } = useToast();

  // Auto-update dari sheet (tanpa loading, polling 2s, pause saat tab hidden, terbaru di atas)
  const { data: sheetData /* loading */ } = useSpreadsheetHidroponik(
    SPREADSHEET_ID,
    SHEET_GID,
    { intervalMs: 2000, pauseOnHidden: true, order: "desc" }
  );

  // Data akhir untuk UI
  const mappedData = useMemo(() => {
    const src = isLive ? sheetData : dummyData;
    return src.map((row) => ({
      timestamp: parseTimestamp(row),
      suhu: parseNumber(row["Suhu"]),
      flowRate: parseNumber(row["FlowL/M"]),
      pH: parseNumber(row["pH"]),
    }));
  }, [isLive, sheetData, dummyData]);

  // Dummy mode (kalau user matikan live)
  useEffect(() => {
    if (!isLive) {
      const id = setInterval(() => {
        setDummyData((prev) => [
          {
            timestamp: new Date().toISOString(),
            suhu: 20 + Math.random() * 10,
            flowRate: 1 + Math.random() * 3,
            pH: 5.5 + Math.random() * 2,
          },
          ...prev, // terbaru di atas
        ]);
      }, 3000);
      return () => clearInterval(id);
    } else {
      setDummyData([]);
    }
  }, [isLive]);

  // Download CSV
  const handleDownload = () => {
    if (!mappedData.length) {
      toast({ title: 'Gagal', description: 'Tidak ada data untuk diunduh', variant: 'destructive' });
      return;
    }
    const csv = [
      ['Timestamp', 'Suhu (°C)', 'FlowL/M', 'pH'],
      ...mappedData.map(d => [d.timestamp, d.suhu?.toFixed(1), d.flowRate?.toFixed(2), d.pH?.toFixed(2)])
    ].map(r => r.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `hidroponik_data_${Date.now()}.csv`; a.click();
  };

  return (
    <>
      <header><Navbar /></header>
      <Helmet><title>Monitoring Hidroponik</title></Helmet>

      <section className="py-20 bg-gradient-to-br from-green-50 via-white to-green-100 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="mb-8 text-center">
            <h1 className="text-4xl font-extrabold text-green-700 flex justify-center items-center gap-3">
              <span className="text-5xl">🌱</span> Monitoring Hidroponik
            </h1>
            <p className="text-gray-700 text-lg mt-2">Data yang ditampilkan adalah data Real-Time</p>
            <p className="text-green-700 text-base mt-2">Tanaman: <span className="font-bold">Pakcoy</span> | Fase: <span className="font-bold">Vegetatif</span></p>
          </motion.div>

          {/* Status bar */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="flex flex-wrap justify-between items-center bg-white shadow rounded-2xl p-4 mb-8">
            <div className="flex items-center space-x-3">
              {isLive ? <Wifi className="text-green-600 h-6 w-6" /> : <WifiOff className="text-red-600 h-6 w-6" />}
              <span className="text-sm font-medium">
                {isLive ? 'Mode Live: Spreadsheet' : 'Mode Simulasi: Data Dummy'}
              </span>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => setIsLive(v => !v)}>
                {isLive ? 'Matikan Live' : 'Aktifkan Live'}
              </Button>
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" /> Unduh CSV
              </Button>
            </div>
          </motion.div>

          <SensorStatusBar />

          {/* Chart: jika butuh urut waktu (naik), kirim reverse */}
          <SensorChart data={[...mappedData].reverse()} isLive={isLive} />

          <div className="mt-10">
            {/* Logger: terbaru di atas */}
            <DataLogger data={mappedData} isLive={isLive} />
          </div>
        </div>
      </section>
    </>
  );
};

export default Hidroponik;
