// app/admin/reports/summary/page.js
"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";

import { useRouter } from "next/navigation";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

// Import shared components
import FilterPanel from "@/components/reports/FilterPanel";

export default function SummaryReportsPage() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportsData, setReportsData] = useState(null);
  const [isFiltering, setIsFiltering] = useState(false);
  const [simulationShowNames, setSimulationShowNames] = useState({});

  // Fetch simulation display names from API
  const fetchSimulationShowNames = async (simulationNames = []) => {
    const namesToRequest = simulationNames.filter(Boolean);
    if (namesToRequest.length === 0) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/admin/simulations/shownames", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tables: namesToRequest }),
      });
      const data = await response.json();
      if (data.success) {
        setSimulationShowNames(prev => ({ ...prev, ...data.showNames }));
      }
    } catch (error) {
      console.error("Error fetching simulation show names:", error);
    }
  };


  // Process simulation data to include show names
  const processSimulationData = (simulations) => {
    if (!simulations) return [];
    return simulations.map(sim => {
      const displayName = sim.showName || simulationShowNames[sim.name] || sim.name;
      const completionCount = Number(sim.kullanilmaSayisi ?? 0) || 0;
      const assignmentCount = Number(sim.atanmaSayisi ?? sim.kullaniciSayisi ?? 0) || 0;

      return {
        ...sim,
        displayName,
        tamamlanmaSayisi: completionCount,
        atanmaSayisi: assignmentCount,
      };
    });
  };

  // Fetch report data
  const fetchReportData = useCallback((filters = {}) => {
    setLoading(true);
    const token = localStorage.getItem("token");
    const queryParams = new URLSearchParams();
    if (filters.startDate) queryParams.append('startDate', filters.startDate);
    if (filters.endDate) queryParams.append('endDate', filters.endDate);

    fetch(`/api/admin/reports/summary?${queryParams.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        setReportsData(data);
        if (data.popularSimulations) {
          const missingShowNames = data.popularSimulations
            .filter(sim => !sim.showName)
            .map(sim => sim.name);

          if (missingShowNames.length > 0) {
            fetchSimulationShowNames(missingShowNames);
          }
        }
        setLoading(false);
        setIsFiltering(false);
      })
      .catch(err => {
        console.error(`Error fetching summary report data:`, err);
        setLoading(false);
        setIsFiltering(false);
      });
  }, []);

  // Handle filtering
  const handleFilter = (filters) => {
    setIsFiltering(true);
    fetchReportData(filters);
  };

  // Handle reset
  const handleReset = () => {
    fetchReportData();
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
        
        // Now fetch reports data
        fetchReportData();
      })
      .catch((err) => {
        console.error("Error fetching data:", err);
        router.push("/admin/login");
      });
  }, [router, fetchReportData]);

  // Handler for logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/admin/login");
  };

  // Colors for charts
  const COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', 
    '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57',
    '#ff6b6b', '#67b7dc', '#95a5a6', '#f39c12', '#9b59b6',
    '#3498db', '#2ecc71', '#e74c3c', '#1abc9c', '#34495e'
  ];

  // Process simulation data before rendering
  const processedSimulations = processSimulationData(reportsData?.popularSimulations);

  const courseParticipationData = reportsData?.courseParticipation
    ? [...reportsData.courseParticipation]
        .map(course => ({
          ...course,
          katilimciSayisi: Number(course.katilimciSayisi) || 0,
        }))
        .sort((a, b) => b.katilimciSayisi - a.katilimciSayisi)
        .slice(0, 10)
    : [];

  const courseParticipationChartHeight = Math.max(240, Math.min(courseParticipationData.length * 45, 500));

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
          <h1 className="title">Özet Raporlar</h1>
          
          {/* Filter Panel - only date filters for summary */}
          <FilterPanel 
            onFilter={handleFilter}
            onReset={handleReset}
            isFiltering={isFiltering}
            showClassFilter={false}
            showCourseFilter={false}
          />
          
          {/* Summary Metrics Cards */}
          <div className="metrics-cards">
            <div className="metric-card">
              <h3>Aktif Eğitimler</h3>
              <div className="metric-value">{reportsData?.summary?.aktifKursSayisi || 0}</div>
            </div>
            <div className="metric-card">
              <h3>Aktif Kullanıcılar</h3>
              <div className="metric-value">{reportsData?.summary?.aktifKullaniciSayisi || 0}</div>
            </div>
            <div className="metric-card">
              <h3>Aktif Kayıtlar</h3>
              <div className="metric-value">{reportsData?.summary?.aktifKayitSayisi || 0}</div>
            </div>
            <div className="metric-card">
              <h3>Tamamlanan Simülasyonlar</h3>
              <div className="metric-value">{reportsData?.summary?.tamamlananSimulasyonSayisi || 0}</div>
            </div>
          </div>

          {/* Monthly Simulation Activity Chart */}
          <div className="chart-container">
            <h2>Aylık Simülasyon Aktivitesi</h2>
            {reportsData?.monthlySimulation && reportsData.monthlySimulation.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={reportsData.monthlySimulation}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ay" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="simulasyonSayisi" stroke={COLORS[0]} name="Simülasyon Sayısı" />
                  <Line type="monotone" dataKey="katilimciSayisi" stroke={COLORS[1]} name="Katılımcı Sayısı" />
                  <Line type="monotone" dataKey="ortalamaPuan" stroke={COLORS[2]} name="Ortalama Puan" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">Aylık simülasyon verisi bulunamadı.</div>
            )}
          </div>

          {/* Popular Courses Chart */}
          <div className="chart-container">
            <h2>En Popüler Eğitimler</h2>
            {reportsData?.popularCourses && reportsData.popularCourses.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reportsData.popularCourses}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="kayitSayisi" name="Kayıt Sayısı">
                    {reportsData.popularCourses.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">Popüler eğitim verisi bulunamadı.</div>
            )}
          </div>

          {/* Popular Simulations Chart */}
          <div className="chart-container">
            <h2>En Çok Kullanılan Simülasyonlar</h2>
            {processedSimulations && processedSimulations.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={processedSimulations}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="displayName" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [value, name]} labelFormatter={(label) => `Simülasyon: ${label}`} />
                  <Legend />
                  <Bar dataKey="tamamlanmaSayisi" name="Tamamlanma Sayısı">
                    {processedSimulations.map((entry, index) => (
                      <Cell key={`completion-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                  <Bar dataKey="atanmaSayisi" name="Atanmış Kişi Sayısı">
                    {processedSimulations.map((entry, index) => (
                      <Cell key={`assignment-${index}`} fill={COLORS[(index + 5) % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">Popüler simülasyon verisi bulunamadı.</div>
            )}
          </div>

          {/* Course Participation Chart */}
          <div className="chart-container">
            <h2>Eğitime Katılım Oranları</h2>
            {courseParticipationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={courseParticipationChartHeight}>
                <BarChart data={courseParticipationData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={180} />
                  <Tooltip formatter={(value) => [value, "Katılımcı Sayısı"]} />
                  <Legend />
                  <Bar dataKey="katilimciSayisi" name="Katılımcı Sayısı">
                    {courseParticipationData.map((entry, index) => (
                      <Cell key={`course-participation-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">Eğitim katılım verisi bulunamadı.</div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        /* Include your original CSS here */
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

        /* Header styles */
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

        /* Bottom bar and content styling */
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

        .logo-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
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
        }

        .title {
          text-align: center;
          margin-bottom: 30px;
          width: 100%;
        }

        /* Metrics cards styling */
        .metrics-cards {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 20px;
          width: 100%;
        }

        .metric-card {
          padding: 20px;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          text-align: center;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .metric-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
        }

        .metric-card h3 {
          margin-top: 0;
          color: #666;
          font-size: 16px;
          font-weight: 500;
        }

        .metric-value {
          font-size: 36px;
          font-weight: bold;
          color: #0066cc;
        }

        /* Chart containers */
        .chart-container {
          background-color: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          width: 100%;
          margin-top: 20px;
        }

        .chart-container h2 {
          margin-top: 0;
          margin-bottom: 20px;
          font-size: 18px;
          color: #333;
        }

        .no-data {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 300px;
          color: #999;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}