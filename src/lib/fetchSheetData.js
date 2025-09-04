// src/lib/fetchSheetData.js
// Ambil data dari Google Sheets (GViz), baca Timestamp (kolom A), normalisasi jadi aman untuk UI.

const spreadsheetId = "1Y_LrC7kzvRlMPthtowIohP3ubRVGYDLoZEvjR2YPt1g";
const gid = 1; // pastikan sesuai sheet aktif di URL: ...#gid=<angka>

// Spreadsheet diset WIB oleh Apps Script
const SOURCE_TZ_OFFSET_MINUTES = 7 * 60; // WIB = UTC+7

// ---------- helpers ----------
const norm = (s) =>
  String(s || "").toLowerCase().normalize("NFKD").replace(/[^\w]+/g, "");

function toNumber(x) {
  if (x == null || x === "") return null;
  if (typeof x === "number") return x;
  const n = parseFloat(String(x).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// GViz "Date(YYYY,MM,DD,hh,mm,ss)" (bulan 0-based) -> ISO UTC
function gvizDateToIsoUTC(v) {
  const m =
    typeof v === "string" &&
    v.match(/^Date\((\d{4}),(\d{1,2}),(\d{1,2})(?:,(\d{1,2}),(\d{1,2}),(\d{1,2}))?\)$/);
  if (!m) return null;
  const [, y, M, d, hh = "0", mm = "0", ss = "0"] = m;
  const utcMs =
    Date.UTC(+y, +M, +d, +hh, +mm, +ss) - SOURCE_TZ_OFFSET_MINUTES * 60 * 1000;
  return new Date(utcMs).toISOString(); // ...Z
}

// "DD/MM/YYYY HH:mm:ss" (kalau ada) -> ISO UTC (anggap WIB)
function dmyToIsoUTC(s) {
  const m = s.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/
  );
  if (!m) return null;
  let [, DD, MM, YY, hh, mm, ss] = m;
  const year = YY.length === 2 ? 2000 + +YY : +YY;
  const utcMs =
    Date.UTC(year, +MM - 1, +DD, +hh, +mm, ss ? +ss : 0) -
    SOURCE_TZ_OFFSET_MINUTES * 60 * 1000;
  return new Date(utcMs).toISOString();
}

// mapping label → key UI (pakai label yang sudah dinormalisasi)
function keyFromLabel(labelNorm) {
  if (labelNorm === "timestamp" || labelNorm === "datetime") return "timestamp";
  if (labelNorm === "espid" || labelNorm === "esp_id" || labelNorm === "device") return "espId";
  if (labelNorm === "suhutanah") return "temperature";
  if (labelNorm === "ph") return "ph";
  if (labelNorm === "suhuudara") return "temperatureAir";
  if (
    labelNorm === "kelembapantanah" ||
    labelNorm === "kelembabantanah" ||
    labelNorm === "kelembapantanahpersen" ||
    labelNorm === "kelembabantanahpersen"
  ) return "soilMoisture";
  if (
    labelNorm === "kelembapanudara" ||
    labelNorm === "kelembabanudara" ||
    labelNorm === "kelembapanudarapersen" ||
    labelNorm === "kelembabanudarapersen"
  ) return "humidity";
  if (labelNorm === "flow" || labelNorm === "flowrate" || labelNorm === "flowratelmin")
    return "flowRate";
  return null;
}

async function fetchSheetData() {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&gid=${gid}`;

  try {
    const res = await fetch(url);
    const text = await res.text();
    const json = JSON.parse(text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1));

    const cols = json.table.cols || [];
    const rows = json.table.rows || [];

    const labels = cols.map((c) => (c.label || "").trim());
    const labelsNorm = labels.map(norm);

    const out = rows.map((r) => {
      const raw = {};
      const row = {};

      r.c.forEach((cell, idx) => {
        const label = labels[idx];
        if (!label) return;

        const labelN = labelsNorm[idx];
        const type = cols[idx]?.type; // "datetime" | "number" | "string" | ...
        let val = cell && cell.v != null ? cell.v : "";

        // --- Timestamp dari kolom A ---
        if (labelN === "timestamp") {
          if (type === "datetime" && typeof val === "string" && val.startsWith("Date(")) {
            const iso = gvizDateToIsoUTC(val);
            if (iso) val = iso;
          } else if (typeof val === "string") {
            const iso = dmyToIsoUTC(val);
            if (iso) val = iso;
          }
          row.timestamp = val; // ISO UTC
        }

        // Sensor lain (nama bisa bervariasi)
        const key = keyFromLabel(labelN);
        if (key && key !== "timestamp") {
          row[key] =
            ["temperature", "ph", "temperatureAir", "humidity", "soilMoisture", "flowRate"].includes(key)
              ? toNumber(val)
              : val;
        }

        raw[label] = val;
      });

      return { ...row, raw };
    });

    // Singkirkan baris kosong
    return out.filter((r) => r.timestamp || Object.values(r).some((v) => v != null && v !== ""));
  } catch (err) {
    console.error("❌ Gagal mengambil data dari spreadsheet:", err);
    return [];
  }
}

export default fetchSheetData;
export { fetchSheetData }; // ← named export agar import lama tetap jalan
