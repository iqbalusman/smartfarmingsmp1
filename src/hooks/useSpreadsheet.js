import { useEffect, useState } from "react";
import { fetchSheetData } from "@/lib/fetchSheetData";

/**
 * Custom hook untuk ambil data Google Sheets (GViz)
 * @param {string} spreadsheetId - ID sheet
 * @param {number|string} gid - Sheet GID (default: 0)
 * @returns { data: Array, loading: boolean }
 */
export default function useSpreadsheet(spreadsheetId, gid = 0, reloadFlag = 0) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  // (Optional) const [error, setError] = useState(null);

   useEffect(() => {
    let run = true;
    async function getData() {
      setLoading(true);
      const rows = await fetchSheetData(spreadsheetId, gid);
      if (run) setData(rows.reverse());
      setLoading(false);
    }
    getData();
    return () => { run = false; };
  }, [spreadsheetId, gid, reloadFlag]); // TAMBAHKAN reloadFlag di dependency!


  return { data, loading /*, error */ };
}
