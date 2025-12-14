// components/reports/FilterPanel.jsx
"use client";
import { useState } from 'react';

export default function FilterPanel({ 
  classes = [], 
  courses = [], 
  onFilter, 
  onReset,
  isFiltering = false,
  showClassFilter = true,
  showCourseFilter = true,
  showDateFilters = true
}) {
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleFilter = () => {
    onFilter({
      classId: selectedClassId,
      courseId: selectedCourseId,
      startDate,
      endDate
    });
  };

  const handleReset = () => {
    setSelectedClassId("");
    setSelectedCourseId("");
    setStartDate("");
    setEndDate("");
    onReset();
  };

  return (
    <div className="filter-section">
      <div className="filter-container">
        {showClassFilter && (
          <div className="filter-group">
            <label>Sınıf:</label>
            <select 
              value={selectedClassId} 
              onChange={(e) => setSelectedClassId(e.target.value)}
            >
              <option value="">Tüm Sınıflar</option>
              {classes.map((cls) => (
                <option key={cls.class_id} value={cls.class_id}>
                  {cls.class_name}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {showCourseFilter && (
          <div className="filter-group">
            <label>Kurs:</label>
            <select 
              value={selectedCourseId} 
              onChange={(e) => setSelectedCourseId(e.target.value)}
            >
              <option value="">Tüm Kurslar</option>
              {courses.map((course) => (
                <option key={course.course_id} value={course.course_id}>
                  {course.course_name}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {showDateFilters && (
          <div className="date-filters-wrapper">
            <div className="date-filters">
              <div className="filter-group">
                <label>Başlangıç Tarihi:</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              
              <div className="filter-group">
                <label>Bitiş Tarihi:</label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
        
        <div className="filter-buttons">
          <button 
            className="filter-btn primary" 
            onClick={handleFilter}
            disabled={isFiltering}
          >
            {isFiltering ? "Filtreleniyor..." : "Filtrele"}
          </button>
          <button 
            className="filter-btn reset" 
            onClick={handleReset}
          >
            Filtreleri Sıfırla
          </button>
        </div>
      </div>

      <style jsx>{`
        .filter-section {
          width: 100%;
          margin-bottom: 30px;
        }
        
        .filter-container {
          display: flex;
          flex-direction: column;
          background-color: #f5f5f5;
          padding: 15px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .date-filters-wrapper {
          display: flex;
          justify-content: center;
          width: 100%;
        }
        
        .date-filters {
          display: flex;
          flex-direction: row;
          gap: 20px;
          margin-bottom: 15px;
          width: 50%;
        }
        
        .filter-group {
          display: flex;
          flex-direction: column;
          margin-bottom: 15px;
          flex: 1;
        }
        
        .filter-group label {
          margin-bottom: 5px;
          font-weight: 500;
          font-size: 14px;
          color: #444;
        }
        
        .filter-group select,
        .filter-group input {
          padding: 8px 12px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 14px;
          width: 100%;
        }
        
        .filter-buttons {
          display: flex;
          gap: 15px;
          justify-content: center;
          margin-top: 10px;
        }
        
        .filter-btn {
          padding: 8px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
          min-width: 120px;
        }
        
        .filter-btn.primary {
          background-color: #0066cc;
          color: white;
        }
        
        .filter-btn.primary:hover {
          background-color: #0052a3;
        }
        
        .filter-btn.primary:disabled {
          background-color: #99c2ff;
          cursor: not-allowed;
        }
        
        .filter-btn.reset {
          background-color: #f0f0f0;
          color: #333;
        }
        
        .filter-btn.reset:hover {
          background-color: #e0e0e0;
        }
        
        @media (max-width: 768px) {
          .date-filters {
            flex-direction: column;
            gap: 15px;
            width: 90%;
          }
          
          .filter-buttons {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}