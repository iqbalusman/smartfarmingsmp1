import { useEffect, useState } from "react";
import { fetchSheetDataHidroponik } from "@/lib/fetchSheetDataHidroponik";

/**
 * Ambil data Google Sheets (hidroponik) via GViz berdasarkan NAMA sheet.
 * @param {string} sheetName - nama tab, mis. "Sheet1"
 * @param {number} reloadFlag - angka untuk trigger reload (opsional)
 */
export default function useSpreadsheetHidroponik(sheetName = "Sheet1", reloadFlag = 0) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ok = true;
    (async () => {
      setLoading(true);
      const rows = await fetchSheetDataHidroponik(sheetName); // ✅ hanya kirim sheetName
      if (ok) setData(rows);                                  // ❌ jangan .reverse(); urutan kita sort di UI
      if (ok) setLoading(false);
    })();
    return () => { ok = false; };
  }, [sheetName, reloadFlag]); // ✅ dependency sheetName

  return { data, loading };
}
