"use client";
import { useState } from "react";
import Link from "next/link";

export default function SinifSilPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");

  // Helper: retrieve JWT token from localStorage
  const getToken = () =>
    typeof window !== "undefined" && localStorage.getItem("token");

  // Search classes when query length is at least 3
  const searchCourses = async (query) => {
    if (query.length < 3) {
      setCourses([]);
      return;
    }
    try {
      const token = getToken();
      const res = await fetch("/api/admin/sinifsil", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "search_courses", query }),
      });
      const data = await res.json();
      if (data.courses) {
        setCourses(data.courses);
      }
    } catch (error) {
      console.error("Error searching courses:", error);
    }
  };

  // Delete selected class
  const deleteClass = async () => {
    if (!selectedCourse) {
      alert("Lütfen bir sınıf seçin.");
      return;
    }
    if (!confirm("Bu sınıfı ve tüm katılımcılarını silmek istediğinizden emin misiniz?")) {
      return;
    }
    try {
      const token = getToken();
      const res = await fetch("/api/admin/sinifsil", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "delete_class", class_name: selectedCourse }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Sınıf ve tüm katılımcıları başarıyla silindi.");
        setSelectedCourse("");
      } else {
        alert(data.error || "Sınıf silme hatası.");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Sınıf silinirken hata oluştu.");
    }
  };

  return (
    <div className="pt-10">
      {/* Top Banner */}
      <div className="fixed top-0 z-50 flex items-center justify-between w-full h-5 px-2.5 text-white text-xs bg-black/60">
        <div></div>
        <div className="flex gap-5 mr-12">
          <Link href="/admin/manage" className="text-yellow-300 hover:text-amber-500 no-underline text-xs">
            Admin Anasayfa
          </Link>
          <Link href="/admin/login" className="text-yellow-300 hover:text-amber-500 no-underline text-xs">
            Çıkış
          </Link>
        </div>
      </div>

      <div className="shadow-md rounded p-5 bg-white mt-10">
        <h1 className="text-2xl font-bold mb-5">Sınıf Sil</h1>

        {/* Class Search Section */}
        <div className="mb-4">
          <label className="block font-bold mb-2" htmlFor="course-search">Sınıf Ara:</label>
          <div className="relative">
            <input
              className="w-full border border-gray-300 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="text"
              id="course-search"
              placeholder="Sınıf adını girin..."
              value={searchQuery}
              onChange={(e) => {
                const q = e.target.value;
                setSearchQuery(q);
                searchCourses(q);
              }}
            />
          </div>
        </div>

        {courses.length > 0 && (
          <div id="course-results" className="mt-2">
            {courses.map((course, index) => (
              <div
                key={index}
                className="cursor-pointer py-2.5 px-2.5 border-b border-gray-300 hover:bg-gray-100"
                onClick={() => {
                  setSelectedCourse(course);
                  setCourses([]);
                  setSearchQuery("");
                }}
              >
                {course}
              </div>
            ))}
            <div className="text-gray-500 text-sm">
              Seçmek için tıklayınız
            </div>
          </div>
        )}

        {selectedCourse && (
          <div id="selected-course" className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mt-3">
            <p>
              Seçilen Sınıf: <span id="selected-course-name">{selectedCourse}</span>
              <span
                id="remove-selected-course"
                className="bg-red-500 text-white text-xs rounded px-2 py-1 ml-2.5 cursor-pointer"
                onClick={() => setSelectedCourse("")}
              >
                Seçimi Kaldır
              </span>
            </p>
          </div>
        )}

        {selectedCourse && (
          <div className="mt-4" id="delete-section">
            <div>
              <button
                id="delete-class"
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                onClick={deleteClass}
              >
                Sınıfı Sil
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}