"use client";
import { useState } from "react";
import Link from "next/link";

export default function KullaniciOlusturPage() {
  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    email: "",
    bolge: "",
    sehir: "",
    iskolu: "",
    bolum: "",
    birim: "",
    takim: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [actionResult, setActionResult] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    const requiredFields = [
      { field: 'firstname', label: 'İsim' },
      { field: 'lastname', label: 'Soyad' },
      { field: 'email', label: 'Email' }
    ];
    
    const missingFields = requiredFields.filter(
      item => !formData[item.field] || formData[item.field].trim() === ''
    );
    
    if (missingFields.length > 0) {
      setActionResult({ 
        error: "Lütfen zorunlu alanları doldurun.", 
        details: `Aşağıdaki alanlar zorunludur: ${missingFields.map(item => item.label).join(', ')}` 
      });
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setActionResult({ 
        error: "Geçersiz email formatı", 
        details: "Lütfen geçerli bir email adresi girin." 
      });
      return;
    }
    
    const token = typeof window !== "undefined" && localStorage.getItem("token");
    
    setIsLoading(true);
    setActionResult(null);

    try {
      const res = await fetch("/api/admin/kullaniciolustur", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "create_user",
          new_user_data: formData,
        }),
      });
     
      // Try to get JSON response, or text if JSON parsing fails
      let data;
      let responseText;
      try {
        responseText = await res.text();
        data = JSON.parse(responseText);
      } catch (error) {
        // Using error instead of parseError to avoid linting issues
        console.error("Failed to parse response as JSON:", responseText);
        console.error("Parse error details:", error);
        data = { error: "Invalid server response", details: responseText };
      }
      
      if (res.ok) {
        setActionResult({ success: data.message || "Yeni kullanıcı başarıyla oluşturuldu." });
        // Reset form after successful submission
        setFormData({
          firstname: "",
          lastname: "",
          email: "",
          bolge: "",
          sehir: "",
          iskolu: "",
          bolum: "",
          birim: "",
          takim: "",
        });
      } else {
        setActionResult({ 
          error: data.error || `Hata: ${res.status} ${res.statusText}`,
          details: data.details || responseText
        });
      }
    } catch (error) {
      console.error("Request error:", error);
      setActionResult({ 
        error: "İstek gönderilirken hata oluştu.", 
        details: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Fixed header */}
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
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-md shadow-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-center">İşlem yapılıyor...</p>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="pt-6 px-4 pb-32">
        <div className="shadow-md rounded p-5 bg-white mt-4 mb-10 max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-5">Yeni Kullanıcı Oluştur</h1>
          
          {/* Action result message */}
          {actionResult && (
            <div className={`p-4 mb-4 rounded-md ${actionResult.error ? 'bg-red-50 border-l-4 border-red-500' : 'bg-green-50 border-l-4 border-green-500'}`}>
              <p className={`font-semibold ${actionResult.error ? 'text-red-700' : 'text-green-700'}`}>
                {actionResult.error || actionResult.success}
              </p>
              {actionResult.details && (
                <div className="mt-2 text-sm overflow-auto max-h-32 bg-white/50 p-2 rounded">
                  {typeof actionResult.details === 'string' 
                    ? actionResult.details
                    : Array.isArray(actionResult.details)
                      ? actionResult.details.map((detail, idx) => <div key={idx}>{detail}</div>)
                      : JSON.stringify(actionResult.details, null, 2)
                  }
                </div>
              )}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left column */}
              <div className="space-y-4">
                <div>
                  <label className="block font-bold mb-2" htmlFor="firstname">
                    İsim:
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    type="text"
                    id="firstname"
                    name="firstname"
                    placeholder="İsim girin"
                    value={formData.firstname}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div>
                  <label className="block font-bold mb-2" htmlFor="lastname">
                    Soyad:
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    type="text"
                    id="lastname"
                    name="lastname"
                    placeholder="Soyad girin"
                    value={formData.lastname}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div>
                  <label className="block font-bold mb-2" htmlFor="email">
                    Email:
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    type="email"
                    id="email"
                    name="email"
                    placeholder="Email girin"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div>
                  <label className="block font-bold mb-2" htmlFor="bolge">
                    Bölge:
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    type="text"
                    id="bolge"
                    name="bolge"
                    placeholder="Bölge girin"
                    value={formData.bolge}
                    onChange={handleChange}
                  />
                </div>
                
                <div>
                  <label className="block font-bold mb-2" htmlFor="sehir">
                    Şehir:
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    type="text"
                    id="sehir"
                    name="sehir"
                    placeholder="Şehir girin"
                    value={formData.sehir}
                    onChange={handleChange}
                  />
                </div>
              </div>
              
              {/* Right column */}
              <div className="space-y-4">
                <div>
                  <label className="block font-bold mb-2" htmlFor="iskolu">
                    İşkolu:
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    type="text"
                    id="iskolu"
                    name="iskolu"
                    placeholder="İşkolu girin"
                    value={formData.iskolu}
                    onChange={handleChange}
                  />
                </div>
                
                <div>
                  <label className="block font-bold mb-2" htmlFor="bolum">
                    Bölüm:
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    type="text"
                    id="bolum"
                    name="bolum"
                    placeholder="Bölüm girin"
                    value={formData.bolum}
                    onChange={handleChange}
                  />
                </div>
                
                <div>
                  <label className="block font-bold mb-2" htmlFor="birim">
                    Birim:
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    type="text"
                    id="birim"
                    name="birim"
                    placeholder="Birim girin"
                    value={formData.birim}
                    onChange={handleChange}
                  />
                </div>
                
                <div>
                  <label className="block font-bold mb-2" htmlFor="takim">
                    Takım:
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    type="text"
                    id="takim"
                    name="takim"
                    placeholder="Takım girin"
                    value={formData.takim}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
            
            {/* Submit button */}
            <div className="mt-6">
              <button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline disabled:bg-gray-400"
                disabled={isLoading}
              >
                Yeni Kullanıcı Oluştur
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Add a style tag to ensure proper body styling */}
      <style jsx global>{`
        html, body {
          height: 100%;
          margin: 0;
          padding: 0;
          overflow-y: auto !important; /* Force scroll */
        }
    
        #__next, body > div:first-child {
          min-height: 100vh;
          position: relative;
        }
      `}</style>
    </>
  );
}