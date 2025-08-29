import useSpreadsheet from "../hooks/useSpreadsheet";

export default function SpreadsheetTable() {
  const { header, data, loading } = useSpreadsheet();

  if (loading) return <div>Loading data...</div>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border">
        <thead>
          <tr>
            {header.map((col) => (
              <th key={col} className="border px-2 py-1 bg-gray-200">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx}>
              {header.map((col) => (
                <td key={col} className="border px-2 py-1">{row[col]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
