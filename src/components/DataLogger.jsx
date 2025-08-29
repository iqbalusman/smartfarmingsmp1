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

// Format waktu (ISO atau string ke lokal)
function formatTanggal(str) {
  if (!str) return "-";
  // Bersihkan jika ada embel-embel "TDate..." di belakang (bug dari spreadsheet)
  const cleaned = str.split("TDate")[0];
  try {
    const t = new Date(cleaned);
    if (isNaN(t)) return cleaned;
    // Format: 6/8/2025, 22.36.01
    return `${t.getDate()}/${t.getMonth()+1}/${t.getFullYear()}, ${t.getHours().toString().padStart(2,"0")}.${t.getMinutes().toString().padStart(2,"0")}.${t.getSeconds().toString().padStart(2,"0")}`;
  } catch {
    return cleaned;
  }
}
const DataLogger = ({ data = [], isLive = false, loading = false }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 10;

  // Header tabel (urutan sesuai parameter data)
  const header = [
    { label: "Waktu", key: "timestamp" },
    { label: "Suhu (°C)", key: "suhu" },
    { label: "pH", key: "pH" },
    { label: "FlowL/M", key: "flowRate" }
  ];

  // Search (di waktu)
  const filteredData = data.filter(item => {
    const waktu = formatTanggal(item.timestamp);
    return (
      searchTerm === '' ||
      waktu.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const sortedData = [...filteredData].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const totalPages = Math.max(1, Math.ceil(sortedData.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = sortedData.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="text-center py-12">
        <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4 animate-spin" />
        <p className="text-gray-500 text-lg">Memuat data dari spreadsheet ...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="glass-effect p-6 md:p-8 rounded-2xl shadow-xl overflow-x-auto"
    >
      {/* Header */}
      <div className="flex items-center space-x-3 mb-8">
        <div className="p-3 bg-green-500 rounded-xl">
          <FileText className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Data Logger Hidroponik</h2>
          <p className="text-gray-600 text-sm md:text-base">
            Riwayat data: <strong>Suhu</strong>, <strong>pH</strong>, <strong>Flow L/M</strong>
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan waktu..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      {currentData.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm md:text-base text-center">
              <thead>
                <tr className="border-b border-gray-200 bg-green-50">
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
                {currentData.map((row, index) => (
                  <motion.tr
                    key={startIndex + index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.04 }}
                    className="border-b border-gray-100 hover:bg-green-50"
                  >
                    {header.map(h => (
                      <td key={h.key} className="py-3 px-4 font-semibold">
                        {h.key === "timestamp"
                          ? formatTanggal(row.timestamp)
                          : row[h.key] !== undefined && row[h.key] !== null
                            ? (["pH", "flowRate"].includes(h.key)
                                ? Number(row[h.key]).toFixed(2)
                                : typeof row[h.key] === "number"
                                  ? Number(row[h.key]).toFixed(1)
                                  : row[h.key])
                            : '-'}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col md:flex-row items-center justify-between mt-6 gap-4">
              <div className="text-sm text-gray-600">
                Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredData.length)} dari {filteredData.length} data
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
            {data.length === 0 ? 'Belum ada data' : 'Tidak ada data yang sesuai filter'}
          </p>
          <p className="text-gray-400 text-sm">
            {isLive ? 'Pastikan perangkat Anda mengirim data.' : 'Data simulasi akan muncul di sini.'}
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default DataLogger;
