"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push("/giris"); // Redirects to the login page
  }, [router]); // ✅ Added 'router' to dependency array

  return null; // No UI needed as the page redirects immediately
}
