// src/hooks/useSpreadsheetHidroponik.js
import { useEffect, useRef, useState } from "react";
import { fetchSheetDataHidroponik } from "@/lib/fetchSheetDataHidroponik";

/**
 * Auto-update tanpa refresh + tanpa animasi loading (SWR style).
 * - Polling internal (default 2000 ms)
 * - Pause saat tab tidak aktif
 * - Urutan default: 'desc' (terbaru di atas)
 *
 * @param {string} spreadsheetId
 * @param {number|string} gid
 * @param {object} [options]
 *   - intervalMs?: number (default 2000)
 *   - pauseOnHidden?: boolean (default true)
 *   - order?: 'desc' | 'asc' | 'none'  (default 'desc')
 */
export default function useSpreadsheetHidroponik(
  spreadsheetId,
  gid = 0,
  options = {}
) {
  const {
    intervalMs = 2000,
    pauseOnHidden = true,
    order = "desc",
  } = options;

  const [data, setData] = useState([]);
  const loading = false; // tidak pernah true → tidak ada spinner
  const aliveRef = useRef(true);
  const timerRef = useRef(null);

  async function loadOnce() {
    try {
      const cacheKey = `${Date.now()}_${Math.random()}`;
      const rows = await fetchSheetDataHidroponik(spreadsheetId, gid, { cacheKey });
      if (!aliveRef.current) return;

      let out = Array.isArray(rows) ? [...rows] : [];
      if (order === "desc") out.reverse(); // Sheet biasanya append di bawah → terbaru di atas
      // (order 'asc' dibiarkan, 'none' juga dibiarkan)

      setData(out); // SWR style: langsung ganti data, tanpa flicker
    } catch (e) {
      // Diamkan: pertahankan data lama di layar
      console.warn("[useSpreadsheetHidroponik] load error:", e);
    }
  }

  // Muat saat mount + setiap id/gid/order berubah
  useEffect(() => {
    aliveRef.current = true;
    loadOnce();
    return () => { aliveRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spreadsheetId, gid, order]);

  // Polling internal
  useEffect(() => {
    const start = () => {
      if (timerRef.current) return;
      timerRef.current = setInterval(() => {
        if (pauseOnHidden && typeof document !== "undefined" && document.hidden) return;
        loadOnce();
      }, Math.max(1000, intervalMs));
    };
    const stop = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };

    start();
    const onVis = () => {
      if (!pauseOnHidden) return;
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spreadsheetId, gid, intervalMs, pauseOnHidden, order]);

  return { data, loading };
}
