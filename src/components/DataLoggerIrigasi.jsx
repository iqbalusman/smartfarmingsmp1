// src/components/DataLoggerIrigasi.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Database, Calendar, Search, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import fetchSheetData from "@/lib/fetchSheetData";

// TAMPILKAN DALAM WIB supaya sama dengan spreadsheet
const DISPLAY_TZ = "Asia/Jakarta";
const DISPLAY_TZ_OFFSET_MINUTES = 7 * 60;

const fmtWIB = new Intl.DateTimeFormat("id-ID", {
  timeZone: DISPLAY_TZ,
  year: "numeric", month: "numeric", day: "numeric",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
});

function formatWIB(dateLike) {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  return isNaN(d) ? "-" : fmtWIB.format(d);
}

function getDayBoundsWIB(baseDate = new Date()) {
  const offsetMs = DISPLAY_TZ_OFFSET_MINUTES * 60 * 1000;
  const shifted = new Date(baseDate.getTime() + offsetMs);
  shifted.setUTCHours(0, 0, 0, 0);
  const start = new Date(shifted.getTime() - offsetMs);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

function parseTimestamp(input) {
  if (input == null) return new Date(NaN);
  if (input instanceof Date) return input;
  if (typeof input === "number") return new Date(input > 1e12 ? input : input * 1000);
  return new Date(String(input)); // ISO UTC dari fetcher → akurat
}

const columns = [
  { label: "Waktu", key: "timestamp" },
  { label: "Suhu Tanah (°C)", key: "temperature" },
  { label: "Suhu Udara (°C)", key: "temperatureAir" },
  { label: "Kelembaban Udara (%)", key: "humidity" },
  { label: "Kelembaban Tanah (%)", key: "soilMoisture" },
  { label: "pH Tanah", key: "ph" },
  { label: "Flow Rate (L/min)", key: "flowRate" },
  { label: "Status", key: "status" },
];

function getColor(key, value) {
  switch (key) {
    case "temperatureAir": return value < 22 || value > 32 ? "text-red-600" : "text-green-600";
    case "humidity":       return value < 45 || value > 75 ? "text-red-600" : "text-green-600";
    case "soilMoisture":   return value < 40 || value > 80 ? "text-red-600" : "text-green-600";
    case "ph":             return value < 5.5 || value > 7.5 ? "text-red-600" : "text-green-600";
    case "flowRate":       return value < 1 || value > 3 ? "text-red-600" : "text-green-600";
    default: return "";
  }
}

export default function DataLoggerIrigasi() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const rows = await fetchSheetData();
      if (!mounted) return;
      const cleaned = rows.map((r) => ({ ...r, status: r.timestamp ? "connected" : "disconnected" }));
      setData(cleaned);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const { start: todayStart, end: todayEnd } = useMemo(getDayBoundsWIB, []);

  const filteredSorted = useMemo(() => {
    const rowsToday = data.filter((row) => {
      const d = parseTimestamp(row.timestamp);
      return d >= todayStart && d < todayEnd;
    });

    const withSearch = searchTerm
      ? rowsToday.filter((row) =>
          formatWIB(parseTimestamp(row.timestamp)).toLowerCase().includes(searchTerm.toLowerCase())
        )
      : rowsToday;

    return withSearch.sort(
      (a, b) => parseTimestamp(b.timestamp) - parseTimestamp(a.timestamp)
    );
  }, [data, searchTerm, todayStart, todayEnd]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / itemsPerPage));
  const startIndex = (page - 1) * itemsPerPage;
  const currentData = filteredSorted.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="text-center py-12">
        <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4 animate-spin" />
        <p className="text-gray-500 text-lg">Memuat data dari spreadsheet ...</p>
      </div>
    );
  }

  const todayLabelWIB = formatWIB(new Date()).split(",")[0];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
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
            Riwayat sensor: <strong>Suhu &amp; Kelembaban (SHT20)</strong>, <strong>pH &amp; Kelembaban Tanah</strong>, <strong>Flow Meter</strong>
          </p>
          <p className="text-gray-500 text-xs">Menampilkan data otomatis dari <strong>{todayLabelWIB}</strong> (WIB)</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text" placeholder="Cari berdasarkan waktu (format WIB)..." value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
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
                  {columns.map((c) => (
                    <th key={c.key} className="py-3 px-4">
                      {c.key === "timestamp" ? (<><Calendar className="inline h-4 w-4 mr-1" />Waktu</>) : c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentData.map((row, idx) => {
                  const waktu = parseTimestamp(row.timestamp);
                  return (
                    <motion.tr key={startIndex + idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: idx * 0.05 }} className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      {columns.map((c) => {
                        const val = row[c.key];
                        return (
                          <td key={c.key} className={`py-3 px-4 font-semibold ${getColor(c.key, val)}`}>
                            {c.key === "timestamp"
                              ? formatWIB(waktu)
                              : c.key === "status"
                                ? (<span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    row.status === "connected" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                  }`}>{row.status === "connected" ? "Terkirim" : "Terputus"}</span>)
                                : val == null || val === "" ? "-"
                                : ["ph", "flowRate"].includes(c.key) ? Number(val).toFixed(2)
                                : typeof val === "number" ? Number(val).toFixed(1)
                                : String(val)}
                          </td>
                        );
                      })}
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
                Menampilkan {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredSorted.length)} dari {filteredSorted.length} data hari ini (WIB)
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-gray-700">Hal {page} dari {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page === totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <Database className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">{data.length === 0 ? "Belum ada data hari ini" : "Tidak ada data yang sesuai filter"}</p>
          <p className="text-gray-400 text-sm">Pastikan perangkat Anda mengirim data.</p>
        </div>
      )}
    </motion.div>
  );
}
