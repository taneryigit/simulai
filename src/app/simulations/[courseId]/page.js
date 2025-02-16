//src/app/simulations/[courseId]/page.js
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TopNav from "@/components/TopNav"; // 
import Image from "next/image";

export default function SimulationPage() {
 
  const params = useParams();
  const courseId = params.courseId;

  const [simulations, setSimulations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageUrls, setImageUrls] = useState({});
  
  const [hoveredIndex] = useState({});



 
  useEffect(() => {
    const fetchSimulations = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Oturum açılmamış. Lütfen giriş yapın.");
        }

        const res = await fetch(`/api/simulations?courseId=${courseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Veri yüklenirken bir hata oluştu.");
        }

        setSimulations(data.simulations);

      
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSimulations();
  }, [courseId]);

  const fetchImagesForSimulation = async (simulationName) => {
    try {
      const response = await fetch(`/api/simulations/images?simulation=${simulationName}`);
      const data = await response.json();
      if (response.ok && data.images.length > 0) {
        setImageUrls((prev) => ({
          ...prev,
          [simulationName]: data.images.map(image => `/images/simulasyon/${simulationName}/positive/${image}`),
        }));
      }
    } catch  {
    }
  };

  useEffect(() => {
    simulations.forEach(simulation => {
      fetchImagesForSimulation(simulation.simulasyon_name);
    });
  }, [simulations]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
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

      <div className="flex min-h-screen pt-[40px]">
        {/* Left Empty Column - 20% */}
        <div className="w-1/5"></div>

        {/* Center Content - 60% */}
        <div className="w-3/5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-12">
            {simulations.length > 0 ? (
              simulations.map((simulation, index) => (
                <Link key={index} href={`/simulations/${courseId}/${simulation.simulasyon_name}`}>
                  <Card className="h-[600px] flex flex-col shadow-lg border border-gray-200 transform transition-all duration-300 hover:scale-105">
                    <div className="w-full h-[65%] flex items-center justify-center border-b p-4 overflow-hidden">
                      <Image
                        src={
                          imageUrls[simulation.simulasyon_name]?.[hoveredIndex[simulation.simulasyon_name] || 0] ||
                          "/images/default_placeholder.png"
                        }
                        alt={simulation.simulasyon_showname}
                        className="max-w-full max-h-full object-contain transition-opacity duration-700 ease-in-out"
                      />
                    </div>
                    <CardHeader className="p-4 bg-gray-200 border-b h-[15%] flex items-center justify-center">
                      <h2 className="text-center text-md font-bold uppercase !text-black">
                        {simulation.simulasyon_showname}
                      </h2>
                    </CardHeader>
                    <CardContent className="p-4 h-[35%] overflow-auto">
                      <p className="text-center text-sm text-gray-700">{simulation.detail}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))
            ) : (
              <p className="text-center text-gray-500 text-lg">Bu kurs için simülasyon bulunamadı.</p>
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
