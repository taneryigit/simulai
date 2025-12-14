//bu sayfa app/admin/manage/page.js
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ManagePage() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for JWT token and fetch admin data
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/admin/login");
      return;
    }

    fetch("/api/admin/manage", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        setUserData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching admin data:", err);
        router.push("/admin/login");
      });
  }, [router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  // Handler for logout: clear token and redirect
  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/admin/login");
  };

  return (
    <div className="page-container">
      {/* Header Banner */}
      <div className="header-banner">
        <div className="left">
          {userData?.greeting || "Merhaba"} {userData?.firstname} {userData?.lastname}
        </div>
        <div className="header-links">
          <Link href="/admin/manage">Admin Anasayfa</Link>
          <a href="#" onClick={handleLogout}>
            Çıkış
          </a>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bottom-bar">
        {/* Company Logo */}
        <div className="company-logo">
          {/* Render the logo HTML safely */}
          {userData?.companyLogoHtml && (
            <div
              dangerouslySetInnerHTML={{ __html: userData.companyLogoHtml }}
            />
          )}
        </div>

        {/* Course Container Section */}
        <div className="course-container-section">
          <h2 className="title">
            Lütfen yapmak istediğiniz işlemi seçiniz
          </h2>
          <div className="container-wrapper">
            
            {/* Sınıf Yönetimi */}
            <div className="course-container">
              <div className="course-content">
                <div className="course-title">Sınıf <br /> Yönetimi</div>
                <div className="section-label">
                  Yeni ya da kayıtlı sınıf işlemleri için tıklayınız. <br /> <br />
                </div>
                <div className="course-description">
                  <Link href="sinifolustur">Yeni Sınıf Oluştur</Link>
                  <br /> <br /> <br />
                  <div className="section-label">
                    Kayıtlı sınıf için<br />
                  </div> 
                  <Link href="/admin/katilimcieklecikart">
                    Katılımcı Ekle / Çıkart
                  </Link>
                  <br />
                  <Link href="/admin/tarihisimdegistir">
                    Tarihini / İsmini Değiştir
                  </Link>
                  <br />
                  <Link href="/admin/sinifsil">Sınıfı Sil</Link>
                </div>
              </div>
            </div>

            {/* Rapor Yönetimi */}
            <div className="course-container">
              <div className="course-content">
                <div className="course-title">Rapor <br /> Yönetimi</div>
                <div className="section-label">
                  Raporları görüntülemek, excel ya da csv olarak indirmek için
                  tıklayınız.<br /> <br /><br />
                  </div>
                  <div className="course-description">
                  <Link href="/admin/reports/summary">
                    Özet Raporlar
                  </Link>
                  <br />
                  <Link href="/admin/reports/courses">
                    Eğitim Raporları
                  </Link>
                  <br />
                  <Link href="/admin/reports/simulations">
                  Simulasyon Raporları</Link>
                  <br />
                  <Link href="/admin/reports/users">
                    Katılımcı Raporları
                  </Link>
                </div>
              </div>
              </div>

            {/* Kullanıcı Yönetimi */}
            <div className="course-container">
              <div className="course-content">
                <div className="course-title">
                  Kullanıcı <br /> Yönetimi
                </div>
                <div className="section-label">
                  Yeni ya da kayıtlı kullanıcı işlemleri için tıklayınız.<br /><br />
                </div>
                <div className="course-description">
                  <Link href="/admin/kullaniciolustur">Yeni Kullanıcı Oluştur</Link>
                  <br />
                  <Link href="/admin/kullaniciolusturexcel">
                    Excelden Yeni Kullanıcı Yükle
                  </Link>
                  <br /> <br /> <br />
                  <div className="section-label">
                    Kayıtlı kullanıcı için<br />
                  </div>
                  <Link href="/admin/kullaniciguncelle">
                    Kullanıcı Bilgilerini Güncelle
                  </Link>
                  <br />
                  <Link href="/admin/kullanicisil">Kullanıcı Sil</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .page-container {
          margin: 0;
          font-family: Arial, sans-serif;
          display: flex;
          flex-direction: column;
          height: 100vh;
        }

        .header-banner {
          display: flex;
          justify-content: flex-start;
          align-items: center;
          height: 20px;
          width: 100%;
          background-color: rgba(0, 0, 0, 0.6);
          color: white;
          position: fixed;
          top: 0;
          z-index: 100;
          padding: 0 10px;
          font-size: 13px;
        }

        .header-links {
          margin-left: auto;
          display: flex;
          gap: 20px;
          margin-right: 50px; 
        }

        .header-banner a {
          color: #FFD700;
          text-decoration: none;
          font-size: 13px;
        }

        .header-banner a:hover {
          color: #FFA500;
        }

        .bottom-bar {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 10px 20px;
          position: relative;
          background-image: url('/images/background/logoleft.png'), url('/images/background/logoright.png');
          background-position: left bottom, right bottom;
          background-repeat: no-repeat;
          background-size: 125px 165px, 125px 165px;
          min-height: calc(100vh - 20px);
          margin-top: 20px;
        }

        .company-logo {
          position: absolute;
          top: 30px;
          left: 20px;
          width: 80px;
          height: 160px;
          overflow: hidden;
          z-index: 1;
        }

        .company-logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .course-container-section {
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 30px;
          overflow-y: auto;
          margin-top: 60px;
          padding: 20px;
        }

        .title {
          text-align: center;
          margin-bottom: 30px;
          width: 100%;
        }

        .container-wrapper {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 30px;
          width: 100%;
        }

        .course-container {
          width: 230px;
          height: 400px;
          border: 1px solid #ccc;
          border-radius: 5px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2), 0 4px 12px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          background-color: white;
          text-decoration: none;
          color: inherit;
        }

        .course-container:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 20px rgba(0, 0, 0, 0.25), 0 8px 16px rgba(0, 0, 0, 0.15);
        }

        .course-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 20px;
          text-align: center;
        }

        .course-title {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 10px;
        }

        .course-description {
          font-size: 14px;
         
        }

        .course-container-section .course-container .course-description a {
          color: #0066cc;
          text-decoration: none;
          font-weight: 500;
        }

        .course-container-section .course-container .course-description a:hover {
          text-decoration: underline;
          color: #004d99;
        }

        .section-label {
          font-weight: bold;
          color: #d9534f;
          margin-bottom: 5px;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}