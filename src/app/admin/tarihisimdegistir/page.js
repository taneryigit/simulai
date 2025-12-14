"use client";
import { useState } from "react";
import Link from "next/link";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";

export default function TarihIsimDegistirPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null); // { class_name, class_start_date, class_end_date }
  const [actionType, setActionType] = useState(""); // "date" or "name"
  const [newStartDate, setNewStartDate] = useState(null);
  const [newEndDate, setNewEndDate] = useState(null);
  const [newClassName, setNewClassName] = useState("");
  const [charCount, setCharCount] = useState(0);

  // Helper to get JWT token from localStorage
  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("token") : "";

  // Helper to format dates for API
  const formatDateForAPI = (date) => {
    if (!date) return "";
    return format(date, "yyyy-MM-dd HH:mm:ss");
  };

  // Search for courses when query length >= 3
  const searchCourses = async (query) => {
    if (query.length < 3) {
      setCourses([]);
      return;
    }
    try {
      const token = getToken();
      const res = await fetch("/api/admin/tarihisimdegistir", {
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

  // Handle course selection
  const handleSelectCourse = (course) => {
    setSelectedCourse(course);
    setCourses([]);
    setSearchQuery("");
    setActionType("");
    // Reset update fields
    setNewStartDate(null);
    setNewEndDate(null);
    setNewClassName("");
    setCharCount(0);
  };

  // Handle action type selection
  const handleActionChange = (e) => {
    setActionType(e.target.value);
    // Reset fields based on action type
    if (e.target.value === "name") {
      setNewClassName("");
      setCharCount(0);
    } else if (e.target.value === "date") {
      setNewStartDate(null);
      setNewEndDate(null);
    }
  };

  // Handle change for new class name input
  const handleNewClassNameChange = (e) => {
    const value = e.target.value;
    setNewClassName(value);
    setCharCount(value.length);
  };

  // Update dates for selected course
  const updateDates = async () => {
    if (!newStartDate || !newEndDate) {
      alert("Lütfen hem yeni başlangıç hem de bitiş tarihlerini girin.");
      return;
    }
    try {
      const token = getToken();
      const res = await fetch("/api/admin/tarihisimdegistir", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "update_dates",
          course_name: selectedCourse.class_name,
          start_date: formatDateForAPI(newStartDate),
          end_date: formatDateForAPI(newEndDate)
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Tarihler başarıyla güncellendi.");
        // Reset date fields
        setNewStartDate(null);
        setNewEndDate(null);
      } else {
        alert(data.error || "Tarih güncelleme hatası");
      }
    } catch (error) {
      console.error("Error updating dates:", error);
      alert("Tarih güncellenirken hata oluştu.");
    }
  };

  // Update class name for selected course
  const updateClassName = async () => {
    if (!newClassName || newClassName.trim().length === 0) {
      alert("Lütfen yeni sınıf ismini giriniz.");
      return;
    }
    
    if (newClassName.length > 144) {
      alert("Sınıf ismi 144 karakterden uzun olamaz.");
      return;
    }
    
    try {
      const token = getToken();
      const res = await fetch("/api/admin/tarihisimdegistir", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "update_class_name",
          old_class_name: selectedCourse.class_name,
          new_class_name: newClassName,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Sınıf ismi başarıyla güncellendi.");
        // Update the selected course's name in state
        setSelectedCourse({ ...selectedCourse, class_name: newClassName });
        // Reset class name field
        setNewClassName("");
        setCharCount(0);
      } else {
        alert(data.error || "Sınıf ismi güncelleme hatası");
      }
    } catch (error) {
      console.error("Error updating class name:", error);
      alert("Sınıf ismi güncellenirken hata oluştu.");
    }
  };

  return (
    <div>
      {/* Header Banner */}
      <div className="fixed top-0 z-50 flex items-center justify-start w-full h-5 px-2.5 text-white text-xs bg-black/60">
        <div></div>
        <div className="ml-auto flex gap-5 mr-12">
          <Link href="/admin/manage" className="text-yellow-300 hover:text-amber-500 no-underline text-xs">
            Admin Anasayfa
          </Link>
          <Link href="/admin/login" className="text-yellow-300 hover:text-amber-500 no-underline text-xs">
            Çıkış
          </Link>
        </div>
      </div>

      <div className="shadow-md rounded p-5 bg-white mt-10">
        <h1 className="text-2xl font-bold">Tarih / İsim Değiştir</h1>

        {/* Course Search Section */}
        <div className="mb-4">
          <label className="block font-bold mb-2" htmlFor="course-search">
            Sınıf Ara:
          </label>
          <div className="relative">
            <input
              className="w-full border border-gray-300 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="text"
              id="course-search"
              placeholder="Sınıf ismini girin..."
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
            {courses.map((course, idx) => (
              <div
                key={idx}
                className="cursor-pointer py-2.5 px-2.5 border-b border-gray-300 hover:bg-gray-100"
                onClick={() => handleSelectCourse(course)}
              >
                {course.class_name}
              </div>
            ))}
            <div className="text-gray-500 text-sm">Seçmek için tıklayınız</div>
          </div>
        )}

        {selectedCourse && (
          <div id="selected-course" className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mt-3">
            <p>
              Seçilen Sınıf: <span id="selected-course-name">{selectedCourse.class_name}</span>
              <span
                id="remove-selected-course"
                className="bg-red-500 text-white text-xs rounded px-2 py-1 ml-2.5 cursor-pointer"
                onClick={() => {
                  setSelectedCourse(null);
                  setActionType("");
                }}
              >
                Seçimi Kaldır
              </span>
            </p>
          </div>
        )}

        {/* Action Selection */}
        {selectedCourse && (
          <div id="action-selection" className="mb-4 mt-4">
            <label className="block font-bold mb-2">Lütfen işlem seçiniz:</label>
            <div className="relative">
              <select 
                id="change-type" 
                value={actionType} 
                onChange={handleActionChange}
                className="w-full border border-gray-300 rounded py-2 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="">İşlem Seçiniz</option>
                <option value="date">1. Tarihini Değiştirin</option>
                <option value="name">2. İsmini Değiştirin</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Date Change Section */}
        {selectedCourse && actionType === "date" && (
          <div id="date-change-section">
            <div className="mb-4">
              <label className="block font-bold mb-2">Şimdiki Başlangıç Tarihi:</label>
              <div className="relative">
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded py-2 px-3 bg-gray-100 cursor-not-allowed" 
                  id="current-start-date" 
                  value={selectedCourse.class_start_date || "Tarih Belirlenmemiş"} 
                  readOnly 
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block font-bold mb-2">Şimdiki Bitiş Tarihi:</label>
              <div className="relative">
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded py-2 px-3 bg-gray-100 cursor-not-allowed" 
                  id="current-end-date" 
                  value={selectedCourse.class_end_date || "Tarih Belirlenmemiş"} 
                  readOnly 
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block font-bold mb-2">Yeni Başlangıç Tarihi:</label>
              <div className="relative">
                <DatePicker
                  id="new-start-date"
                  className="w-full border border-gray-300 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  selected={newStartDate}
                  onChange={date => setNewStartDate(date)}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  timeCaption="Saat"
                  dateFormat="yyyy-MM-dd HH:mm:ss"
                  locale={tr}
                  placeholderText="Yeni başlangıç tarihini seçin"
                  isClearable
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block font-bold mb-2">Yeni Bitiş Tarihi:</label>
              <div className="relative">
                <DatePicker
                  id="new-end-date"
                  className="w-full border border-gray-300 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  selected={newEndDate}
                  onChange={date => setNewEndDate(date)}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  timeCaption="Saat"
                  dateFormat="yyyy-MM-dd HH:mm:ss"
                  locale={tr}
                  placeholderText="Yeni bitiş tarihini seçin"
                  isClearable
                />
              </div>
            </div>
            <div className="mb-4">
              <div className="relative">
                <button 
                  id="update-dates" 
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" 
                  onClick={updateDates}
                >
                  Yeni Tarihleri Ekle
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Name Change Section */}
        {selectedCourse && actionType === "name" && (
          <div id="name-change-section">
            <div className="mb-4">
              <label className="block font-bold mb-2">Şimdiki Sınıf İsmi:</label>
              <div className="relative">
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded py-2 px-3 bg-gray-100 cursor-not-allowed" 
                  id="current-class-name" 
                  value={selectedCourse.class_name} 
                  readOnly 
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block font-bold mb-2">Yeni Sınıf İsmini Giriniz:</label>
              <div className="relative">
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  id="new-class-name" 
                  maxLength={144}
                  placeholder="Yeni sınıf ismini giriniz"
                  value={newClassName}
                  onChange={handleNewClassNameChange}
                />
              </div>
              <p className="text-gray-500 text-xs text-right mt-1">{charCount} / 144</p>
            </div>
            <div className="mb-4">
              <div className="relative">
                <button 
                  id="update-name" 
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" 
                  onClick={updateClassName}
                >
                  Yeni İsim Belirle
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add global styles for React DatePicker */}
      <style jsx global>{`
        .react-datepicker-wrapper {
          width: 100%;
          display: block;
        }
        
        .react-datepicker__input-container {
          width: 100%;
          display: block;
        }
      `}</style>
    </div>
  );
}