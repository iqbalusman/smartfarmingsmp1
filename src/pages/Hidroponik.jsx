import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Thermometer, Droplets, Wifi, WifiOff, Download, Activity, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import SensorChart from '@/components/SensorChart';
import DataLogger from '@/components/DataLogger';
import Navbar from '@/components/Navbar';
import useSpreadsheetHidroponik from "@/hooks/useSpreadsheetHidroponik";

// ✅ pakai NAMA TAB, bukan ID/GID
const SHEET_NAME = "Sheet1";

// parser numerik AMAN untuk chart (tanpa fallback 0)
const toNum = (v) => {
  if (v === undefined || v === null) return null;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

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
  const [isLive, setIsLive] = useState(false);
  const [dummyData, setDummyData] = useState([]);
  const [reloadFlag, setReloadFlag] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const { toast } = useToast();

  // Polling saat Live
  useEffect(() => {
    let id;
    if (isLive) {
      setIsInitialLoad(true);
      id = setInterval(() => setReloadFlag((f) => f + 1), 5000);
    }
    return () => clearInterval(id);
  }, [isLive]);

  // ✅ ambil data by NAMA SHEET
  const { data: sheetRows, loading } = useSpreadsheetHidroponik(SHEET_NAME, reloadFlag);

  // Setelah load awal, matikan spinner
  useEffect(() => {
    if (isLive && !loading) setIsInitialLoad(false);
    if (!isLive) setIsInitialLoad(false);
  }, [isLive, loading]);

  // ✅ Data live langsung pakai kunci baku dari fetch: {timestamp, pH, suhu, flowRate}
  // Untuk chart, ubah ke number aman tanpa fallback 0
  const liveData = sheetRows.map((r) => ({
    timestamp: r.timestamp,
    suhu: toNum(r.suhu),
    flowRate: toNum(r.flowRate),
    pH: toNum(r.pH),
  }));

  const mappedData = isLive ? liveData : dummyData;

  // Dummy mode (simulasi)
  useEffect(() => {
    if (!isLive) {
      const id = setInterval(() => {
        setDummyData((prev) => [
          ...prev,
          {
            timestamp: new Date().toISOString(),
            suhu: 25 + Math.random() * 3,   // 25–28 °C
            flowRate: 1.9 + Math.random() * 0.2, // 1.9–2.1 L/m
            pH: 4.9 + Math.random() * 0.3, // 4.9–5.2
          },
        ]);
      }, 3000);
      return () => clearInterval(id);
    } else {
      setDummyData([]);
    }
  }, [isLive]);

  const handleDownload = () => {
    if (mappedData.length === 0) {
      toast({ title: 'Gagal', description: 'Tidak ada data untuk diunduh', variant: 'destructive' });
      return;
    }
    const csv = [
      ['Timestamp', 'Suhu (°C)', 'FlowL/M', 'pH'],
      ...mappedData.map((d) => [
        d.timestamp,
        d.suhu == null ? '' : d.suhu.toFixed(2),
        d.flowRate == null ? '' : d.flowRate.toFixed(2),
        d.pH == null ? '' : d.pH.toFixed(2),
      ]),
    ].map((r) => r.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', `hidroponik_data_${Date.now()}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <>
      <header><Navbar /></header>
      <Helmet><title>Monitoring Hidroponik</title></Helmet>

      <section className="py-20 bg-gradient-to-br from-green-50 via-white to-green-100 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Title */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="mb-8 text-center">
            <h1 className="text-4xl font-extrabold text-green-700 flex justify-center items-center gap-3">
              <span className="text-5xl">🌱</span> Monitoring Hidroponik
            </h1>
            <p className="text-gray-700 text-lg mt-2">Data yang ditampilkan adalah data Real-Time</p>
            <p className="text-green-700 text-base mt-2">
              Tanaman: <span className="font-bold">Pakcoy</span> | Fase: <span className="font-bold">Vegetatif</span>
            </p>
          </motion.div>

          {/* Status Bar */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="flex flex-wrap justify-between items-center bg-white shadow rounded-2xl p-4 mb-8">
            <div className="flex items-center space-x-3">
              {isLive ? <Wifi className="text-green-600 h-6 w-6" /> : <WifiOff className="text-red-600 h-6 w-6" />}
              <span className="text-sm font-medium">{isLive ? 'Mode Live: ESP32 Terhubung' : 'Mode Simulasi: Data Dummy'}</span>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => setIsLive(!isLive)}>
                {isLive ? 'Matikan Live' : 'Aktifkan Live'}
              </Button>
              <Button onClick={handleDownload}><Download className="h-4 w-4 mr-2" /> Unduh CSV</Button>
            </div>
          </motion.div>

          {/* Sensor Status Bar */}
          <SensorStatusBar />

          {/* Chart */}
          <SensorChart data={mappedData} isLive={isLive} loading={isInitialLoad && loading && isLive} avgMode="last" />

          {/* Data Logger */}
          <div className="mt-10">
            <DataLogger data={mappedData} isLive={isLive} loading={isInitialLoad && loading && isLive} />
          </div>
        </div>
      </section>
    </>
  );
};

export default Hidroponik;
