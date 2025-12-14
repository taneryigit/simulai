"use client";
import Link from "next/link";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "@/context/AuthContext";

export default function TopNav() {
  const { user: authUser } = useContext(AuthContext);
  const [user, setUser] = useState(authUser);
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const loadUser = () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    };

    loadUser();

    window.addEventListener('storage', loadUser);
    return () => window.removeEventListener('storage', loadUser);
  }, []);

  useEffect(() => {
    if (authUser) {
      setUser(authUser);
    }
  }, [authUser]);

  useEffect(() => {
    const hour = new Date().getHours();
    const greetingText = hour < 12 ? "Günaydın" : hour < 18 ? "Tünaydın" : "İyi Akşamlar";
    setGreeting(greetingText);
  }, []);

  return (
    <div className="bg-black/60 text-white p-2 flex justify-between items-center fixed w-full top-0 z-50 h-[30px]">
      <span className="text-sm font-medium">{`${greeting}, Sayın ${user?.firstname || "Kullanıcı"} ${user?.lastname || ""}`}</span>

      <div className="flex gap-4 text-sm">
        <Link href="/panel" className="text-yellow-400 hover:text-yellow-300 transition-all duration-300 hover:scale-105">Anasayfa</Link>
        <Link href="/reports" className="text-yellow-400 hover:text-yellow-300 transition-all duration-300 hover:scale-105">Raporlarım</Link>
        <Link href="/giris" className="text-yellow-400 hover:text-yellow-300 transition-all duration-300 hover:scale-105" onClick={() => localStorage.removeItem('user')}>Çıkış</Link>
      </div>
    </div>
  );
}
