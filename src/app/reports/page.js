'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import TopNav from "@/components/TopNav";

export default function ReportsPage() {
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [simulations, setSimulations] = useState([]);
    const [selectedSimulation, setSelectedSimulation] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch courses on component mount
    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('/api/reports/courses', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await response.json();
                if (data.courses) {
                    setCourses(data.courses);
                }
            } catch  {
              
            } finally {
                setLoading(false);
            }
        };

        fetchCourses();
    }, []);

    // Fetch simulations when course is selected
    useEffect(() => {
        if (!selectedCourse) return;

        const fetchSimulations = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`/api/reports/simulations?course_id=${selectedCourse}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await response.json();
                if (data.simulationDetails) {
                    setSimulations(data.simulationDetails);
                }
            } catch {
                
            }
        };

        fetchSimulations();
    }, [selectedCourse]);

    const handleSimulationSelect = async (event) => {
        const simulationName = event.target.value;
        setSelectedSimulation(simulationName);

        if (!simulationName) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/reports/results?course_id=${selectedCourse}&simulation_name=${simulationName}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            
            if (data.denemeResults) {
                setResults(data.denemeResults);
            }
        } catch {
           
        }
    };

    // Updated date formatter to separate date and time
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return {
            date: date.toLocaleDateString('tr-TR', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit'
            }),
            time: date.toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            })
        };
    };

    if (loading) {
        return <div className="p-4">Loading...</div>;
    }

    return (
        <div className="min-h-screen w-full overflow-y-auto">
            <div className="fixed top-0 left-0 right-0 z-10">
                <TopNav />
            </div>
            <div className="w-full p-4 pt-16">
                <h1 className="text-2xl font-bold mb-4 mt-8">Raporlarım</h1>
          
                {/* Course Selection */}
                <div className="mb-4">
                    <label htmlFor="course" className="block mb-2 ">Eğitim Adı:</label>
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

                {selectedCourse && (
                    <div className="w-full">
                        {/* Simulation Selection */}
                        <div className="mb-4">
                            <label htmlFor="simulation" className="block mb-2">Simülasyon Adı:</label>
                            <select
                                id="simulation"
                                className="w-full p-2 border rounded"
                                value={selectedSimulation}
                                onChange={handleSimulationSelect}
                            >
                                <option value="">-- Lütfen Seçim Yapınız --</option>
                                {simulations.flatMap((sim) => 
                                    sim.simulations.map((s) => (
                                        <option key={sim.table_name} value={sim.table_name}>
                                            {s.simulasyon_showname}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>
                    </div>
                )}

                {/* Results Display */}
                {results && Array.isArray(results) && (
                    <div className="space-y-8 w-full">
                        {results.map((deneme, index) => (
                            <div key={index} className="border rounded-lg bg-white shadow-lg w-full">
                                <div className="bg-slate-800 text-white p-4 font-bold border-b rounded-t-lg">
                                    Deneme {index + 1}
                                </div>
                                
                                {/* Conversation Section */}
                                <div className="p-4">
                                    <div className="overflow-x-auto">
                                        <table className="w-full table-auto border-collapse">
                                            <thead>
                                                <tr>
                                                    <th className="px-4 py-3 bg-slate-200 text-slate-800 text-left whitespace-nowrap font-semibold border-b-2 border-slate-300">Başlama</th>
                                                    <th className="px-4 py-3 bg-slate-200 text-slate-800 text-left whitespace-nowrap font-semibold border-b-2 border-slate-300">Bitirme</th>
                                                    <th className="px-4 py-3 bg-slate-200 text-slate-800 text-left whitespace-nowrap font-semibold border-b-2 border-slate-300">Sizin Söyledikleriniz</th>
                                                    <th className="px-4 py-3 bg-slate-200 text-slate-800 text-left whitespace-nowrap font-semibold border-b-2 border-slate-300">Yapay Zekanın Söyledikleri</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {deneme.data?.map((item, i) => {
                                                    const startTime = formatDate(item.created_at);
                                                    const endTime = item.end_time ? formatDate(item.end_time) : null;
                                                    
                                                    return (
                                                        <tr key={i} className={`
                                                            border-b 
                                                            hover:bg-slate-100 
                                                            transition-colors
                                                            ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                                                        `}>
                                                            <td className="px-4 py-3">
                                                                <div className="text-slate-800 font-medium">{startTime.date}</div>
                                                                <div className="text-slate-500 text-sm">{startTime.time}</div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                {endTime && (
                                                                    <>
                                                                        <div className="text-slate-800 font-medium">{endTime.date}</div>
                                                                        <div className="text-slate-500 text-sm">{endTime.time}</div>
                                                                    </>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-700">{item.user_response}</td>
                                                            <td className="px-4 py-3 text-slate-700">
                                                                {item.ai_response?.includes('Eğitim simülasyonumuz burada bitti') 
                                                                    ? 'Eğitim simülasyonumuz burada bitti'
                                                                    : item.ai_response}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Scores Section */}
                                    {deneme.scores?.length > 0 && (
                                        <div className="mt-8 overflow-x-auto">
                                            <table className="w-full table-auto border-collapse">
                                                <thead>
                                                    <tr className="border-b-2 border-slate-300">
                                                        <th className="px-4 py-3 bg-slate-200 text-slate-800 whitespace-nowrap font-semibold">Key 1</th>
                                                        <th className="px-4 py-3 bg-slate-200 text-slate-800 whitespace-nowrap font-semibold">Puan</th>
                                                        <th className="px-4 py-3 bg-slate-200 text-slate-800 whitespace-nowrap font-semibold">Key 2</th>
                                                        <th className="px-4 py-3 bg-slate-200 text-slate-800 whitespace-nowrap font-semibold">Puan</th>
                                                        <th className="px-4 py-3 bg-slate-200 text-slate-800 whitespace-nowrap font-semibold">Key 3</th>
                                                        <th className="px-4 py-3 bg-slate-200 text-slate-800 whitespace-nowrap font-semibold">Puan</th>
                                                        <th className="px-4 py-3 bg-slate-200 text-slate-800 whitespace-nowrap font-semibold">Key 4</th>
                                                        <th className="px-4 py-3 bg-slate-200 text-slate-800 whitespace-nowrap font-semibold">Puan</th>
                                                        <th className="px-4 py-3 bg-slate-200 text-slate-800 whitespace-nowrap font-semibold">Key 5</th>
                                                        <th className="px-4 py-3 bg-slate-200 text-slate-800 whitespace-nowrap font-semibold">Puan</th>
                                                        <th className="px-4 py-3 bg-indigo-200 text-slate-800 whitespace-nowrap font-semibold">Toplam Puan</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {deneme.scores.map((score, i) => (
                                                        <tr key={i} className={`
                                                            hover:bg-slate-100 
                                                            transition-colors
                                                            ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                                                        `}>
                                                            <td className="px-4 py-3 border text-slate-700">{score.key1}</td>
                                                            <td className="px-4 py-3 border text-slate-700 font-medium">{score.puan1}</td>
                                                            <td className="px-4 py-3 border text-slate-700">{score.key2}</td>
                                                            <td className="px-4 py-3 border text-slate-700 font-medium">{score.puan2}</td>
                                                            <td className="px-4 py-3 border text-slate-700">{score.key3}</td>
                                                            <td className="px-4 py-3 border text-slate-700 font-medium">{score.puan3}</td>
                                                            <td className="px-4 py-3 border text-slate-700">{score.key4}</td>
                                                            <td className="px-4 py-3 border text-slate-700 font-medium">{score.puan4}</td>
                                                            <td className="px-4 py-3 border text-slate-700">{score.key5}</td>
                                                            <td className="px-4 py-3 border text-slate-700 font-medium">{score.puan5}</td>
                                                            <td className="px-4 py-3 border text-indigo-800 font-semibold">{score.toplam_puan}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
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