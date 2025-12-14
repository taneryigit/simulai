"use client";
import { useState } from "react";
import Link from "next/link";

export default function KullaniciOlusturExcelPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState("Dosya seçilmedi");
  const [isLoading, setIsLoading] = useState(false);
  const [actionResult, setActionResult] = useState(null);
  const [addedUsers, setAddedUsers] = useState([]);
  const [duplicateUsers, setDuplicateUsers] = useState([]);

  // Helper to retrieve the JWT token from localStorage
  const getToken = () => typeof window !== "undefined" && localStorage.getItem("token");

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    setFileName(file ? file.name : "Dosya seçilmedi");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setActionResult({ 
        error: "Lütfen bir Excel dosyası seçin.",
        details: "Kullanıcıları yüklemek için geçerli bir Excel dosyası gereklidir." 
      });
      return;
    }
    
    setIsLoading(true);
    setActionResult(null);
    setAddedUsers([]);
    setDuplicateUsers([]);

    const formData = new FormData();
    formData.append("excel_file", selectedFile);
    formData.append("action", "upload_excel");

    try {
      const token = getToken();
      const res = await fetch("/api/admin/kullaniciolusturexcel", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      
      let data;
      try {
        data = await res.json();
      } catch (error) {
        console.error("Failed to parse response as JSON:", error);
        data = { error: "Invalid server response" };
      }
      
      if (res.ok) {
        setActionResult({ 
          success: data.success_message || "Kullanıcılar başarıyla yüklendi." 
        });
        setAddedUsers(data.added_users || []);
        setDuplicateUsers(data.duplicate_users || []);
      } else {
        setActionResult({ 
          error: data.error || `Hata: ${res.status} ${res.statusText}`,
          details: data.details
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      setActionResult({ 
        error: "Dosya yüklenirken hata oluştu.", 
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
          <h1 className="text-2xl font-bold mb-5">Excel ile Toplu Kullanıcı Yükle</h1>
          
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
          
          {/* Template Download Section */}
          <div className="mb-6 p-4 bg-blue-50 rounded-md">
            <h2 className="text-lg font-semibold mb-2">Excel Şablonu</h2>
            <p className="mb-3 text-gray-700">Lütfen kullanıcıları eklemek için aşağıdaki Excel şablonunu kullanın:</p>
            <a 
             href="/sablonlar/kullanici_sablonu.xlsx" 
              className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition"
            >
              <span>Excel Şablonunu İndir</span>
            </a>
          </div>

          {/* Excel Upload Form */}
          <form onSubmit={handleSubmit} encType="multipart/form-data" className="mb-6">
            <div className="mb-4">
              <label className="block font-bold mb-2">Excel Dosyası Seçin:</label>
              <div className="flex items-center">
                <div className="relative flex-1">
                  <input 
                    type="file" 
                    id="excel_file"
                    name="excel_file" 
                    accept=".xlsx,.xls" 
                    onChange={handleFileChange}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                  />
                  <div className="flex items-center border border-gray-300 rounded bg-white">
                    <span className="bg-gray-100 py-2 px-4 border-r text-gray-600">Dosya Seç...</span>
                    <span className="px-4 overflow-hidden overflow-ellipsis whitespace-nowrap max-w-xs">
                      {fileName}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline disabled:bg-gray-400"
                disabled={isLoading}
              >
                Dosyayı Yükle
              </button>
            </div>
          </form>

          {/* Display Added Users */}
          {addedUsers.length > 0 && (
            <div className="mb-6 border border-gray-200 rounded-md overflow-hidden">
              <h3 className="text-lg font-semibold px-4 py-3 bg-gray-50 border-b">
                Aşağıdaki kullanıcılar yüklendi:
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2 w-16">No</th>
                      <th className="px-4 py-2">İsim</th>
                      <th className="px-4 py-2">Soyad</th>
                      <th className="px-4 py-2">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {addedUsers.map((user, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 border-b border-gray-100">{index + 1}.</td>
                        <td className="px-4 py-2 border-b border-gray-100">{user.firstname}</td>
                        <td className="px-4 py-2 border-b border-gray-100">{user.lastname}</td>
                        <td className="px-4 py-2 border-b border-gray-100">{user.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 text-right bg-gray-50 border-t">
                <span className="font-bold">Toplam Yüklenen: {addedUsers.length} kullanıcı</span>
              </div>
            </div>
          )}

          {/* Display Duplicate Users */}
          {duplicateUsers.length > 0 && (
            <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-md">
              <h3 className="text-lg font-semibold mb-2">Sistemde kayıtlı olan kullanıcılar:</h3>
              <ul className="space-y-1 list-disc pl-5">
                {duplicateUsers.map((user, index) => (
                  <li key={index} className="text-gray-700">
                    {user.firstname} {user.lastname} ({user.email})
                  </li>
                ))}
              </ul>
            </div>
          )}
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