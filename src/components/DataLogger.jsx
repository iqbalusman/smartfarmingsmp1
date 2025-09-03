// src/components/DataLogger.jsx
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Database, Calendar, Search, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ===== Helpers ===== */

function formatTanggal(v) {
  if (!v) return '-';
  const cleaned = String(v).split('TDate')[0];
  const t = new Date(cleaned);
  if (Number.isNaN(t.getTime())) return cleaned; // tampilkan apa adanya jika bukan ISO
  const dd = String(t.getDate()).padStart(2, '0');
  const mm = String(t.getMonth() + 1).padStart(2, '0');
  const yyyy = t.getFullYear();
  const HH = String(t.getHours()).padStart(2, '0');
  const MM = String(t.getMinutes()).padStart(2, '0');
  const SS = String(t.getSeconds()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy}, ${HH}.${MM}.${SS}`;
}

const isTimeLike = (s) =>
  typeof s === 'string' &&
  (/\b\d{1,2}:\d{2}:\d{2}\b/.test(s) || /\d{4}-\d{2}-\d{2}T/.test(s) || /\b\d{1,2}\.\d{2}\.\d{2}\b/.test(s));

function parseNumStrict(kind, v) {
  if (v === undefined || v === null) return null;
  if (isTimeLike(String(v))) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = parseFloat(s.replace(',', '.'));
  if (!Number.isFinite(n)) return null;

  if (kind === 'suhu' && (n < -10 || n > 100)) return null;
  if (kind === 'flow' && (n < 0 || n > 1000)) return null;
  if (kind === 'ph'   && (n < 0 || n > 14))    return null;

  return n;
}

/* ===== Component ===== */

const DataLogger = ({ data = [], isLive = false, loading = false }) => {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const perPage = 10;

  const header = [
    { label: 'Waktu', key: 'timestamp' },
    { label: 'Suhu (°C)', key: 'suhu' },
    { label: 'pH', key: 'pH' },
    { label: 'FlowL/M', key: 'flowRate' },
  ];

  const normalized = useMemo(
    () =>
      data.map((r) => ({
        timestamp: r.timestamp,
        suhu: parseNumStrict('suhu', r.suhu),
        pH: parseNumStrict('ph', r.pH),
        flowRate: parseNumStrict('flow', r.flowRate),
      })),
    [data]
  );

  const filtered = useMemo(() => {
    if (!q) return normalized;
    const qq = q.toLowerCase();
    return normalized.filter((r) => formatTanggal(r.timestamp || '').toLowerCase().includes(qq));
  }, [normalized, q]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)),
    [filtered]
  );

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;
  const current = sorted.slice(start, start + perPage);

  if (loading) {
    return (
      <div className="text-center py-12">
        <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4 animate-spin" />
        <p className="text-gray-500 text-lg">Memuat data dari spreadsheet ...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
      className="glass-effect p-6 md:p-8 rounded-2xl shadow-xl overflow-x-auto">

      {/* Header */}
      <div className="flex items-center space-x-3 mb-8">
        <div className="p-3 bg-green-500 rounded-xl"><FileText className="h-6 w-6 text-white" /></div>
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan waktu..."
            value={q}
            onChange={(e) => { setPage(1); setQ(e.target.value); }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      {current.length ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm md:text-base text-center">
              <thead>
                <tr className="border-b border-gray-200 bg-green-50">
                  {header.map(h => (
                    <th key={h.key} className="py-3 px-4">
                      {h.key === 'timestamp'
                        ? (<><Calendar className="inline h-4 w-4 mr-1" />Waktu</>)
                        : h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {current.map((row, i) => (
                  <motion.tr key={start + i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                    className="border-b border-gray-100 hover:bg-green-50">
                    {header.map(h => {
                      const v = row[h.key];
                      if (h.key === 'timestamp') {
                        return <td key={h.key} className="py-3 px-4 font-semibold">{formatTanggal(v)}</td>;
                      }
                      return (
                        <td key={h.key} className="py-3 px-4 font-semibold">
                          {v === null || v === undefined ? '-' : v.toFixed(2)}
                        </td>
                      );
                    })}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col md:flex-row items-center justify-between mt-6 gap-4">
              <div className="text-sm text-gray-600">
                Menampilkan {start + 1}-{Math.min(start + perPage, total)} dari {total} data
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-gray-700">Hal {page} dari {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <Database className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">{data.length === 0 ? 'Belum ada data' : 'Tidak ada data yang sesuai filter'}</p>
          <p className="text-gray-400 text-sm">{isLive ? 'Pastikan perangkat Anda mengirim data.' : 'Data simulasi akan muncul di sini.'}</p>
        </div>
      )}
    </motion.div>
  );
};

export default DataLogger;
