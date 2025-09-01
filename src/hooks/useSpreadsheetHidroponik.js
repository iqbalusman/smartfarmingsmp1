import { useEffect, useState } from "react";
import { fetchSheetDataHidroponik } from "@/lib/fetchSheetDataHidroponik";

/**
 * Custom hook untuk ambil data Google Sheets (hidroponik, via GViz)
 * @param {string} spreadsheetId - ID Google Sheet
 * @param {number|string} gid - Sheet GID/tab (default: 0)
 * @returns { data: Array, loading: boolean }
 */
export default function useSpreadsheetHidroponik(spreadsheetId, gid = 0, reloadFlag = 0) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

   useEffect(() => {
    let run = true;
    async function getData() {
      setLoading(true);
      const rows = await fetchSheetDataHidroponik(spreadsheetId, gid);
      if (run) setData(rows.reverse());
      setLoading(false);
    }
    getData();
    return () => { run = false; };
  }, [spreadsheetId, gid, reloadFlag]);

  return { data, loading };
}
