// src/app/simulations/[courseId]/page.js

"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TopNav from "@/components/TopNav";
import Image from "next/image";

const SimulationCard = ({ simulation, href, imageSources = [], isMobile }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const hasSwappedRef = useRef(false);

  const images = useMemo(() => {
    if (imageSources?.length) {
      return imageSources;
    }
    return ["/images/default_placeholder.png"];
  }, [imageSources]);

  const imagesCount = images.length;

  useEffect(() => {
    setActiveIndex(0);
    hasSwappedRef.current = false;
  }, [images]);

  const handleMouseEnter = () => {
    if (isMobile) return;
    setIsHovered(true);

    if (imagesCount > 1 && !hasSwappedRef.current) {
      hasSwappedRef.current = true;
      setActiveIndex((prev) => (prev + 1) % imagesCount);
    }
  };

  const handleMouseLeave = () => {
    hasSwappedRef.current = false;
    setActiveIndex(0);
    setIsHovered(false);
  };

  return (
    <Card
      className={`group relative flex flex-col overflow-hidden border border-slate-200/70 bg-white/95 backdrop-blur-sm shadow-lg transition-all duration-500 ease-out !p-0 ${
        isMobile
          ? "min-h-[320px] rounded-2xl"
          : "rounded-3xl hover:-translate-y-2 hover:shadow-2xl"
      } self-start`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`relative w-full overflow-hidden ${
          isMobile ? "h-[220px]" : "h-[300px]"
        } bg-white`}
      >
        <Image
          key={images[activeIndex]}
          src={images[activeIndex]}
          alt={simulation.simulasyon_showname}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-contain object-center transition-transform duration-700 ease-out"
        />
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-900/85 via-slate-900/30 to-transparent transition-opacity duration-300 ${
            isMobile ? "" : isHovered ? "opacity-0" : ""
          } z-10`}
        />
        <Link
          href={href}
          aria-label={`${simulation.simulasyon_showname} simülasyonunu keşfet`}
          className={`absolute inset-x-0 bottom-0 flex justify-center pb-4 transition-all duration-300 ${
            isMobile
              ? ""
              : isHovered
              ? "translate-y-3 opacity-0 pointer-events-none"
              : ""
          } z-20`}
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white shadow-md backdrop-blur discover-pulse">
            Keşfet
            <svg
              className="h-3 w-3"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M5 10h10M10 5l5 5-5 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </Link>
      </div>

      <CardContent
        className={`relative flex flex-col px-6 pt-0 text-sm text-slate-600 transition-all duration-500 ease-out ${
          isMobile
            ? "pb-6"
            : `pb-0 overflow-hidden max-h-0 ${isHovered ? "max-h-[480px] pb-8" : ""}`
        }`}
      >
        <div
          className={`flex flex-col items-center gap-4 text-center transition-all duration-500 ease-out ${
            isMobile
              ? "py-6"
              : `py-0 opacity-0 translate-y-6 ${
                  isHovered ? "py-6 opacity-100 translate-y-0" : ""
                }`
          }`}
        >
            <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500/70">
              Simülasyon
            </span>
            <h3 className="text-lg font-bold uppercase text-slate-900">
              {simulation.simulasyon_showname}
            </h3>
            <p
              className={`w-full text-left text-sm md:text-xs leading-relaxed text-slate-600 whitespace-pre-line ${
                isMobile
                  ? ""
                  : "max-h-56 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
              }`}
            >
              {simulation.detail}
            </p>
            <Link
              href={href}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-md transition-colors duration-300 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Başla
              <svg
                className="h-3 w-3"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M5 10h10M10 5l5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default function SimulationPage() {
  const params = useParams();
  const courseId = params.courseId;

  const [simulations, setSimulations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageUrls, setImageUrls] = useState({});
  
  // Function to determine the correct route based on simulation type
  const getSimulationRoute = (simulation) => {
    const baseRoute = `/simulations/${courseId}/${simulation.simulasyon_name}`;
    
    switch (simulation.simulation_type) {
      case 2:
        return `${baseRoute}/speech`;
      case 3:
        return `${baseRoute}/avatar`;
      case 99:
        return `${baseRoute}/demo`;
      default:
        return baseRoute;
    }
  };

  const getSimulationImages = (simulation) => (
    imageUrls[simulation.simulasyon_name] || []
  );
  
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
          [simulationName]: data.images.map((image) => `/images/simulasyon/${simulationName}/positive/${image}`),
        }));
      }
    } catch {
    }
  };

  useEffect(() => {
    simulations.forEach((simulation) => {
      fetchImagesForSimulation(simulation.simulasyon_name);
    });
  }, [simulations]);

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
    <div className="min-h-screen max-h-screen overflow-y-auto overflow-x-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 relative">
  
      <TopNav />

      {/* Main Content Container - iOS Optimized */}
      <div className="flex min-h-screen pt-[40px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">

        {/* Desktop Layout: Left-Center-Right columns */}
        <div className="hidden md:flex w-full">
          {/* Left Empty Column - 20% */}
          <div className="w-1/5"></div>

          {/* Center Content - 60% */}
          <div className="w-3/5">
            <div className="grid grid-cols-1 items-start gap-10 py-12 md:grid-cols-2 xl:grid-cols-3">
              {simulations.length > 0 ? (
                simulations.map((simulation) => (
                  <SimulationCard 
                    key={simulation.simulasyon_name}
                    simulation={simulation}
                    href={getSimulationRoute(simulation)}
                    imageSources={getSimulationImages(simulation)}
                    isMobile={false}
                  />
                ))
              ) : (
                <p className="text-center text-gray-500 text-lg col-span-full">Bu kurs için simülasyon bulunamadı.</p>
              )}
            </div>
          </div>

          {/* Right Empty Column - 20% */}
          <div className="w-1/5"></div>
        </div>

        {/* Mobile Layout: Full width with padding - iOS Optimized */}
        <div className="md:hidden px-4 w-full">
          <div className="grid grid-cols-1 gap-6 py-6">
            {simulations.length > 0 ? (
              simulations.map((simulation) => (
                <SimulationCard 
                  key={simulation.simulasyon_name}
                  simulation={simulation}
                  href={getSimulationRoute(simulation)}
                  imageSources={getSimulationImages(simulation)}
                  isMobile
                />
              ))
            ) : (
              <p className="text-center text-gray-500 text-base px-4">Bu kurs için simülasyon bulunamadı.</p>
            )}
          </div>
        </div>
      </div>

      {/* Background Logos - Mobile Responsive */}
      <div className="absolute bottom-4 left-4">
        <Image 
          src="/images/background/logoleft.png" 
          alt="Left Logo" 
          className="w-20 md:w-32 opacity-50" 
          width={128} 
          height={128} 
        />
      </div>
      <div className="absolute bottom-4 right-4">
        <Image 
          src="/images/background/logoright.png" 
          alt="Right Logo" 
          className="w-20 md:w-32 opacity-50" 
          width={128} 
          height={128} 
        />
      </div>
    </div>
  );
}
