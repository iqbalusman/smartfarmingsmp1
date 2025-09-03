// src/lib/fetchSheetDataHidroponik.js

const SPREADSHEET_ID = "1rL0v_f4yI4cWr6g0uTwHQSqG-ASnI4cnYw0WArDbDxE";

// Normalisasi label: huruf kecil, samakan karakter mirip (1->l, 0->o), buang non-alnum
const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/1/g, "l")
    .replace(/0/g, "o")
    .replace(/[^a-z0-9]/g, "");

function findIndex(labels, candidates) {
  const want = candidates.map(norm);
  for (let i = 0; i < labels.length; i++) if (want.includes(norm(labels[i]))) return i;
  return -1;
}

export async function fetchSheetDataHidroponik(sheetName = "Sheet1") {
  const url =
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq` +
    `?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;

  try {
    const resp = await fetch(url);
    const text = await resp.text();
    const json = JSON.parse(text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1));

    const cols = json.table.cols || [];
    const labels = cols.map((c) => (c.label || "").trim());

    // Ambil value mentah per baris; pakai v ?? f (kalau v null, pakai formatted string)
    const rawRows = (json.table.rows || []).map((row) =>
      (row.c || []).map((cell) => {
        if (!cell) return "";
        const v = cell.v ?? "";
        const f = cell.f ?? "";
        return v !== "" ? v : f;
      })
    );

    // 1) Index via label (Flow juga dicocokkan ke F1owL/M")
    const idx = {
      ts:   findIndex(labels, ["timestamp (utc)", "timestamp_utc", "timestamp"]),
      wl:   findIndex(labels, ["waktu (wita)", "waktu (lokal)", "waktulokal", "waktu"]),
      ph:   findIndex(labels, ["pH", "ph"]),
      flow: findIndex(labels, ["flowl/m", 'flowl/m"', "f1owl/m", 'f1owl/m"', "flowrate", "flow", "lpm"]),
      suhu: -1, // kita tentukan di langkah 2
    };

    // 2) "Kunci" pola header sheet kamu: pH diikuti Suhu di kolom kanan → suhu = ph + 1
    if (idx.ph >= 0 && idx.ph + 1 < labels.length) {
      idx.suhu = idx.ph + 1;
    }

    // 3) Fallback kalau pH tidak ketemu: cari label "Suhu"
    if (idx.suhu < 0) {
      const sIdx = findIndex(labels, ["suhu", "suhu (°c)", "temperature", "temp"]);
      if (sIdx >= 0) idx.suhu = sIdx;
    }

    // 4) Fallback terakhir: kalau ada 5 kolom standar dan ts/wl/ph/flow ketemu, ambil kolom sisa jadi Suhu
    if (idx.suhu < 0 && labels.length >= 5) {
      const used = new Set([idx.ts, idx.wl, idx.ph, idx.flow].filter((i) => i >= 0));
      for (let i = 0; i < labels.length; i++) {
        if (!used.has(i)) { idx.suhu = i; break; }
      }
    }

    // Bentuk output kunci baku
    const out = rawRows.map((vals) => {
      const timestamp =
        (idx.ts  >= 0 ? vals[idx.ts]  : "") ||
        (idx.wl  >= 0 ? vals[idx.wl]  : "");

      return {
        timestamp,
        pH:       idx.ph   >= 0 ? vals[idx.ph]   : "",
        suhu:     idx.suhu >= 0 ? vals[idx.suhu] : "",   // ← Suhu pasti terisi dengan mapping di atas
        flowRate: idx.flow >= 0 ? vals[idx.flow] : "",
      };
    });

    // Buang baris benar-benar kosong
    return out.filter((r) => Object.values(r).some((v) => v !== ""));
  } catch (err) {
    console.error("❌ Gagal mengambil data dari spreadsheet hidroponik:", err);
    return [];
  }
}
