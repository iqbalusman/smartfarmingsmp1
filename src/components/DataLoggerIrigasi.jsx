import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Database,
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ======================
//  Zona waktu & Utils
// ======================

// Spreadsheet diset ke WIB:
const SPREADSHEET_TZ = 'Asia/Jakarta';
const SPREADSHEET_TZ_OFFSET_MINUTES = 7 * 60; // WIB = UTC+7

// Parser timestamp dari spreadsheet → Date(UTC) akurat.
// Menangani: ISO string, Excel serial number, dan "dd/mm/yyyy HH:mm[:ss]" (pemisah : atau .)
function parseSheetTimestamp(input) {
  if (input == null) return new Date(NaN);
  if (input instanceof Date) return input;

  if (typeof input === 'number') {
    // Epoch ms?
    if (input > 1e12) return new Date(input);
    // Excel serial (hari sejak 1899-12-30)
    const excelEpoch = Date.UTC(1899, 11, 30);
    return new Date(excelEpoch + input * 86400000);
  }

  if (typeof input === 'string') {
    // 1) Coba ISO/RFC
    const iso = new Date(input);
    if (!isNaN(iso)) return iso;

    // 2) dd/mm/yyyy HH:mm[:ss]  (contoh: "04/09/2025 1:12:52" atau "04-09-2025 01.12.52")
    const m = input.match(
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\s+(\d{1,2})[.:](\d{2})(?:[.:](\d{2}))?/
    );
    if (m) {
      let [, DD, MM, YY, hh, mm, ss] = m;
      const year = YY.length === 2 ? 2000 + parseInt(YY, 10) : parseInt(YY, 10);
      // Spreadsheet di WIB → konversi ke UTC (kurangi 7 jam)
      const utcMs = Date.UTC(
        year,
        parseInt(MM, 10) - 1,
        parseInt(DD, 10),
        parseInt(hh, 10) - (SPREADSHEET_TZ_OFFSET_MINUTES / 60),
        parseInt(mm, 10),
        ss ? parseInt(ss, 10) : 0
      );
      return new Date(utcMs);
    }
  }

  return new Date(NaN);
}

// Format untuk tampilan sesuai WIB (ikuti yang terlihat di sheet)
function formatTanggalWIB(dateLike, more = {}) {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (isNaN(d)) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: SPREADSHEET_TZ, // WIB
    hour12: false,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    ...more,
  }).format(d);
}

// Dapatkan batas 00:00–24:00 “hari ini” versi WIB → Date(UTC) untuk pembanding
function getWibDayBounds(baseDate = new Date()) {
  const utcMs = baseDate.getTime() + baseDate.getTimezoneOffset() * 60000;
  const wibMs = utcMs + SPREADSHEET_TZ_OFFSET_MINUTES * 60000; // geser ke WIB
  const wib00 = new Date(wibMs);
  wib00.setHours(0, 0, 0, 0);
  const startUtcMs = wib00.getTime() - SPREADSHEET_TZ_OFFSET_MINUTES * 60000; // balik ke UTC
  const endUtcMs = startUtcMs + 24 * 60 * 60 * 1000;
  return { start: new Date(startUtcMs), end: new Date(endUtcMs) };
}

// Kompatibel dgn pemakaian lama (dipanggil di tabel & search)
function formatTanggal(str) {
  const d = parseSheetTimestamp(str);
  return formatTanggalWIB(d);
}

const DataLoggerIrigasi = ({ data = [], isLive, loading }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 10;

  // Urutan header dan mapping key sesuai field hasil mapping di Irigasitetes.jsx
  const header = [
    { label: "Waktu", key: "timestamp" }, // <- gunakan 'timestamp' numeric/string dari sheet; kalau ada kolom 'Waktu' string, map-kan ke field ini saat fetch.
    { label: "Suhu Tanah (°C)", key: "temperature" },
    { label: "Suhu Udara (°C)", key: "temperatureAir" },
    { label: "Kelembaban Udara (%)", key: "humidity" },
    { label: "Kelembaban Tanah (%)", key: "soilMoisture" },
    { label: "pH Tanah", key: "ph" },
    { label: "Flow Rate (L/min)", key: "flowRate" },
    ...(isLive ? [{ label: "Status", key: "status" }] : []),
  ];

  // === Filter data hanya untuk hari ini (WIB) ===
  const { start: todayWibStart, end: todayWibEnd } = getWibDayBounds();

  const filteredData = data.filter(item => {
    // Jika kamu sudah memetakan kolom 'Waktu' (string) ke field 'timestamp',
    // formatTanggal(parse) masih aman. Jika 'timestamp' angka serial/ISO tetap aman.
    const waktu = parseSheetTimestamp(item.timestamp);
    return (
      waktu >= todayWibStart &&
      waktu < todayWibEnd &&
      (searchTerm === '' ||
        formatTanggalWIB(waktu).toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const sortedData = [...filteredData].sort(
    (a, b) => parseSheetTimestamp(b.timestamp) - parseSheetTimestamp(a.timestamp)
  );

  const totalPages = Math.max(1, Math.ceil(sortedData.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = sortedData.slice(startIndex, endIndex);

  // Coloring cell berdasar value (ganti sesuai kebutuhan)
  const getColor = (key, value) => {
    switch (key) {
      case "temperatureAir": return value < 22 || value > 32 ? 'text-red-600' : 'text-green-600';
      case "humidity": return value < 45 || value > 75 ? 'text-red-600' : 'text-green-600';
      case "soilMoisture": return value < 40 || value > 80 ? 'text-red-600' : 'text-green-600';
      case "ph": return value < 5.5 || value > 7.5 ? 'text-red-600' : 'text-green-600';
      case "flowRate": return value < 1 || value > 3 ? 'text-red-600' : 'text-green-600';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4 animate-spin" />
        <p className="text-gray-500 text-lg">Memuat data dari spreadsheet ...</p>
      </div>
    );
  }

  const todayLabelWIB = formatTanggalWIB(new Date(), {
    hour: undefined, minute: undefined, second: undefined
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="glass-effect p-6 md:p-8 rounded-2xl shadow-xl overflow-x-auto"
    >
      {/* Header */}
      <div className="flex items-center space-x-3 mb-8">
        <div className="p-3 bg-indigo-500 rounded-xl">
          <FileText className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Data Logger Irigasi Tetes</h2>
          <p className="text-gray-600 text-sm md:text-base">
            Riwayat sensor: <strong>Suhu & Kelembaban (SHT20)</strong>, <strong>pH & Kelembaban Tanah</strong>, <strong>Flow Meter</strong>
          </p>
          <p className="text-gray-500 text-xs">
            Menampilkan data otomatis dari <strong>{todayLabelWIB}</strong> (WIB)
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan waktu (format WIB)..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      {currentData.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm md:text-base text-center">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {header.map(h => (
                    <th key={h.key} className="py-3 px-4">
                      {h.key === "timestamp"
                        ? <><Calendar className="inline h-4 w-4 mr-1" />Waktu</>
                        : h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentData.map((row, index) => {
                  const waktu = parseSheetTimestamp(row.timestamp);
                  return (
                    <motion.tr
                      key={startIndex + index}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      {header.map(h => (
                        <td
                          key={h.key}
                          className={`py-3 px-4 font-semibold ${getColor(h.key, row[h.key])}`}
                        >
                          {h.key === "timestamp"
                            ? formatTanggalWIB(waktu) // tampil WIB sesuai sheet
                            : h.key === "status"
                              ? (
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    row.status === 'connected'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}>
                                    {row.status === 'connected' ? 'Terkirim' : 'Terputus'}
                                  </span>
                                )
                              : row[h.key] !== undefined && row[h.key] !== null
                                ? (["ph", "flowRate"].includes(h.key)
                                    ? Number(row[h.key]).toFixed(2)
                                    : typeof row[h.key] === "number"
                                      ? Number(row[h.key]).toFixed(1)
                                      : row[h.key])
                                : '-'}
                        </td>
                      ))}
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col md:flex-row items-center justify-between mt-6 gap-4">
              <div className="text-sm text-gray-600">
                Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredData.length)} dari {filteredData.length} data hari ini (WIB)
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-gray-700">
                  Hal {currentPage} dari {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <Database className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">
            {data.length === 0 ? 'Belum ada data hari ini' : 'Tidak ada data yang sesuai filter'}
          </p>
          <p className="text-gray-400 text-sm">
            {isLive ? 'Pastikan perangkat Anda mengirim data.' : 'Data simulasi akan muncul di sini.'}
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default DataLoggerIrigasi;
