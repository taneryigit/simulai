"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

// Create a client component that uses useSearchParams
function AdminLoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showError, setShowError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [passwordType, setPasswordType] = useState("password");

  // Check for error query parameter on initial load
  useEffect(() => {
    if (searchParams.get("error")) {
      setShowError(true);
      setErrorMsg("Hatalı e-posta ya da şifre, lütfen yeniden deneyiniz!");
    }
  }, [searchParams]);

  const togglePasswordVisibility = () => {
    setPasswordType(prev => (prev === "password" ? "text" : "password"));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowError(false);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setShowError(true);
        setErrorMsg(data.error || "Giriş yapılamadı, lütfen tekrar deneyiniz!");
      } else {
        localStorage.setItem("token", data.token);
        router.push("/admin/manage");
      }
    } catch (err) {
      console.error("Login error:", err);
      setShowError(true);
      setErrorMsg("Giriş sırasında hata oluştu, lütfen tekrar deneyiniz!");
    }
  };

  return (
    <div
      style={{
        background: "url('/images/background/logo_ke_eklenmis.png') no-repeat center center fixed",
        backgroundSize: "contain",
        margin: 0,
        fontFamily: "'Open Sans', sans-serif",
        height: "100vh",
      }}
    >
      <div
        style={{
          display: "flex",
          height: "100vh",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            backgroundColor: "rgba(234, 234, 233, 0.939)",
            padding: "50px",
            borderRadius: "20px",
            width: "300px",
          }}
        >
          <h2
            style={{
              textAlign: "center",
              marginBottom: "20px",
              color: "rgba(36, 71, 90, 1)",
              fontWeight: "bold",
            }}
          >
            Sayın Yönetici <br /> Lütfen Giriş Yapınız
          </h2>
          {showError && (
            <div
              id="error-message"
              style={{
                color: "red",
                display: "block",
                marginBottom: "15px",
                textAlign: "center",
              }}
            >
              {errorMsg}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "10px" }}>
              <label htmlFor="email" style={{ fontWeight: "bold" }}>
                E-posta
              </label>
              <input
                type="email"
                id="email"
                required
                aria-label="Email Address"
                placeholder="E-posta adresinizi girin"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "1em",
                  borderRadius: "5px",
                  marginTop: "5px",
                }}
              />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label htmlFor="password" style={{ fontWeight: "bold" }}>
                Şifre
              </label>
              <input
                type={passwordType}
                id="password"
                required
                aria-label="Password"
                placeholder="Şifrenizi girin"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "1em",
                  borderRadius: "5px",
                  marginTop: "5px",
                }}
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                style={{
                  background: "none",
                  border: "none",
                  color: "#24475a",
                  cursor: "pointer",
                  fontSize: "0.9em",
                  marginTop: "5px",
                  padding: 0,
                }}
              >
                Şifreyi Göster/Gizle
              </button>
            </div>
            <button
              type="submit"
              style={{
                backgroundColor: "#24475a",
                color: "white",
                padding: "10px 20px",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                display: "block",
                margin: "0 auto",
              }}
            >
              Giriş
            </button>
            <div style={{ textAlign: "center", marginTop: "10px" }}>
              <a href="/new_password" style={{ color: "#24475a", fontSize: "0.9em" }}>
                Yeni Şifre Al
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense
export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div>Yükleniyor...</div>}>
      <AdminLoginContent />
    </Suspense>
  );
}