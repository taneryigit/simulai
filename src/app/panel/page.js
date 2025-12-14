//src/app/panel/page.js
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TopNav from "@/components/TopNav";
import Image from "next/image";

export default function PanelPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
        try {
            const token = localStorage.getItem("token");

            if (!token) {
                throw new Error("Oturum açılmamış. Lütfen giriş yapın.");
            }

            const res = await fetch("/api/user/courses", {
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Veri yüklenirken bir hata oluştu.");
            }

            if (!data.courses || !Array.isArray(data.courses)) {
                throw new Error("Beklenmeyen sunucu yanıtı.");
            }

            localStorage.setItem("user", JSON.stringify(data.user));
            window.dispatchEvent(new Event("storage"));

            setCourses(data.courses);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    fetchData();
}, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error}</p>
        <Button onClick={() => window.location.reload()}>Yeniden Dene</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-h-screen overflow-y-auto overflow-x-hidden bg-white relative">
  
      <TopNav />

      {/* Main Content Container - iOS Optimized */}
      <div className="flex min-h-screen pt-[40px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
 
        {/* Desktop Layout: Left-Center-Right columns */}
        <div className="hidden md:flex">
          {/* Left Empty Column - 20% */}
          <div className="w-1/5"></div>

          {/* Center Content - 60% */}
          <div className="w-3/5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-12">
              {courses.length > 0 ? (
                courses.map((course) => (
                  <Link
                    key={course.course_id}
                    href={`/simulations/${course.course_id}`}
                    className="transform transition-all duration-300 hover:scale-105"
                  >
                    <Card className="h-full flex flex-col shadow-lg hover:shadow-2xl border border-gray-200">
                      {/* Course Image */}
                      <div className="w-full h-[200px] flex items-center justify-center border-b p-4">
                        <Image
                          src={course.course_logo}
                          alt={course.course_name}
                          width={200}
                          height={200}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>

                      <CardHeader className="p-4 bg-gray-200 border-b">
                        <h2 className="text-center text-md font-bold uppercase !text-black">
                          {course.course_name}
                        </h2>
                      </CardHeader>

                      <CardContent className="p-4 flex-grow">
                        <p className="text-sm text-gray-600 leading-relaxed">{course.course_info}</p>
                      </CardContent>

                      <div className="p-4 bg-gray-50 border-t text-xs text-gray-500">
                        <p>
                          <strong>Başlangıç Tarihi:</strong> {new Date(course.start_date).toLocaleDateString("tr-TR")}
                        </p>
                        <p>
                          <strong>Bitiş Tarihi:</strong> {new Date(course.end_date).toLocaleDateString("tr-TR")}
                        </p>
                      </div>
                    </Card>
                  </Link>
                ))
              ) : (
                <p className="text-center text-gray-500 text-lg col-span-full">Kayıtlı eğitim bulunamadı.</p>
              )}
            </div>
          </div>

          {/* Right Empty Column - 20% */}
          <div className="w-1/5"></div>
        </div>

        {/* Mobile Layout: Full width with padding */}
        <div className="md:hidden px-4">
          <div className="grid grid-cols-1 gap-6 py-6">
            {courses.length > 0 ? (
              courses.map((course) => (
                <Link
                  key={course.course_id}
                  href={`/simulations/${course.course_id}`}
                  className="transform transition-all duration-300 active:scale-95"
                >
                  <Card className="w-full shadow-lg border border-gray-200">
                    {/* Course Image - Mobile Optimized */}
                    <div className="w-full h-[150px] flex items-center justify-center border-b p-3">
                      <Image
                        src={course.course_logo}
                        alt={course.course_name}
                        width={150}
                        height={150}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>

                    <CardHeader className="p-3 bg-gray-200 border-b">
                      <h2 className="text-center text-sm font-bold uppercase !text-black">
                        {course.course_name}
                      </h2>
                    </CardHeader>

                    <CardContent className="p-3">
                      <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{course.course_info}</p>
                    </CardContent>

                    <div className="p-3 bg-gray-50 border-t text-xs text-gray-500">
                      <p>
                        <strong>Başlangıç:</strong> {new Date(course.start_date).toLocaleDateString("tr-TR")}
                      </p>
                      <p>
                        <strong>Bitiş:</strong> {new Date(course.end_date).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                  </Card>
                </Link>
              ))
            ) : (
              <p className="text-center text-gray-500 text-base px-4">Kayıtlı eğitim bulunamadı.</p>
            )}
          </div>
        </div>
      </div>

      {/* Background Logos - Mobile Responsive */}
      <div className="absolute bottom-4 left-4">
        <Image 
          src="/images/background/logoleft.png" 
          alt="Left Logo" 
          width={128}
          height={128}
          className="w-20 md:w-32 opacity-50" 
        />
      </div>
      <div className="absolute bottom-4 right-4">
        <Image 
          src="/images/background/logoright.png" 
          alt="Right Logo" 
          width={128}
          height={128}
          className="w-20 md:w-32 opacity-50" 
        />
      </div>
    </div>
  );
}