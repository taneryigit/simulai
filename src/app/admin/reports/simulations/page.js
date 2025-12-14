// app/admin/reports/simulations/page.js
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function SimulationsReportPage() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportsData, setReportsData] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState("simulationPerformance");
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [filters, setFilters] = useState({
    classId: "",
    courseId: "",
    startDate: "",
    endDate: ""
  });
  const [isFiltering, setIsFiltering] = useState(false);

  // Format date helper function
  const formatDate = (dateString) => {
    if (!dateString) return "Belirtilmemiş";
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
  };

  // Fetch report data function
  const fetchReportData = (appliedFilters = {}) => {
    setLoading(true);
    const token = localStorage.getItem("token");
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    if (appliedFilters.classId) queryParams.append('classId', appliedFilters.classId);
    if (appliedFilters.courseId) queryParams.append('courseId', appliedFilters.courseId);
    if (appliedFilters.startDate) queryParams.append('startDate', appliedFilters.startDate);
    if (appliedFilters.endDate) queryParams.append('endDate', appliedFilters.endDate);
    
    fetch(`/api/admin/reports/simulations?${queryParams.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch simulation reports data");
        return res.json();
      })
      .then((data) => {
        setReportsData(data);
        setLoading(false);
        setIsFiltering(false);
      })
      .catch((err) => {
        console.error(`Error fetching simulation report data:`, err);
        setLoading(false);
        setIsFiltering(false);
      });
  };

  // Fetch filter options (classes and courses)
  const fetchFilterOptions = () => {
    const token = localStorage.getItem("token");
    
    // Fetch classes
    fetch(`/api/admin/reports/filter-options?type=classes`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setClasses(data))
      .catch((err) => console.error("Error fetching classes:", err));
    
    // Fetch courses
    fetch(`/api/admin/reports/filter-options?type=courses`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setCourses(data))
      .catch((err) => console.error("Error fetching courses:", err));
  };

  // Filter handler
  const handleFilter = () => {
    setIsFiltering(true);
    fetchReportData(filters);
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilters({
      classId: "",
      courseId: "",
      startDate: "",
      endDate: ""
    });
    fetchReportData({});
  };

  // Handle input changes for filters
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Export to Excel function
  const exportToExcel = (data, fileName) => {
    if (!data || data.length === 0) {
      alert("Dışa aktarılacak veri bulunamadı.");
      return;
    }
    
    // This would use a library like xlsx in a real implementation
    alert(`Excel export for ${fileName} would happen here`);
  };

  // Export to PDF function
  const exportToPDF = (data, title) => {
    if (!data || data.length === 0) {
      alert("Dışa aktarılacak veri bulunamadı.");
      return;
    }
    
    // This would use a library like jsPDF in a real implementation
    alert(`PDF export for ${title} would happen here`);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/admin/login");
      return;
    }

    // Fetch user data
    fetch("/api/admin/manage", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        setUserData(data);
        
        // Fetch filter options and initial report data
        fetchFilterOptions();
        fetchReportData({});
      })
      .catch((err) => {
        console.error("Error fetching data:", err);
        router.push("/admin/login");
      });
  }, [router]);

  // Handler for logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/admin/login");
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Veriler yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header Banner */}
      <div className="header-banner">
        <div className="left">
          {userData?.greeting || "Merhaba"} {userData?.firstname} {userData?.lastname}
        </div>
        <div className="header-links">
          <Link href="/admin/manage">Admin Anasayfa</Link>
        
          <a href="#" onClick={handleLogout}>Çıkış</a>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bottom-bar">
        {/* Company Logo */}
        <div className="company-logo">
      
        </div>

        {/* Reports Section */}
        <div className="reports-section">
          <h1 className="title">Simülasyon Raporları</h1>
          
          {/* Filter Panel */}
          <div className="filter-section">
            <div className="filter-container">
              <div className="filter-group">
                <label>Sınıf:</label>
                <select 
                  name="classId"
                  value={filters.classId} 
                  onChange={handleFilterChange}
                >
                  <option value="">Tüm Sınıflar</option>
                  {classes.map((cls) => (
                    <option key={cls.class_id} value={cls.class_id}>
                      {cls.class_name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="filter-group">
                <label>Kurs:</label>
                <select 
                  name="courseId"
                  value={filters.courseId} 
                  onChange={handleFilterChange}
                >
                  <option value="">Tüm Kurslar</option>
                  {courses.map((course) => (
                    <option key={course.course_id} value={course.course_id}>
                      {course.course_name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="filter-group">
                <label>Başlangıç Tarihi:</label>
                <input 
                  type="date" 
                  name="startDate"
                  value={filters.startDate} 
                  onChange={handleFilterChange}
                />
              </div>
              
              <div className="filter-group">
                <label>Bitiş Tarihi:</label>
                <input 
                  type="date" 
                  name="endDate"
                  value={filters.endDate} 
                  onChange={handleFilterChange}
                />
              </div>
              
              <div className="filter-buttons">
                <button 
                  className="filter-btn" 
                  onClick={handleFilter}
                  disabled={isFiltering}
                >
                  {isFiltering ? "Filtreleniyor..." : "Filtrele"}
                </button>
                <button 
                  className="filter-btn reset" 
                  onClick={handleResetFilters}
                >
                  Filtreleri Sıfırla
                </button>
              </div>
            </div>
            
            {(filters.classId || filters.courseId || filters.startDate || filters.endDate) && (
              <div className="filter-info">
                Uygulanan Filtreler: 
                {filters.classId && ` Sınıf: ${classes.find(c => c.class_id == filters.classId)?.class_name || filters.classId}`}
                {filters.courseId && ` Kurs: ${courses.find(c => c.course_id == filters.courseId)?.course_name || filters.courseId}`}
                {(filters.startDate || filters.endDate) && ` Tarih: ${filters.startDate ? formatDate(filters.startDate) : "Başlangıç"} - ${filters.endDate ? formatDate(filters.endDate) : "Günümüz"}`}
              </div>
            )}
          </div>
          
          {/* Sub Tabs for Simulation Reports */}
          <div className="sub-tabs">
            <button 
              className={`sub-tab ${activeSubTab === "simulationPerformance" ? "active" : ""}`}
              onClick={() => setActiveSubTab("simulationPerformance")}
            >
              Simülasyon Performans Analizi
            </button>
            <button 
              className={`sub-tab ${activeSubTab === "skillPerformance" ? "active" : ""}`}
              onClick={() => setActiveSubTab("skillPerformance")}
            >
              Beceri Performans Analizi
            </button>
            <button 
              className={`sub-tab ${activeSubTab === "simulationDetail" ? "active" : ""}`}
              onClick={() => setActiveSubTab("simulationDetail")}
            >
              Simülasyon Detayları
            </button>
          </div>
          
          {/* Render active sub tab content */}
          {activeSubTab === "simulationPerformance" && reportsData?.simulationPerformance && (
            <div className="chart-container">
              <div className="export-buttons">
                <button className="export-btn" onClick={() => exportToExcel(reportsData.simulationPerformance, 'simulasyon_performans_analizi')}>
                  Excel Olarak İndir
                </button>
                <button className="export-btn" onClick={() => exportToPDF(reportsData.simulationPerformance, 'Simülasyon Performans Analizi')}>
                  PDF Olarak İndir
                </button>
              </div>
              
              <h3>Simülasyon Bazında Performans Analizi</h3>
              {reportsData.simulationPerformance && reportsData.simulationPerformance.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={reportsData.simulationPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="simulasyon_showname" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="ortalamaPuan" fill="#8884d8" name="Ortalama Puan" />
                      <Bar dataKey="tamamlamaSayisi" fill="#82ca9d" name="Tamamlama Sayısı" />
                    </BarChart>
                  </ResponsiveContainer>
                  
                  <div className="responsive-table mt-4">
                    <table>
                      <thead>
                        <tr>
                          <th>Simülasyon</th>
                          <th>Tamamlama Sayısı</th>
                          <th>Ortalama Puan</th>
                          <th>Standart Sapma</th>
                          <th>Minimum Puan</th>
                          <th>Maksimum Puan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportsData.simulationPerformance.map((sim, index) => (
                          <tr key={index}>
                            <td>{sim.simulasyon_showname || sim.simulasyon_name}</td>
                            <td>{sim.tamamlamaSayisi}</td>
                            <td>{sim.ortalamaPuan?.toFixed(2) || "Veri yok"}</td>
                            <td>{sim.puanStandartSapmasi?.toFixed(2) || "Veri yok"}</td>
                            <td>{sim.minimumPuan || "Veri yok"}</td>
                            <td>{sim.maksimumPuan || "Veri yok"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="no-data">Simülasyon performans verisi bulunamadı.</div>
              )}
            </div>
          )}
          
          {activeSubTab === "skillPerformance" && reportsData?.skillPerformance && (
            <div className="chart-container">
              <div className="export-buttons">
                <button className="export-btn" onClick={() => exportToExcel(reportsData.skillPerformance, 'beceri_performans_analizi')}>
                  Excel Olarak İndir
                </button>
                <button className="export-btn" onClick={() => exportToPDF(reportsData.skillPerformance, 'Beceri Performans Analizi')}>
                  PDF Olarak İndir
                </button>
              </div>
              
              <h3>Anahtar Beceri Performans Analizi</h3>
              {reportsData.skillPerformance && reportsData.skillPerformance.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={reportsData.skillPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="beceriAdi" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="ortalamaPuan" stroke="#8884d8" name="Ortalama Puan" />
                      <Line type="monotone" dataKey="doldurulmaPuani" stroke="#82ca9d" name="Doldurulma Oranı (%)" />
                    </LineChart>
                  </ResponsiveContainer>
                  
                  <div className="responsive-table mt-4">
                    <table>
                      <thead>
                        <tr>
                          <th>Beceri Adı</th>
                          <th>Toplam Değerlendirme</th>
                          <th>Ortalama Puan</th>
                          <th>Standart Sapma</th>
                          <th>Doldurulma Oranı (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportsData.skillPerformance.map((skill, index) => (
                          <tr key={index}>
                            <td>{skill.beceriAdi}</td>
                            <td>{skill.toplamDegerlendirme}</td>
                            <td>{skill.ortalamaPuan?.toFixed(2) || "Veri yok"}</td>
                            <td>{skill.standartSapma?.toFixed(2) || "Veri yok"}</td>
                            <td>{skill.doldurulmaPuani?.toFixed(2) || "Veri yok"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="no-data">Beceri performans verisi bulunamadı.</div>
              )}
            </div>
          )}
          
          {activeSubTab === "simulationDetail" && reportsData?.simulationSkillAnalysis && (
            <div className="chart-container">
              <div className="export-buttons">
                <button className="export-btn" onClick={() => exportToExcel(reportsData.simulationSkillAnalysis, 'simulasyon_beceri_analizi')}>
                  Excel Olarak İndir
                </button>
                <button className="export-btn" onClick={() => exportToPDF(reportsData.simulationSkillAnalysis, 'Simülasyon Beceri Analizi')}>
                  PDF Olarak İndir
                </button>
              </div>
              
              <h3>Simülasyon Beceri Analizi</h3>
              {reportsData.simulationSkillAnalysis && reportsData.simulationSkillAnalysis.length > 0 ? (
                <div className="responsive-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Simülasyon</th>
                        <th>Toplam Sayı</th>
                        <th>Toplam Beceri Sayısı</th>
                        <th>Ortalama Toplam Puan</th>
                        <th>Beceri 1</th>
                        <th>Beceri 2</th>
                        <th>Beceri 3</th>
                        <th>Beceri 4</th>
                        <th>Beceri 5</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportsData.simulationSkillAnalysis.map((sim, index) => (
                        <tr key={index}>
                          <td>{sim.simulasyon_showname || sim.simulasyon_name}</td>
                          <td>{sim.simulasyonSayisi}</td>
                          <td>{sim.toplamBeceriSayisi}</td>
                          <td>{sim.avgTotalPuan?.toFixed(2) || "Veri yok"}</td>
                          <td>{sim.avgPuan1?.toFixed(2) || "-"}</td>
                          <td>{sim.avgPuan2?.toFixed(2) || "-"}</td>
                          <td>{sim.avgPuan3?.toFixed(2) || "-"}</td>
                          <td>{sim.avgPuan4?.toFixed(2) || "-"}</td>
                          <td>{sim.avgPuan5?.toFixed(2) || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="no-data">Simülasyon beceri analizi verisi bulunamadı.</div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        /* Same CSS styling as in the courses page */
        .page-container {
          margin: 0;
          font-family: Arial, sans-serif;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          overflow-y: auto;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100vh;
        }

        .loader {
          border: 5px solid #f3f3f3;
          border-top: 5px solid #3498db;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 2s linear infinite;
          margin-bottom: 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .header-banner {
          display: flex;
          justify-content: flex-start;
          align-items: center;
          height: 20px;
          width: 100%;
          background-color: rgba(0, 0, 0, 0.6);
          color: white;
          position: fixed;
          top: 0;
          z-index: 100;
          padding: 0 10px;
          font-size: 13px;
        }

        .header-links {
          margin-left: auto;
          display: flex;
          gap: 20px;
          margin-right: 50px; 
        }

        .header-banner a {
          color: #FFD700;
          text-decoration: none;
          font-size: 13px;
        }

        .header-banner a:hover {
          color: #FFA500;
        }

        .bottom-bar {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 10px 20px;
          position: relative;
          background-image: url('/images/background/logoleft.png'), url('/images/background/logoright.png');
          background-position: left bottom, right bottom;
          background-repeat: no-repeat;
          background-size: 125px 165px, 125px 165px;
          min-height: calc(100vh - 20px);
          margin-top: 20px;
          overflow-y: auto;
        }

        .company-logo {
          position: absolute;
          top: 30px;
          left: 20px;
          width: 80px;
          height: 160px;
          overflow: hidden;
          z-index: 1;
        }

        .reports-section {
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 30px 20px;
          margin-top: 60px;
          overflow-y: auto;
        }

        .title {
          text-align: center;
          margin-bottom: 30px;
          width: 100%;
        }

        .filter-section {
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          width: 100%;
        }
        
        .filter-container {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          align-items: flex-end;
        }
        
        .filter-group {
          display: flex;
          flex-direction: column;
          min-width: 200px;
        }
        
        .filter-group label {
          font-size: 14px;
          margin-bottom: 5px;
          color: #555;
        }
        
        .filter-group select,
        .filter-group input {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        
        .filter-buttons {
          display: flex;
          gap: 10px;
        }
        
        .filter-btn {
          padding: 8px 16px;
          background-color: #0066cc;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.2s;
          font-weight: 500;
        }
        
        .filter-btn:hover {
          background-color: #0056b3;
        }
        
        .filter-btn.reset {
          background-color: #6c757d;
        }
        
        .filter-btn.reset:hover {
          background-color: #5a6268;
        }
        
        .filter-btn:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }
        
        .filter-info {
          margin-top: 10px;
          font-size: 14px;
          color: #666;
        }

        .sub-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 20px;
          border-bottom: 1px solid #eee;
          padding-bottom: 10px;
          width: 100%;
        }
        
        .sub-tab {
          padding: 8px 16px;
          background-color: #f1f1f1;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.3s;
          font-size: 14px;
        }
        
        .sub-tab.active {
          background-color: #0066cc;
          color: white;
        }

        .chart-container {
          background-color: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          width: 100%;
          margin-bottom: 20px;
        }

        .chart-container h3 {
          margin-top: 0;
          margin-bottom: 20px;
          font-size: 18px;
          color: #333;
        }

        .export-buttons {
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
          justify-content: flex-end;
        }
        
        .export-btn {
          padding: 6px 12px;
          background-color: #28a745;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
        }
        
        .export-btn:hover {
          background-color: #218838;
        }

        .responsive-table {
          width: 100%;
          overflow-x: auto;
          max-height: 600px;
          overflow-y: auto;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        
        table th, table td {
          padding: 10px;
          border: 1px solid #eee;
          text-align: left;
        }
        
        table th {
          background-color: #f5f5f5;
          font-weight: 600;
        }
        
        table tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        
        table tr:hover {
          background-color: #f0f0f0;
        }

        .no-data {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 300px;
          color: #999;
          font-style: italic;
        }

        .mt-4 {
          margin-top: 1rem;
        }
      `}</style>
    </div>
  );
}