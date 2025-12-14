// components/reports/ExportButtons.jsx
"use client";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function ExportButtons({ data, fileName, title }) {
  const exportToExcel = () => {
    if (!data || data.length === 0) {
      alert("Dışa aktarılacak veri bulunamadı.");
      return;
    }
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rapor");
    
    XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    if (!data || data.length === 0) {
      alert("Dışa aktarılacak veri bulunamadı.");
      return;
    }
    
    const doc = new jsPDF();
    doc.text(title, 14, 16);
    
    doc.autoTable({
      head: [Object.keys(data[0])],
      body: data.map(item => Object.values(item)),
      startY: 20
    });
    
    doc.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="export-buttons">
      <button className="export-btn" onClick={exportToExcel}>
        Excel Olarak İndir
      </button>
      <button className="export-btn" onClick={exportToPDF}>
        PDF Olarak İndir
      </button>
    </div>
  );
}