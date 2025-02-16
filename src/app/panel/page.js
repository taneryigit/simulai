//src/app/panel/page.js
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TopNav from "@/components/TopNav"; // ✅ Import TopNav
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
    <div className="min-h-screen bg-white relative">
      <TopNav /> {/* ✅ Use the reusable TopNav component */}

      {/* Course Cards - Start 70px from Top */}
      <div className="flex min-h-screen pt-[40px]">
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
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>

                    <CardHeader className="p-4 bg-gray-200 border-b">
                      <h2 className="text-center text-md font-bold uppercase !text-black">
                        {course.course_name}
                      </h2>
                    </CardHeader>

                    {/* Course Description */}
                    <CardContent className="p-4 flex-grow">
                      <p className="text-sm text-gray-600 leading-relaxed">{course.course_info}</p>
                    </CardContent>

                    {/* Start & End Dates */}
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
              <p className="text-center text-gray-500 text-lg">Kayıtlı eğitim bulunamadı.</p>
            )}
          </div>
        </div>

        {/* Right Empty Column - 20% */}
        <div className="w-1/5"></div>
      </div>

      {/* Background Logos at the Bottom */}
      <div className="absolute bottom-4 left-4">
        <Image src="/images/background/logoleft.png" alt="Left Logo" className="w-32 opacity-50" />
      </div>
      <div className="absolute bottom-4 right-4">
        <Image src="/images/background/logoright.png" alt="Right Logo" className="w-32 opacity-50" />
      </div>
    </div>
  );
}
