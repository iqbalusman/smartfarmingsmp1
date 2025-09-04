// src/hooks/useSpreadsheet.js
import { useEffect, useRef, useState } from "react";
import fetchSheetData from "@/lib/fetchSheetData"; // ← default import (fix error named export)

/**
 * useSpreadsheet(spreadsheetId, gid = 0, reloadFlagOrOptions = 0)
 *
 * Backward compatible:
 *  - Lama : useSpreadsheet(id, gid, reloadFlag)
 *  - Baru : useSpreadsheet(id, gid, { live: true, intervalMs: 2000, order: 'desc' })
 *
 * Options:
 *  - live: boolean          -> aktifkan polling otomatis (default: true)
 *  - intervalMs: number     -> interval polling ms (default: 2000)
 *  - pauseOnHidden: boolean -> jeda polling saat tab hidden (default: true)
 *  - order: 'none'|'asc'|'desc' -> urutan hasil (default: 'desc' = terbaru di atas)
 */
export default function useSpreadsheet(spreadsheetId, gid = 0, reloadFlagOrOptions = 0) {
  // normalize params (kompatibel lama & baru)
  const defaultOpts = { live: true, intervalMs: 2000, pauseOnHidden: true, order: "desc" };
  const isOptions = typeof reloadFlagOrOptions === "object" && reloadFlagOrOptions !== null;
  const options = isOptions ? { ...defaultOpts, ...reloadFlagOrOptions } : defaultOpts;
  const externalReloadFlag = isOptions ? 0 : (reloadFlagOrOptions || 0);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // internal tick untuk refresh manual (return refresh() kalau mau)
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((x) => x + 1);

  const prevFirstRef = useRef(null); // deteksi perubahan ringan
  const intervalRef = useRef(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  // helper: parse timestamp aman untuk sort
  const ts = (row) => {
    const t = row?.timestamp;
    const d = t instanceof Date ? t : new Date(t);
    const n = d.getTime();
    return Number.isFinite(n) ? n : -Infinity;
  };

  async function loadOnce() {
    try {
      setLoading(true);
      setError(null);

      // cache-bust key (opsional dipakai fetcher)
      const cacheKey = `${Date.now()}_${Math.random()}`;

      // Aman: JS akan mengabaikan argumen ekstra jika fetchSheetData tidak memakainya
      const rows = await fetchSheetData(spreadsheetId, gid, { cacheKey });

      let out = Array.isArray(rows) ? rows.slice() : [];

      // Urutkan sesuai opsi
      if (options.order === "asc") {
        out.sort((a, b) => ts(a) - ts(b));
      } else if (options.order === "desc") {
        out.sort((a, b) => ts(b) - ts(a));
      }
      // 'none' -> biarkan urutan sumber

      if (!aliveRef.current) return;

      const firstStr = out.length ? JSON.stringify(out[0]) : null;
      prevFirstRef.current = firstStr;

      setData(out);
    } catch (e) {
      if (!aliveRef.current) return;
      setError(e);
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }

  // sekali saat mount & setiap param berubah / manual refresh
  useEffect(() => {
    loadOnce();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spreadsheetId, gid, options.order, externalReloadFlag, tick]);

  // polling otomatis
  useEffect(() => {
    if (!options.live || options.intervalMs <= 0) return;

    const start = () => {
      if (intervalRef.current) return;
      intervalRef.current = setInterval(() => {
        if (options.pauseOnHidden && typeof document !== "undefined" && document.hidden) return;
        loadOnce();
      }, options.intervalMs);
    };
    const stop = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };

    start();
    const onVis = () => {
      if (!options.pauseOnHidden) return;
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spreadsheetId, gid, options.live, options.intervalMs, options.pauseOnHidden, options.order]);

  return { data, loading, error, refresh };
}
