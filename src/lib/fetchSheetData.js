// src/lib/fetchSheetData.js

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

export default async function fetchSheetData() {
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

        // --- ambil Timestamp dari kolom A ---
        if (labelN === "timestamp") {
          // GViz datetime -> "Date(...)"
          if (type === "datetime" && typeof val === "string" && val.startsWith("Date(")) {
            const iso = gvizDateToIsoUTC(val);
            if (iso) val = iso;
          }
          row.timestamp = val; // ISO UTC ...Z
        }

        // Map kolom sensor lain (longgar: label boleh bervariasi)
        if (labelN === "espid" || labelN === "esp_id" || labelN === "device") {
          row.espId = val;
        } else if (labelN === "suhutanah") {
          row.temperature = toNumber(val);
        } else if (
          labelN === "kelembapantanah" ||
          labelN === "kelembabantanah" ||
          labelN === "kelembapantanahpersen" ||
          labelN === "kelembabantanahpersen"
        ) {
          row.soilMoisture = toNumber(val);
        } else if (labelN === "ph") {
          row.ph = toNumber(val);
        } else if (labelN === "suhuudara") {
          row.temperatureAir = toNumber(val);
        } else if (
          labelN === "kelembapanudara" ||
          labelN === "kelembabanudara" ||
          labelN === "kelembapanudarapersen" ||
          labelN === "kelembabanudarapersen"
        ) {
          row.humidity = toNumber(val);
        } else if (labelN === "flow" || labelN === "flowrate" || labelN === "flowratelmin") {
          row.flowRate = toNumber(val);
        }

        raw[label] = val;
      });

      return { ...row, raw };
    });

    // buang baris kosong
    return out.filter((r) => r.timestamp || Object.values(r).some((v) => v != null && v !== ""));
  } catch (err) {
    console.error("❌ Gagal mengambil data dari spreadsheet:", err);
    return [];
  }
}
