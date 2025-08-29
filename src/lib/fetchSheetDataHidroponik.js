// src/lib/fetchSheetDataHidroponik.js

/**
 * Fetch data khusus dari spreadsheet hidroponik via GViz API.
 * @returns {Promise<Array<Object>>} Array of row objects
 */

const spreadsheetId = "1rL0v_f4yI4cWr6g0uTwHQSqG-ASnI4cnYw0WArDbDxE"; // ID spreadsheet HIDROPONIK
const gid = 0; // atau ganti sesuai tab sheet-mu

export async function fetchSheetDataHidroponik() {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&gid=${gid}`;
  try {
    const response = await fetch(url);
    const text = await response.text();

    const jsonData = JSON.parse(
      text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1)
    );

    const cols = jsonData.table.cols.map((col) => (col.label || '').trim());

    const rows = jsonData.table.rows.map((row) => {
      const obj = {};
      row.c.forEach((cell, idx) => {
        if (cols[idx]) obj[cols[idx]] = cell && cell.v !== undefined && cell.v !== null ? cell.v : '';
      });
      return obj;
    });

    return rows.filter(row => Object.values(row).some(val => val !== ''));
  } catch (err) {
    console.error('❌ Gagal mengambil data dari spreadsheet hidroponik:', err);
    return [];
  }
}
