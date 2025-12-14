// app/admin/reports/user/page.js
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
// Import autoTable differently for better compatibility

export default function SingleUserReportPage() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [userReportData, setUserReportData] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState("userPerformance");
  const [searchError, setSearchError] = useState(null);
  const [selectedSimulation, setSelectedSimulation] = useState(null);

  useEffect(() => {
    if (userReportData?.growthTrend?.timeline?.length > 0) {
      // Get unique simulation names and set the first one as default
      const uniqueSimulations = Array.from(new Set(userReportData.growthTrend.timeline.map(item => item.simulasyon_name)));
      if (uniqueSimulations.length > 0) {
        setSelectedSimulation(uniqueSimulations[0]);
      }
    }
  }, [userReportData]);

  // User search fields
  const [searchParams, setSearchParams] = useState({
    searchTerm: "",
    startDate: "",
    endDate: ""
  });

  // Format date helper function
  const formatDate = (dateString) => {
    if (!dateString) return "Belirtilmemiş";
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
  };

  // Handle search input changes
  const handleSearchChange = (e) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear any previous errors when changing search parameters
    setSearchError(null);
  };

  // Search for user function
  const handleSearchUser = () => {
    // Validate search term
    if (!searchParams.searchTerm.trim()) {
      alert("Lütfen arama yapmak için bir isim veya e-posta girin.");
      return;
    }
    
    setSearchLoading(true);
    setSearchError(null);
    const token = localStorage.getItem("token");
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('searchTerm', searchParams.searchTerm);
    if (searchParams.startDate) queryParams.append('startDate', searchParams.startDate);
    if (searchParams.endDate) queryParams.append('endDate', searchParams.endDate);
    
    fetch(`/api/admin/reports/users?${queryParams.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Kullanıcı bulunamadı");
          }
          throw new Error("Kullanıcı rapor verileri alınamadı");
        }
        return res.json();
      })
      .then((data) => {
        console.log("API response:", data);
        setUserReportData(data);
        setSelectedUser(data.userInfo);
        setSearchLoading(false);
      })
      .catch((err) => {
        console.error(`Error fetching user report data:`, err);
        setSearchError(err.message || "Kullanıcı verileri alınırken bir hata oluştu");
        setUserReportData(null);
        setSelectedUser(null);
        setSearchLoading(false);
      });
  };

  // Reset search
  const handleResetSearch = () => {
    setSearchParams({
      searchTerm: "",
      startDate: "",
      endDate: ""
    });
    setUserReportData(null);
    setSelectedUser(null);
    setSearchError(null);
    setSelectedSimulation(null);
  };

  // Working Excel Export Function
  const exportToExcel = (userReportData, fileName) => {
    if (!userReportData || !userReportData.userInfo) {
      alert("Dışa aktarılacak veri bulunamadı.");
      return;
    }

    try {
      // Create a new workbook
      const wb = XLSX.utils.book_new();

      // Sheet 1: User Information
      const userInfoData = [
        ['Kullanıcı Bilgileri', ''],
        ['Ad Soyad', `${userReportData.userInfo.firstname} ${userReportData.userInfo.lastname}`],
        ['E-posta', userReportData.userInfo.email],
        ['Bölüm', userReportData.userInfo.bolum || 'Belirtilmemiş'],
        ['Takım', userReportData.userInfo.takim || 'Belirtilmemiş'],
        ['Şirket', userReportData.userInfo.companyname || 'Belirtilmemiş'],
        ['Son Giriş', userReportData.userInfo.last_login ? formatDate(userReportData.userInfo.last_login) : 'Belirtilmemiş'],
        ['', ''],
        ['Rapor Tarihi', new Date().toLocaleDateString('tr-TR')]
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(userInfoData);
      XLSX.utils.book_append_sheet(wb, ws1, 'Kullanıcı Bilgileri');

      // Sheet 2: Performance Summary
      const performanceData = [
        ['Performans Özeti', ''],
        ['Tamamlanan Simülasyon', userReportData.performanceSummary?.completedSimulations || 0],
        ['Ortalama Puan', userReportData.performanceSummary?.averageScore?.toFixed(1) || 0],
        ['En Yüksek Puan', userReportData.performanceSummary?.highestScore || 0],
        ['Toplam Deneme', userReportData.performanceSummary?.totalAttempts || 0],
        ['', ''],
        ['Simülasyon Adı', 'Puan']
      ];

      // Add score distribution data
      if (userReportData.performanceSummary?.scoreDistribution) {
        userReportData.performanceSummary.scoreDistribution.forEach(item => {
          performanceData.push([item.simulationName, item.score]);
        });
      }

      const ws2 = XLSX.utils.aoa_to_sheet(performanceData);
      XLSX.utils.book_append_sheet(wb, ws2, 'Performans Özeti');

      // Sheet 3: Simulation Progress
      const simulationData = [
        ['Simülasyon İlerlemesi', '', '', '', ''],
        ['Simülasyon Adı', 'Tamamlanma Tarihi', 'Puan', 'Deneme Sayısı', 'Durum']
      ];

      if (userReportData.simulationProgress && userReportData.simulationProgress.length > 0) {
        userReportData.simulationProgress.forEach(sim => {
          simulationData.push([
            sim.simulationName,
            sim.completionDate ? formatDate(sim.completionDate) : 'Tamamlanmadı',
            sim.score || 'N/A',
            sim.attempts,
            sim.status
          ]);
        });
      } else {
        simulationData.push(['Veri bulunamadı', '', '', '', '']);
      }

      const ws3 = XLSX.utils.aoa_to_sheet(simulationData);
      XLSX.utils.book_append_sheet(wb, ws3, 'Simülasyon İlerlemesi');

      // Sheet 4: Skill Analysis
      const skillData = [
        ['Beceri Analizi', '', ''],
        ['Beceri', 'Kullanıcı Puanı', 'Ortalama Puan']
      ];

      if (userReportData.skillAnalysis?.skills && userReportData.skillAnalysis.skills.length > 0) {
        userReportData.skillAnalysis.skills.forEach(skill => {
          skillData.push([skill.skill, skill.score, skill.average]);
        });
        skillData.push(['', '', '']);
        skillData.push(['Notlar:', '', '']);
        skillData.push([userReportData.skillAnalysis.notes || 'Henüz yeterli veri bulunmamaktadır.', '', '']);
      } else {
        skillData.push(['Henüz yeterli veri bulunmamaktadır.', '', '']);
      }

      const ws4 = XLSX.utils.aoa_to_sheet(skillData);
      XLSX.utils.book_append_sheet(wb, ws4, 'Beceri Analizi');

      // Sheet 5: Growth Trend
      const growthData = [
        ['Gelişim Trendi', ''],
        ['İlk Ölçüm Puanı', userReportData.growthTrend?.firstScore || 'N/A'],
        ['Son Ölçüm Puanı', userReportData.growthTrend?.lastScore || 'N/A'],
        ['Gelişim Oranı (%)', userReportData.growthTrend?.growthRate ? userReportData.growthTrend.growthRate.toFixed(2) : 'N/A'],
        ['Toplam Gelişim Süresi (gün)', userReportData.growthTrend?.totalDays || 'N/A'],
        ['', ''],
        ['Tarih', 'Puan']
      ];

      if (userReportData.growthTrend?.timeline && userReportData.growthTrend.timeline.length > 0) {
        userReportData.growthTrend.timeline.forEach(item => {
          growthData.push([item.date, item.score]);
        });
        growthData.push(['', '']);
        growthData.push(['Özet:', '']);
        growthData.push([userReportData.growthTrend.summary || 'Henüz gelişim verisi bulunmamaktadır.', '']);
      } else {
        growthData.push(['Henüz gelişim verisi bulunmamaktadır.', '']);
      }

      const ws5 = XLSX.utils.aoa_to_sheet(growthData);
      XLSX.utils.book_append_sheet(wb, ws5, 'Gelişim Trendi');

      // Generate and download the file
      const cleanFileName = fileName.replace(/[^a-zA-Z0-9_çÇğĞıİöÖşŞüÜ]/g, '_');
      XLSX.writeFile(wb, `${cleanFileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);

      console.log('Excel file exported successfully');
    } catch (error) {
      console.error('Excel export error:', error);
      alert('Excel dosyası oluşturulurken bir hata oluştu.');
    }
  };

  // Working PDF Export Function (Fixed autoTable issue)
  const exportToPDF = (userReportData, title) => {
    if (!userReportData || !userReportData.userInfo) {
      alert("Dışa aktarılacak veri bulunamadı.");
      return;
    }

    try {
      // Create new PDF document
      const doc = new jsPDF();
      
      // Set fonts
      doc.setFont('helvetica');
      
      // Title
      doc.setFontSize(20);
      doc.text(title, 20, 20);
      
      // Date
      doc.setFontSize(10);
      doc.text(`Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, 20, 30);
      
      let yPosition = 45;
      
      // User Information Section
      doc.setFontSize(14);
      doc.text('Kullanıcı Bilgileri', 20, yPosition);
      yPosition += 10;
      
      doc.setFontSize(10);
      const userInfo = [
        ['Ad Soyad:', `${userReportData.userInfo.firstname} ${userReportData.userInfo.lastname}`],
        ['E-posta:', userReportData.userInfo.email],
        ['Bölüm:', userReportData.userInfo.bolum || 'Belirtilmemiş'],
        ['Takım:', userReportData.userInfo.takim || 'Belirtilmemiş'],
        ['Şirket:', userReportData.userInfo.companyname || 'Belirtilmemiş'],
        ['Son Giriş:', userReportData.userInfo.last_login ? formatDate(userReportData.userInfo.last_login) : 'Belirtilmemiş']
      ];

      userInfo.forEach(([label, value]) => {
        doc.text(`${label} ${value}`, 25, yPosition);
        yPosition += 6;
      });

      yPosition += 10;

      // Performance Summary Section
      doc.setFontSize(14);
      doc.text('Performans Özeti', 20, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      const perfSummary = [
        ['Tamamlanan Simülasyon:', userReportData.performanceSummary?.completedSimulations || 0],
        ['Ortalama Puan:', userReportData.performanceSummary?.averageScore?.toFixed(1) || 0],
        ['En Yüksek Puan:', userReportData.performanceSummary?.highestScore || 0],
        ['Toplam Deneme:', userReportData.performanceSummary?.totalAttempts || 0]
      ];

      perfSummary.forEach(([label, value]) => {
        doc.text(`${label} ${value}`, 25, yPosition);
        yPosition += 6;
      });

      yPosition += 15;

      // Check if autoTable is available
      if (doc.autoTable && typeof doc.autoTable === 'function') {
        // Use autoTable for better formatting
        
        // Simulation Progress Table
        if (userReportData.simulationProgress && userReportData.simulationProgress.length > 0) {
          doc.setFontSize(14);
          doc.text('Simülasyon İlerlemesi', 20, yPosition);
          yPosition += 10;

          const tableData = userReportData.simulationProgress.map(sim => [
            sim.simulationName,
            sim.completionDate ? formatDate(sim.completionDate) : 'Tamamlanmadı',
            sim.score?.toString() || 'N/A',
            sim.attempts?.toString() || 'N/A',
            sim.status
          ]);

          doc.autoTable({
            startY: yPosition,
            head: [['Simülasyon Adı', 'Tamamlanma Tarihi', 'Puan', 'Deneme', 'Durum']],
            body: tableData,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [66, 139, 202] }
          });

          yPosition = doc.lastAutoTable.finalY + 15;
        }

        // Check if we need a new page
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        // Skill Analysis Section
        if (userReportData.skillAnalysis?.skills && userReportData.skillAnalysis.skills.length > 0) {
          doc.setFontSize(14);
          doc.text('Beceri Analizi', 20, yPosition);
          yPosition += 10;

          const skillTableData = userReportData.skillAnalysis.skills.map(skill => [
            skill.skill,
            skill.score?.toString() || '0',
            skill.average?.toString() || '0'
          ]);

          doc.autoTable({
            startY: yPosition,
            head: [['Beceri', 'Kullanıcı Puanı', 'Ortalama Puan']],
            body: skillTableData,
            theme: 'grid',
            styles: { fontSize: 9 },
            headStyles: { fillColor: [40, 167, 69] }
          });

          yPosition = doc.lastAutoTable.finalY + 10;

          // Add skill notes
          if (userReportData.skillAnalysis.notes) {
            doc.setFontSize(10);
            doc.text('Değerlendirme Notları:', 20, yPosition);
            yPosition += 6;
            
            const splitText = doc.splitTextToSize(userReportData.skillAnalysis.notes, 170);
            doc.text(splitText, 20, yPosition);
            yPosition += splitText.length * 5;
          }
        }
      } else {
        // Fallback: Manual table creation without autoTable
        console.log('autoTable not available, using manual table creation');
        
        // Simulation Progress - Manual Table
        if (userReportData.simulationProgress && userReportData.simulationProgress.length > 0) {
          doc.setFontSize(14);
          doc.text('Simülasyon İlerlemesi', 20, yPosition);
          yPosition += 15;

          // Table headers
          doc.setFontSize(9);
          doc.text('Simülasyon Adı', 25, yPosition);
          doc.text('Tarih', 80, yPosition);
          doc.text('Puan', 120, yPosition);
          doc.text('Deneme', 140, yPosition);
          doc.text('Durum', 165, yPosition);
          yPosition += 8;

          // Draw line under headers
          doc.line(20, yPosition - 2, 190, yPosition - 2);

          // Table data
          userReportData.simulationProgress.forEach(sim => {
            if (yPosition > 270) {
              doc.addPage();
              yPosition = 20;
            }
            
            doc.text(sim.simulationName.substring(0, 25), 25, yPosition);
            doc.text(sim.completionDate ? formatDate(sim.completionDate) : 'N/A', 80, yPosition);
            doc.text((sim.score || 'N/A').toString(), 120, yPosition);
            doc.text((sim.attempts || 'N/A').toString(), 140, yPosition);
            doc.text(sim.status.substring(0, 10), 165, yPosition);
            yPosition += 6;
          });

          yPosition += 10;
        }

        // Skill Analysis - Manual Table
        if (userReportData.skillAnalysis?.skills && userReportData.skillAnalysis.skills.length > 0) {
          if (yPosition > 230) {
            doc.addPage();
            yPosition = 20;
          }

          doc.setFontSize(14);
          doc.text('Beceri Analizi', 20, yPosition);
          yPosition += 15;

          // Table headers
          doc.setFontSize(9);
          doc.text('Beceri', 25, yPosition);
          doc.text('Kullanıcı Puanı', 100, yPosition);
          doc.text('Ortalama Puan', 150, yPosition);
          yPosition += 8;

          // Draw line under headers
          doc.line(20, yPosition - 2, 190, yPosition - 2);

          // Table data
          userReportData.skillAnalysis.skills.forEach(skill => {
            if (yPosition > 270) {
              doc.addPage();
              yPosition = 20;
            }
            
            doc.text(skill.skill, 25, yPosition);
            doc.text((skill.score || 0).toString(), 100, yPosition);
            doc.text((skill.average || 0).toString(), 150, yPosition);
            yPosition += 6;
          });

          yPosition += 10;

          // Add skill notes
          if (userReportData.skillAnalysis.notes) {
            doc.setFontSize(10);
            doc.text('Değerlendirme Notları:', 20, yPosition);
            yPosition += 6;
            
            const splitText = doc.splitTextToSize(userReportData.skillAnalysis.notes, 170);
            doc.text(splitText, 20, yPosition);
            yPosition += splitText.length * 5;
          }
        }
      }

      // Growth Trend Section
      if (userReportData.growthTrend && (userReportData.growthTrend.firstScore || userReportData.growthTrend.timeline?.length > 0)) {
        // Check if we need a new page
        if (yPosition > 220) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.text('Gelişim Trendi', 20, yPosition);
        yPosition += 10;

        doc.setFontSize(10);
        const growthInfo = [
          ['İlk Ölçüm Puanı:', userReportData.growthTrend.firstScore || 'N/A'],
          ['Son Ölçüm Puanı:', userReportData.growthTrend.lastScore || 'N/A'],
          ['Gelişim Oranı (%):', userReportData.growthTrend.growthRate ? userReportData.growthTrend.growthRate.toFixed(2) : 'N/A'],
          ['Toplam Gelişim Süresi (gün):', userReportData.growthTrend.totalDays || 'N/A']
        ];

        growthInfo.forEach(([label, value]) => {
          doc.text(`${label} ${value}`, 25, yPosition);
          yPosition += 6;
        });

        if (userReportData.growthTrend.summary) {
          yPosition += 5;
          doc.text('Gelişim Özeti:', 20, yPosition);
          yPosition += 6;
          const splitSummary = doc.splitTextToSize(userReportData.growthTrend.summary, 170);
          doc.text(splitSummary, 20, yPosition);
        }
      }

      // Save the PDF
      const cleanTitle = title.replace(/[^a-zA-Z0-9_çÇğĞıİöÖşŞüÜ\s]/g, '_');
      doc.save(`${cleanTitle}_${new Date().toISOString().slice(0, 10)}.pdf`);

      console.log('PDF file exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      alert('PDF dosyası oluşturulurken bir hata oluştu: ' + error.message);
    }
  };

  // Check if user has any data in a particular section
  const hasData = (section) => {
    if (!userReportData || !userReportData[section]) return false;
    
    switch (section) {
      case 'performanceSummary':
        return userReportData.performanceSummary.totalAttempts > 0;
      case 'simulationProgress':
        return userReportData.simulationProgress && userReportData.simulationProgress.length > 0;
      case 'skillAnalysis':
        return userReportData.skillAnalysis && userReportData.skillAnalysis.skills && 
               userReportData.skillAnalysis.skills.length > 0 &&
               userReportData.skillAnalysis.skills.some(skill => skill.score > 0);
      case 'growthTrend':
        return userReportData.growthTrend && userReportData.growthTrend.timeline && 
               userReportData.growthTrend.timeline.length > 0;
      default:
        return false;
    }
  };

  // Helper function to determine color based on skill score
  const getSkillColor = (score) => {
    if (score >= 80) return "#28a745"; // Green for high scores
    if (score >= 60) return "#17a2b8"; // Blue for good scores
    if (score >= 40) return "#ffc107"; // Yellow for medium scores
    return "#dc3545"; // Red for low scores
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/admin/login");
      return;
    }

    // Fetch admin user data
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
        setLoading(false);
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

  // Get filtered timeline data based on selected simulation
  const getFilteredTimelineData = () => {
    if (!userReportData?.growthTrend?.timeline) return [];
    
    if (selectedSimulation) {
      return userReportData.growthTrend.timeline.filter(item => item.simulasyon_name === selectedSimulation);
    }
    
    return userReportData.growthTrend.timeline;
  };

  // Get unique simulation names for the selector
  const getUniqueSimulations = () => {
    if (!userReportData?.growthTrend?.timeline) return [];
    return Array.from(new Set(userReportData.growthTrend.timeline.map(item => item.simulasyon_name)));
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
          {/* Logo would go here */}
        </div>

        {/* Reports Section */}
        <div className="reports-section">
          <h1 className="title">Kullanıcı Performans Raporu</h1>
          
          {/* User Search Panel */}
          <div className="search-section">
            <div className="search-container">
              <div className="search-row">
                <div className="search-group">
                  <label>Kullanıcı Adı/E-posta:</label>
                  <input 
                    type="text" 
                    name="searchTerm"
                    value={searchParams.searchTerm} 
                    onChange={handleSearchChange}
                    placeholder="İsim, soyisim veya e-posta giriniz"
                  />
                </div>
                
                <div className="search-group">
                  <label>Başlangıç Tarihi:</label>
                  <input 
                    type="date" 
                    name="startDate"
                    value={searchParams.startDate} 
                    onChange={handleSearchChange}
                  />
                </div>
                
                <div className="search-group">
                  <label>Bitiş Tarihi:</label>
                  <input 
                    type="date" 
                    name="endDate"
                    value={searchParams.endDate} 
                    onChange={handleSearchChange}
                  />
                </div>
              </div>
              
              <div className="search-buttons">
                <button 
                  className="search-btn" 
                  onClick={handleSearchUser}
                  disabled={searchLoading || !searchParams.searchTerm.trim()}
                >
                  {searchLoading ? "Aranıyor..." : "Kullanıcı Ara"}
                </button>
                <button 
                  className="search-btn reset" 
                  onClick={handleResetSearch}
                >
                  Aramayı Sıfırla
                </button>
              </div>
              
              {/* Display search error if there is one */}
              {searchError && (
                <div className="search-error">
                  <p>{searchError}</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Selected User Info */}
          {selectedUser && (
            <div className="user-info-card">
              <div className="user-info-header">
                <h2>Kullanıcı Bilgileri</h2>
                <div className="export-buttons">
                  <button className="export-btn" onClick={() => exportToExcel(userReportData, `${selectedUser.firstname}_${selectedUser.lastname}_rapor`)}>
                    Excel Olarak İndir
                  </button>
                  <button className="export-btn" onClick={() => exportToPDF(userReportData, `${selectedUser.firstname} ${selectedUser.lastname} Raporu`)}>
                    PDF Olarak İndir
                  </button>
                </div>
              </div>
              
              <div className="user-details">
                <div className="user-detail-row">
                  <div className="user-detail-item">
                    <span className="detail-label">Ad Soyad:</span>
                    <span className="detail-value">{selectedUser.firstname} {selectedUser.lastname}</span>
                  </div>
                  <div className="user-detail-item">
                    <span className="detail-label">E-posta:</span>
                    <span className="detail-value">{selectedUser.email}</span>
                  </div>
                </div>
                
                <div className="user-detail-row">
                  <div className="user-detail-item">
                    <span className="detail-label">Bölüm:</span>
                    <span className="detail-value">{selectedUser.bolum || "Belirtilmemiş"}</span>
                  </div>
                  <div className="user-detail-item">
                    <span className="detail-label">Takım:</span>
                    <span className="detail-value">{selectedUser.takim || "Belirtilmemiş"}</span>
                  </div>
                </div>
                
                <div className="user-detail-row">
                  <div className="user-detail-item">
                    <span className="detail-label">Şirket:</span>
                    <span className="detail-value">{selectedUser.companyname || "Belirtilmemiş"}</span>
                  </div>
                  <div className="user-detail-item">
                    <span className="detail-label">Son Giriş:</span>
                    <span className="detail-value">{selectedUser.last_login ? formatDate(selectedUser.last_login) : "Belirtilmemiş"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* If user is selected, show report tabs */}
          {selectedUser && (
            <>
              {/* Sub Tabs for User Reports */}
              <div className="sub-tabs">
                <button 
                  className={`sub-tab ${activeSubTab === "userPerformance" ? "active" : ""}`}
                  onClick={() => setActiveSubTab("userPerformance")}
                >
                  Performans Özeti
                </button>
                <button 
                  className={`sub-tab ${activeSubTab === "skillAnalysis" ? "active" : ""}`}
                  onClick={() => setActiveSubTab("skillAnalysis")}
                >
                  Beceri Analizi
                </button>
                <button 
                  className={`sub-tab ${activeSubTab === "growthTrend" ? "active" : ""}`}
                  onClick={() => setActiveSubTab("growthTrend")}
                >
                  Gelişim Trendi
                </button>
              </div>
              
              {/* Performance Summary Tab Content */}
              {activeSubTab === "userPerformance" && (
                <div className="chart-container">
                  <h3>Performans Özeti</h3>
                  
                  {hasData('performanceSummary') ? (
                    <>
                      <div className="metrics-grid">
                        <div className="metric-card">
                          <div className="metric-value">{userReportData.performanceSummary.completedSimulations || 0}</div>
                          <div className="metric-label">Tamamlanan Simülasyon</div>
                        </div>
                        
                        <div className="metric-card">
                          <div className="metric-value">{userReportData.performanceSummary.averageScore?.toFixed(1) || 0}</div>
                          <div className="metric-label">Ortalama Puan</div>
                        </div>
                        
                        <div className="metric-card">
                          <div className="metric-value">{userReportData.performanceSummary.highestScore || 0}</div>
                          <div className="metric-label">En Yüksek Puan</div>
                        </div>
                        
                        <div className="metric-card">
                          <div className="metric-value">{userReportData.performanceSummary.totalAttempts || 0}</div>
                          <div className="metric-label">Toplam Deneme</div>
                        </div>
                      </div>
                      
                      {userReportData.performanceSummary.scoreDistribution && userReportData.performanceSummary.scoreDistribution.length > 0 ? (
                        <div className="chart-section">
                          <h4>Puan Dağılımı</h4>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={userReportData.performanceSummary.scoreDistribution || []}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="simulationName" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="score" fill="#8884d8" name="Puan" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="no-chart-data">
                          <p>Puan dağılım verisi bulunmamaktadır.</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="no-data-message">
                      <p>Bu kullanıcı için performans verisi bulunmamaktadır.</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Skill Analysis Tab Content */}
              {activeSubTab === "skillAnalysis" && (
                <div className="chart-container">
                  <h3>Beceri Analizi</h3>
                  
                  {hasData('skillAnalysis') ? (
                    <>
                      <div className="chart-section">
                        <h4>Beceri Karşılaştırması</h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <RadarChart outerRadius={90} data={userReportData.skillAnalysis.skills}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="skill" />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} />
                            <Radar name="Kullanıcı" dataKey="score" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                            <Radar name="Ortalama" dataKey="average" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                            <Legend />
                            <Tooltip />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <div className="skill-details">
                        <h4>Beceri Detayları</h4>
                        <div className="skill-bars">
                          {userReportData.skillAnalysis.skills.map((skill, index) => (
                            <div className="skill-bar-container" key={index}>
                              <div className="skill-bar-label">{skill.skill}</div>
                              <div className="skill-bar-outer">
                                <div 
                                  className="skill-bar-inner" 
                                  style={{width: `${skill.score}%`, backgroundColor: getSkillColor(skill.score)}}
                                ></div>
                              </div>
                              <div className="skill-bar-value">{skill.score}%</div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="skill-notes">
                          <h4>Değerlendirme Notları</h4>
                          <p>{userReportData.skillAnalysis.notes || "Beceri değerlendirme notu bulunmamaktadır."}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="no-data-message">
                      <p>Bu kullanıcı için beceri analizi verisi bulunmamaktadır.</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Growth Trend Tab Content - WITH SIMULATION SELECTOR */}
              {activeSubTab === "growthTrend" && (
                <div className="chart-container">
                  <h3>Gelişim Trendi</h3>
                  
                  {/* Simulation Progress Table */}
                  {hasData('simulationProgress') ? (
                    <>
                      <div className="responsive-table">
                        <table>
                          <thead>
                            <tr>
                              <th>Simülasyon Adı</th>
                              <th>Tamamlanma Tarihi</th>
                              <th>Puan</th>
                              <th>Deneme Sayısı</th>
                              <th>Durum</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userReportData.simulationProgress.map((simulation, index) => (
                              <tr key={index}>
                                <td>{simulation.simulationName}</td>
                                <td>{simulation.completionDate ? formatDate(simulation.completionDate) : "Tamamlanmadı"}</td>
                                <td>{simulation.score || "N/A"}</td>
                                <td>{simulation.attempts}</td>
                                <td>
                                  <span className={`status-badge ${simulation.status.toLowerCase()}`}>
                                    {simulation.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Growth Trend Chart with Simulation Selector */}
                      {hasData('growthTrend') ? (
                        <>
                          {/* Simulation Selector */}
                          {getUniqueSimulations().length > 1 && (
                            <div className="simulation-selector">
                              <label>Simülasyon Seç:</label>
                              <select 
                                value={selectedSimulation || ''} 
                                onChange={(e) => setSelectedSimulation(e.target.value)}
                              >
                                <option value="">Tüm Simülasyonlar</option>
                                {getUniqueSimulations().map(simName => (
                                  <option key={simName} value={simName}>
                                    {simName}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          
                          <div className="chart-section">
                            <h4>
                              Zaman İçindeki Gelişim
                              {selectedSimulation && ` - ${selectedSimulation}`}
                            </h4>
                            <ResponsiveContainer width="100%" height={300}>
                              <LineChart data={getFilteredTimelineData()}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="score" stroke="#8884d8" name="Puan" />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                          
                          <div className="trend-details">
                            <div className="trend-metrics">
                              <div className="trend-metric">
                                <span className="trend-label">İlk Ölçüm Puanı:</span>
                                <span className="trend-value">{userReportData.growthTrend.firstScore || "N/A"}</span>
                              </div>
                              <div className="trend-metric">
                                <span className="trend-label">Son Ölçüm Puanı:</span>
                                <span className="trend-value">{userReportData.growthTrend.lastScore || "N/A"}</span>
                              </div>
                              <div className="trend-metric">
                                <span className="trend-label">Gelişim Oranı:</span>
                                <span className="trend-value">{userReportData.growthTrend.growthRate ?
                                  `%${userReportData.growthTrend.growthRate.toFixed(2)}` : "N/A"}</span>
                              </div>
                              <div className="trend-metric">
                                <span className="trend-label">Toplam Gelişim Süresi:</span>
                                <span className="trend-value">{userReportData.growthTrend.totalDays ?
                                  `${userReportData.growthTrend.totalDays} gün` : "N/A"}</span>
                              </div>
                            </div>
                            
                            <div className="trend-summary">
                              <h4>Gelişim Özeti</h4>
                              <p>{userReportData.growthTrend.summary || "Gelişim özeti bulunmamaktadır."}</p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="no-chart-data">
                          <p>Gelişim trendi verisi bulunmamaktadır.</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="no-data-message">
                      <p>Bu kullanıcı için simülasyon ilerleme verisi bulunmamaktadır.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          
          {/* If no user is selected, show instructions */}
          {!selectedUser && !searchLoading && !searchError && (
            <div className="no-user-selected">
              <div className="info-icon">ℹ️</div>
              <h3>Kullanıcı Raporu Görüntüleme</h3>
              <p>Bir kullanıcının detaylı performans raporunu görüntülemek için lütfen yukarıdaki arama kısmını kullanın.</p>
              <ul>
                <li>Kullanıcının adını, soyadını veya e-posta adresini girin</li>
                <li>İsteğe bağlı olarak bir tarih aralığı belirleyin</li>
                <li>Kullanıcı Ara butonuna tıklayın</li>
              </ul>
              <p>Raporunuz, kullanıcının tüm eğitim verilerini ve performans metriklerini içerecektir.</p>
            </div>
          )}
          
          {/* If search found no user, show error message */}
          {searchError && !selectedUser && !searchLoading && (
            <div className="user-not-found">
              <div className="error-icon">⚠️</div>
              <h3>Kullanıcı Bulunamadı</h3>
              <p>{searchError}</p>
              <p>Lütfen arama kriterlerinizi kontrol edip tekrar deneyin veya farklı bir arama terimi kullanın.</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        /* Styling for the page */
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

        /* User Search Styling */
        .search-section {
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          width: 100%;
        }
        
        .search-container {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        
        .search-row {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          align-items: flex-end;
        }
        
        .search-group {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 200px;
        }
        
        .search-group label {
          font-size: 14px;
          margin-bottom: 5px;
          color: #555;
        }
        
        .search-group input {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        
        .search-buttons {
          display: flex;
          gap: 10px;
        }
        
        .search-btn {
          padding: 8px 16px;
          background-color: #0066cc;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.2s;
          font-weight: 500;
        }
        
        .search-btn:hover {
          background-color: #0056b3;
        }
        
        .search-btn.reset {
          background-color: #6c757d;
        }
        
        .search-btn.reset:hover {
          background-color: #5a6268;
        }
        
        .search-btn:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }
        
        .search-error {
          background-color: #f8d7da;
          border: 1px solid #f5c6cb;
          color: #721c24;
          padding: 10px 15px;
          border-radius: 4px;
          margin-top: 10px;
        }
        
        .search-error p {
          margin: 0;
        }

        /* User Info Card Styling */
        .user-info-card {
          background-color: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          width: 100%;
          margin-bottom: 20px;
        }
        
        .user-info-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }
        
        .user-info-header h2 {
          margin: 0;
          font-size: 20px;
          color: #333;
        }
        
        .user-details {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .user-detail-row {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
        }
        
        .user-detail-item {
          flex: 1;
          min-width: 200px;
        }
        
        .detail-label {
          font-weight: bold;
          color: #666;
          margin-right: 8px;
        }
        
        .detail-value {
          color: #333;
        }

        /* Sub Tabs Styling */
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

        /* Chart Container Styling */
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
        
        .chart-section {
          margin-top: 30px;
        }
        
        .chart-section h4 {
          margin-bottom: 15px;
          color: #555;
        }
        
        .no-data-message, .no-chart-data {
          background-color: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          color: #6c757d;
          margin: 20px 0;
        }

        /* Simulation Selector Styling */
        .simulation-selector {
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .simulation-selector label {
          font-weight: 500;
          color: #555;
          margin-right: 10px;
        }
        
        .simulation-selector select {
          padding: 6px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          background-color: white;
          cursor: pointer;
          min-width: 200px;
        }
        
        .simulation-selector select:focus {
          outline: none;
          border-color: #0066cc;
          box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.2);
        }

        /* Metrics Grid Styling */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        
        .metric-card {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          transition: transform 0.2s;
        }
        
        .metric-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        
        .metric-value {
          font-size: 28px;
          font-weight: bold;
          color: #0066cc;
          margin-bottom: 8px;
        }
        
        .metric-label {
          font-size: 14px;
          color: #666;
        }
        
        /* Table Styling */
        .responsive-table {
          width: 100%;
          overflow-x: auto;
          max-height: 400px;
          overflow-y: auto;
          margin-bottom: 30px;
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
          position: sticky;
          top: 0;
        }
        
        table tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        
        table tr:hover {
          background-color: #f0f0f0;
        }
        
        /* Status Badge Styling */
        .status-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .status-badge.tamamlandı {
          background-color: #d4edda;
          color: #155724;
        }
        
        .status-badge.başladı {
          background-color: #fff3cd;
          color: #856404;
        }
        
        .status-badge.başlanmadı {
          background-color: #f8d7da;
          color: #721c24;
        }
        
        /* Export Buttons Styling */
        .export-buttons {
          display: flex;
          gap: 10px;
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
        
        /* Skill Analysis Styling */
        .skill-bars {
          margin-bottom: 30px;
        }
        
        .skill-bar-container {
          margin-bottom: 15px;
        }
        
        .skill-bar-label {
          font-weight: 500;
          margin-bottom: 5px;
        }
        
        .skill-bar-outer {
          height: 20px;
          background-color: #f5f5f5;
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 5px;
        }
        
        .skill-bar-inner {
          height: 100%;
          border-radius: 10px;
        }
        
        .skill-bar-value {
          font-size: 14px;
          color: #666;
          text-align: right;
        }
        
        .skill-notes, .trend-summary {
          background-color: #f9f9f9;
          padding: 15px;
          border-radius: 8px;
          margin-top: 20px;
        }
        
        .skill-notes h4, .trend-summary h4 {
          margin-top: 0;
          margin-bottom: 10px;
        }
        
        /* Trend Metrics Styling */
        .trend-metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .trend-metric {
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
        }
        
        .trend-label {
          font-weight: 500;
          display: block;
          margin-bottom: 5px;
          color: #666;
        }
        
        .trend-value {
          font-size: 18px;
          color: #0066cc;
        }
        
        /* No User Selected Styling */
        .no-user-selected, .user-not-found {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 30px;
          text-align: center;
          width: 100%;
          max-width: 800px;
          margin: 40px auto;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        
        .info-icon, .error-icon {
          font-size: 36px;
          margin-bottom: 20px;
        }
        
        .error-icon {
          color: #dc3545;
        }
        
        .no-user-selected h3, .user-not-found h3 {
          margin-bottom: 15px;
          color: #333;
        }
        
        .no-user-selected p, .user-not-found p {
          color: #666;
          margin-bottom: 15px;
        }
        
        .no-user-selected ul {
          text-align: left;
          display: inline-block;
          margin: 0 auto;
          color: #666;
        }
        
         .no-user-selected li {
          margin-bottom: 8px;
        }
      `}</style>
    </div>
  );
}