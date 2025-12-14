'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';

const formatDateTime = (dateString) => {
  if (!dateString) return { date: '-', time: '' };
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return { date: '-', time: '' };

  return {
    date: date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      timeZone: 'UTC',
    }),
    time: date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'UTC',
    }),
  };
};

export default function ReportsPage() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [simulations, setSimulations] = useState([]);
  const [selectedSimulation, setSelectedSimulation] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(false);

  // Sadece yön kontrolü (Başlama zamanı)
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'
  const [showCount, setShowCount] = useState(10);

  const router = useRouter();
  const ts = (d) => (d ? new Date(d).getTime() : Number.POSITIVE_INFINITY);

  // Kursları çek
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/reports/courses', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.courses) setCourses(data.courses);
      } catch {
        // no-op
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  // Kurs seçilince simülasyonları çek
  useEffect(() => {
    setSimulations([]);
    setSelectedSimulation('');
    setResults([]);
    setShowCount(10);

    if (!selectedCourse) return;

    const fetchSimulations = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(
          `/api/reports/simulations?course_id=${selectedCourse}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await response.json();
        if (data.simulationDetails) setSimulations(data.simulationDetails);
      } catch {
        // no-op
      }
    };
    fetchSimulations();
  }, [selectedCourse]);

  // Simülasyon seçenekleri
  const simulationOptions = useMemo(() => {
    if (!Array.isArray(simulations)) return [];
    return simulations.flatMap((sim) =>
      (sim.simulations || []).map((s, idx) => ({
        tableName: sim.table_name,
        showName: s.simulasyon_showname || s.simulasyon_name || sim.table_name,
        key: `${sim.table_name}-${s.simulasyon_name || s.simulasyon_showname || idx}`,
      }))
    );
  }, [simulations]);

  // Simülasyon seçimi -> sonuçları çek
  const handleSimulationSelect = async (event) => {
    const simulationName = event.target.value;
    setSelectedSimulation(simulationName);
    setResults([]);
    setShowCount(10);

    if (!simulationName || !selectedCourse) return;

    setResultsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/reports/results?course_id=${selectedCourse}&simulation_name=${simulationName}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (Array.isArray(data.denemeResults)) setResults(data.denemeResults);
    } catch {
      setResults([]);
    } finally {
      setResultsLoading(false);
    }
  };

  // Başlama zamanına göre kronolojik numara (erken → 1)
  const chronoIndexMap = useMemo(() => {
    if (!Array.isArray(results)) return new Map();
    const sorted = [...results].sort((a, b) => ts(a?.start_time) - ts(b?.start_time));
    const map = new Map();
    sorted.forEach((item, idx) => {
      const key = item?.thread_id || `${item?.start_time}-${item?.end_time}-${idx}`;
      map.set(key, idx + 1);
    });
    return map;
  }, [results]);

  // Sadece başlama zamanı ile sıralı liste
  const attempts = useMemo(() => {
    if (!Array.isArray(results)) return [];
    const arr = [...results];
    arr.sort((a, b) => {
      const cmp = ts(a?.start_time) - ts(b?.start_time); // artan (eski→yeni)
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [results, sortOrder]);

  const getTotalScore = (attempt) => {
    if (!attempt) return null;
    if (attempt.toplam_puan !== undefined && attempt.toplam_puan !== null) {
      return attempt.toplam_puan;
    }
    if (Array.isArray(attempt.scores) && attempt.scores.length) {
      for (let i = attempt.scores.length - 1; i >= 0; i -= 1) {
        const candidate = attempt.scores[i]?.toplam_puan;
        if (candidate !== undefined && candidate !== null) return candidate;
      }
    }
    return null;
  };

  const handleOpenReport = (threadId) => {
    if (!threadId || !selectedCourse || !selectedSimulation) return;
    const pathCourse = encodeURIComponent(selectedCourse);
    const pathSimulation = encodeURIComponent(selectedSimulation);
    const query = new URLSearchParams({ threadId, courseId: selectedCourse }).toString();
    router.push(`/simulations/${pathCourse}/${pathSimulation}/rapor?${query}`);
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="min-h-screen w-full overflow-y-auto">
      <div className="fixed top-0 left-0 right-0 z-10">
        <TopNav />
      </div>

      <div className="w-full p-4 pt-16">
        <h1 className="text-2xl font-bold mb-4 mt-8">Raporlarım</h1>

        {/* Kurs seçimi */}
        <div className="mb-4">
          <label htmlFor="course" className="block mb-2">Eğitim Adı:</label>
          <select
            id="course"
            className="w-full p-2 border rounded"
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
          >
            <option value="">-- Lütfen Seçim Yapınız --</option>
            {courses.map((course) => (
              <option key={course.course_id} value={course.course_id}>
                {course.course_name}
              </option>
            ))}
          </select>
        </div>

        {/* Simülasyon seçimi */}
        {selectedCourse && (
          <div className="mb-6">
            <label htmlFor="simulation" className="block mb-2">Simülasyon Adı:</label>
            <select
              id="simulation"
              className="w-full p-2 border rounded"
              value={selectedSimulation}
              onChange={handleSimulationSelect}
            >
              <option value="">-- Lütfen Seçim Yapınız --</option>
              {simulationOptions.map((option) => (
                <option key={option.key} value={option.tableName}>
                  {option.showName}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Kontrol barı (yalnızca yön + sayaç) */}
        {selectedSimulation && (
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <button
              className="px-3 py-2 border rounded hover:bg-slate-50"
              onClick={() => setSortOrder((p) => (p === 'asc' ? 'desc' : 'asc'))}
              title="Sıralama yönünü değiştir"
            >
              {sortOrder === 'asc' ? 'Artan ↑' : 'Azalan ↓'}
            </button>

            <div className="ml-auto text-sm text-slate-600">
              Toplam deneme: <span className="font-medium">{attempts.length}</span>
            </div>
          </div>
        )}

        {/* Liste */}
        {selectedSimulation && (
          <div className="space-y-4">
            {resultsLoading && (
              <div className="p-4 text-sm text-slate-600 bg-slate-50 border rounded">
                Denemeler yükleniyor…
              </div>
            )}

            {!resultsLoading && attempts.length === 0 && (
              <div className="p-6 text-center text-slate-600 bg-slate-50 border rounded">
                Bu simülasyon için henüz bir deneme bulunamadı.
              </div>
            )}

            {!resultsLoading && attempts.length > 0 && (
              <div className="space-y-4">
                {attempts.slice(0, showCount).map((attempt, idx) => {
                  const { date: startDate, time: startTime } = formatDateTime(attempt.start_time);
                  const { date: endDate, time: endTime } = formatDateTime(attempt.end_time);
                  const totalScore = getTotalScore(attempt);
                  const messageCount = Array.isArray(attempt.data) ? attempt.data.length : 0;

                  const key = attempt?.thread_id || `${attempt?.start_time}-${attempt?.end_time}-${idx}`;
                  const denemeNo = chronoIndexMap.get(key) ?? '—';

                  return (
                    <div key={key} className="border rounded-lg bg-white shadow-sm p-4 md:p-6">
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="space-y-2">
                          <div className="text-xs uppercase tracking-wide text-slate-500">
                            Deneme {denemeNo}
                          </div>
                          <div>
                            <div className="text-sm text-slate-500">Başlama</div>
                            <div className="font-semibold text-slate-800">
                              {startDate}{' '}
                              <span className="text-sm text-slate-500">{startTime}</span>
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-slate-500">Bitiş</div>
                            <div className="text-slate-700">
                              {endDate}{' '}
                              <span className="text-sm text-slate-500">{endTime}</span>
                            </div>
                          </div>
                          <div className="text-sm text-slate-500">
                            Mesaj sayısı:{' '}
                            <span className="font-medium text-slate-700">{messageCount}</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-start md:items-end gap-3">
                          <div className="text-sm text-slate-500">Toplam Puan</div>
                          <div className="text-3xl font-bold text-indigo-600">{totalScore ?? '—'}</div>
                          <button
                            className="px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-900 transition"
                            onClick={() => handleOpenReport(attempt.thread_id)}
                          >
                            Raporu Aç
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {attempts.length > showCount && (
                  <div className="flex justify-center">
                    <button
                      className="px-4 py-2 mt-2 rounded-lg border hover:bg-slate-50"
                      onClick={() => setShowCount((n) => n + 10)}
                    >
                      Daha fazla yükle
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!selectedCourse && (
          <div className="text-center p-8 bg-slate-50 rounded border">
            <p className="text-slate-600 italic">Lütfen rapor almak için bir eğitim seçiniz.</p>
          </div>
        )}
      </div>
    </div>
  );
}
