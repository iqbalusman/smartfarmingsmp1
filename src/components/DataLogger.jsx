// src/components/DataLogger.jsx — Full (WITA, Apps Script Params, robust parsing)
import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Database, Calendar, Search, ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'

/* =====================
   Zona waktu & Utils
   ===================== */
const SHEET_TZ = 'Asia/Makassar' // WITA
const SHEET_TZ_OFFSET_MINUTES = 8 * 60 // UTC+8 (WITA)

// Parser timestamp general → Date(UTC)
function parseSheetTimestamp(input) {
  if (input == null) return new Date(NaN)
  if (input instanceof Date) return input

  if (typeof input === 'number') {
    // Epoch ms?
    if (input > 1e12) return new Date(input)
    // Excel serial (hari sejak 1899-12-30)
    const excelEpoch = Date.UTC(1899, 11, 30)
    return new Date(excelEpoch + input * 86400000)
  }

  if (typeof input === 'string') {
    const s = input.split('TDate')[0].trim()

    // 1) Coba ISO/RFC lebih dulu
    const iso = new Date(s)
    if (!isNaN(iso)) return iso

    // 2) dd/mm/yyyy HH:mm[:ss] atau dd-mm-yyyy HH.mm.ss (anggap waktu lokal WITA)
    const m = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\s+(\d{1,2})[.:](\d{2})(?:[.:](\d{2}))?/)
    if (m) {
      let [, DD, MM, YY, hh, mm, ss] = m
      const year = YY.length === 2 ? 2000 + parseInt(YY, 10) : parseInt(YY, 10)
      const utcMs = Date.UTC(
        year,
        parseInt(MM, 10) - 1,
        parseInt(DD, 10),
        parseInt(hh, 10) - SHEET_TZ_OFFSET_MINUTES / 60,
        parseInt(mm, 10),
        ss ? parseInt(ss, 10) : 0
      )
      return new Date(utcMs)
    }

    // 3) Date(y,m,d[,h,m,s]) style
    const mDate = s.match(/Date\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+))?\s*\)/i)
    if (mDate) {
      let [, y, mo, d, HH = '0', MI = '0', SS = '0'] = mDate
      const month = +mo >= 1 && +mo <= 12 ? +mo - 1 : +mo
      const dt = new Date(+y, month, +d, +HH, +MI, +SS)
      if (!isNaN(dt)) return dt
    }
  }

  return new Date(NaN)
}

// Format tampilan ke WITA (mengikuti yang tercatat di sheet)
function formatTanggalWITA(dateLike, more = {}) {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike)
  if (isNaN(d)) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: SHEET_TZ,
    hour12: false,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    ...more,
  }).format(d)
}

// Parser angka robust (1.234,56 & 1,234.56)
const toNum = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (v == null) return null
  const s = String(v).trim()
  const dot = s.lastIndexOf('.')
  const comma = s.lastIndexOf(',')
  const decSep = dot > comma ? '.' : comma > -1 ? ',' : null
  let cleaned = s.replace(/[^0-9.,-]/g, '')
  if (decSep) {
    const other = decSep === ',' ? '.' : ','
    cleaned = cleaned.replace(new RegExp('\\' + other, 'g'), '')
    cleaned = cleaned.replace(decSep, '.')
  }
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

const fmtNum = (v, d = 2) => {
  const n = toNum(v)
  return Number.isFinite(n) ? n.toFixed(d) : '-'
}

/* =====================
   Komponen Tabel
   ===================== */
const DataLogger = ({ data = [], isLive = false, loading = false }) => {
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const perPage = 10

  // Header mengikuti parameter App Script: pH, suhu, flow; timestamp (UTC) → ditampilkan WITA
  const header = [
    { label: 'Waktu', key: 'timestamp' },
    { label: 'Suhu (°C)', key: 'suhu' },
    { label: 'pH', key: 'pH' },
    { label: 'Flow (L/min)', key: 'flow' },
  ]

  // Normalisasi field agar cocok dengan hasil hook/util hidroponik & SensorChart
  const normalized = useMemo(
    () =>
      (Array.isArray(data) ? data : [])
        .map((r) => ({
          // Timestamp fleksibel
          timestamp:
            r.timestamp_utc ??
            r.timestamp ??
            r['Timestamp (UTC)'] ??
            r['Timestamp'] ??
            r?.saved?.timestamp_utc ??
            r?._raw?.['Timestamp (UTC)'],

          // SUHU — alias umum
          suhu: toNum(
            r.suhu ??
              r.Suhu ??
              r['Suhu (°C)'] ??
              r.temperature ??
              r['temperature'] ??
              r.temperatureAir ??
              r.Temp ??
              r['Temp'] ??
              r?.saved?.suhu ??
              r?._raw?.['Suhu'] ??
              r?._raw?.['Suhu (°C)']
          ),

          // pH
          pH: toNum(r.pH ?? r.PH ?? r.Ph ?? r?.saved?.pH ?? r?._raw?.['pH']),

          // FLOW — alias umum
          flow: toNum(
            r.flow ??
              r.flowRate ??
              r.Flow ??
              r['FlowL/M'] ??
              r['Flow (L/min)'] ??
              r.flow_lm ??
              r?.saved?.flow ??
              r?._raw?.['FlowL/M'] ??
              r?._raw?.['Flow (L/min)']
          ),
        }))
        .filter((r) => r.timestamp),
    [data]
  )

  // Pencarian berdasarkan string waktu WITA
  const filtered = useMemo(() => {
    if (!q) return normalized
    const qq = q.toLowerCase()
    return normalized.filter((r) =>
      formatTanggalWITA(parseSheetTimestamp(r.timestamp)).toLowerCase().includes(qq)
    )
  }, [normalized, q])

  // Sort terbaru → lama pakai parser aware timezone
  const sorted = useMemo(
    () => [...filtered].sort((a, b) => parseSheetTimestamp(b.timestamp) - parseSheetTimestamp(a.timestamp)),
    [filtered]
  )

  const total = sorted.length
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const start = (page - 1) * perPage
  const current = sorted.slice(start, start + perPage)

  if (loading) {
    return (
      <div className="text-center py-12">
        <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4 animate-spin" />
        <p className="text-gray-500 text-lg">Memuat data dari spreadsheet ...</p>
      </div>
    )
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
            Riwayat data: <strong>Suhu</strong>, <strong>pH</strong>, <strong>Flow</strong>
          </p>
          <p className="text-gray-500 text-xs">Zona waktu tampilan: <strong>WITA (Asia/Makassar)</strong></p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan waktu (format WITA)..."
            value={q}
            onChange={(e) => {
              setPage(1)
              setQ(e.target.value)
            }}
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
                  {header.map((h) => (
                    <th key={h.key} className="py-3 px-4">
                      {h.key === 'timestamp' ? (
                        <>
                          <Calendar className="inline h-4 w-4 mr-1" />Waktu
                        </>
                      ) : (
                        h.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {current.map((row, i) => (
                  <motion.tr
                    key={start + i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                    className="border-b border-gray-100 hover:bg-green-50"
                  >
                    {header.map((h) => {
                      const v = row[h.key]
                      if (h.key === 'timestamp') {
                        return (
                          <td key={h.key} className="py-3 px-4 font-semibold">
                            {formatTanggalWITA(parseSheetTimestamp(v))}
                          </td>
                        )
                      }
                      return (
                        <td key={h.key} className="py-3 px-4 font-semibold">
                          {fmtNum(v, h.key === 'suhu' ? 1 : 2)}
                        </td>
                      )
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
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-gray-700">Hal {page} dari {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
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
          <p className="text-gray-500 text-lg">{Array.isArray(data) && data.length === 0 ? 'Belum ada data' : 'Tidak ada data yang sesuai filter'}</p>
          <p className="text-gray-400 text-sm">{isLive ? 'Pastikan perangkat Anda mengirim data.' : 'Data simulasi akan muncul di sini.'}</p>
        </div>
      )}
    </motion.div>
  )
}

export default DataLogger
