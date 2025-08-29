// src/lib/fetchSheetData.js

/**
 * Fetch data from a public Google Sheets via GViz API.
 * (Script ini sudah diisi spreadsheetId dan gid sesuai sheet kamu)
 * 
 * @returns {Promise<Array<Object>>} Array of row objects
 */

const spreadsheetId = "1Y_LrC7kzvRlMPthtowIohP3ubRVGYDLoZEvjR2YPt1g"; // Ganti jika sheet kamu berubah
const gid = 0; // Sheet1, ganti jika sheet lain

export async function fetchSheetData() {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&gid=${gid}`;
  try {
    const response = await fetch(url);
    const text = await response.text();

    // Parsing: hanya ambil bagian JSON
    const jsonData = JSON.parse(
      text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1)
    );

    // Ambil header kolom (hilangkan spasi depan-belakang)
    const cols = jsonData.table.cols.map((col) => (col.label || '').trim());

    // Ubah setiap baris ke object (skip kolom tanpa label)
    const rows = jsonData.table.rows.map((row) => {
      const obj = {};
      row.c.forEach((cell, idx) => {
        if (cols[idx]) obj[cols[idx]] = cell && cell.v !== undefined && cell.v !== null ? cell.v : '';
      });
      return obj;
    });

    // Filter baris kosong
    return rows.filter(row => Object.values(row).some(val => val !== ''));
  } catch (err) {
    console.error('❌ Gagal mengambil data dari spreadsheet:', err);
    return [];
  }
}
