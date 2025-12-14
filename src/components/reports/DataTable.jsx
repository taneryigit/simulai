// components/reports/DataTable.jsx
"use client";

export default function DataTable({ data, columns }) {
  if (!data || data.length === 0) {
    return <div className="no-data">Veri bulunamadı.</div>;
  }

  return (
    <div className="responsive-table">
      <table>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th key={index}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column, colIndex) => (
                <td key={colIndex}>
                  {column.render ? column.render(row) : row[column.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}