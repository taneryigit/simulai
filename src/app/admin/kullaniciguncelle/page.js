"use client";
import { useState } from "react";
import Link from "next/link";

export default function KullaniciGuncellePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionResult, setActionResult] = useState(null);
  const [updatedData, setUpdatedData] = useState({
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

  // Helper to retrieve JWT token from localStorage
  const getToken = () =>
    typeof window !== "undefined" && localStorage.getItem("token");

  // Search users when query has at least 3 characters
  const searchUsers = async (query) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }
    
    setIsLoading(true);
    setActionResult(null);
    
    try {
      
      const token = getToken();

      
      const res = await fetch("/api/admin/kullaniciguncelle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "search_users", query }),
      });
      
   
      
      const data = await res.json();
     
      
      if (data.users) {
        setSearchResults(data.users);
      } else if (data.error) {
        setActionResult({ error: data.error, details: data.details });
      }
    } catch (error) {
      console.error("❌ User search error:", error);
      setActionResult({ 
        error: "Kullanıcı arama sırasında hata oluştu.", 
        details: error.message 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch selected user's details
  const fetchUserDetails = async () => {
    if (!selectedUser) return;
    
    setIsLoading(true);
    setActionResult(null);
    
    try {
    
      const token = getToken();
      
      const res = await fetch("/api/admin/kullaniciguncelle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "get_user_details", user_id: selectedUser.id }),
      });
      
     
      
      const data = await res.json();
 
      
      if (data.user) {
        setUserDetails(data.user);
        setUpdatedData({
          firstname: data.user.firstname || "",
          lastname: data.user.lastname || "",
          email: data.user.email || "",
          bolge: data.user.bolge || "",
          sehir: data.user.sehir || "",
          iskolu: data.user.iskolu || "",
          bolum: data.user.bolum || "",
          birim: data.user.birim || "",
          takim: data.user.takim || "",
        });
      } else if (data.error) {
        setActionResult({ error: data.error, details: data.details });
      }
    } catch (error) {
      console.error("❌ Fetch user details error:", error);
      setActionResult({ 
        error: "Kullanıcı bilgileri alınırken hata oluştu.", 
        details: error.message 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle update form change
  const handleChange = (e) => {
    setUpdatedData({ ...updatedData, [e.target.name]: e.target.value });
  };

  // Submit updated user details
  const updateUser = async () => {
    if (!selectedUser) {
      setActionResult({ error: "Lütfen bir kullanıcı seçin." });
      return;
    }
    
    // Validate required fields
    const requiredFields = [
      { field: 'firstname', label: 'İsim' },
      { field: 'lastname', label: 'Soyad' },
      { field: 'email', label: 'Email' }
    ];
    
    const missingFields = requiredFields.filter(
      item => !updatedData[item.field] || updatedData[item.field].trim() === ''
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
    if (!emailRegex.test(updatedData.email)) {
      setActionResult({ 
        error: "Geçersiz email formatı", 
        details: "Lütfen geçerli bir email adresi girin." 
      });
      return;
    }
    
    setIsLoading(true);
    setActionResult(null);
    
    try {
     
      const token = getToken();
     
      
      const res = await fetch("/api/admin/kullaniciguncelle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "update_user",
          user_id: selectedUser.id,
          updated_data: updatedData,
        }),
      });
      
    
      
      // Try to get JSON response, or text if JSON parsing fails
      let data;
      let responseText;
      try {
        responseText = await res.text();
       
        data = JSON.parse(responseText);
        
      } catch (parseError) {
        console.error("❌ Failed to parse response as JSON:", responseText);
        console.error("❌ Parse error details:", parseError);
        data = { error: "Invalid server response", details: responseText };
      }
      
      if (res.ok) {
        setActionResult({ success: data.message || "Kullanıcı bilgileri başarıyla güncellendi." });
        // Optionally, clear the form or refresh details
        setUserDetails(null);
        setSelectedUser(null);
        setSearchResults([]);
        setSearchQuery("");
      } else {
        setActionResult({ 
          error: data.error || `Hata: ${res.status} ${res.statusText}`,
          details: data.details || responseText
        });
      }
    } catch (error) {
      console.error("❌ Update error:", error);
      setActionResult({ 
        error: "Kullanıcı güncelleme sırasında hata oluştu.", 
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
          <h1 className="text-2xl font-bold mb-5">Kullanıcı Güncelle</h1>
          
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
          
          {/* User Search Section */}
          <div className="mb-5">
            <label className="block font-bold mb-2" htmlFor="user-search">
              Kullanıcı Ara:
            </label>
            <div className="flex">
              <input
                className="w-full border border-gray-300 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                type="text"
                id="user-search"
                placeholder="En az 3 karakter girin..."
                value={searchQuery}
                onChange={(e) => {
                  const q = e.target.value;
                  setSearchQuery(q);
                  searchUsers(q);
                }}
              />
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-3 mb-5 border border-gray-200 rounded">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition"
                  onClick={() => {
                    setSelectedUser(user);
                    setSearchResults([]);
                    setSearchQuery("");
                  }}
                >
                  <span className="font-medium">{user.firstname} {user.lastname}</span> - 
                  <span className="text-gray-600 ml-1">{user.email}</span>
                </div>
              ))}
              <div className="p-2 text-xs text-gray-500">Seçmek için tıklayınız</div>
            </div>
          )}

          {selectedUser && (
            <div className="mb-5 p-3 bg-blue-50 border-l-4 border-blue-500 rounded-md">
              <p className="flex items-center">
                <span className="font-medium">Seçilen Kullanıcı:</span>
                <span className="ml-2">
                  {selectedUser.firstname} {selectedUser.lastname} - {selectedUser.email}
                </span>
                <button
                  className="ml-3 text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition"
                  onClick={() => {
                    setSelectedUser(null);
                    setUserDetails(null);
                  }}
                >
                  Seçimi Kaldır
                </button>
              </p>
            </div>
          )}

          {selectedUser && !userDetails && (
            <div className="my-5">
              <button 
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                onClick={fetchUserDetails}
              >
                Kullanıcı Bilgilerini Getir
              </button>
            </div>
          )}

          {userDetails && (
            <div className="mt-6">
              <h2 className="text-xl font-bold mb-4">Kullanıcı Bilgileri</h2>
              
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
                      value={updatedData.firstname}
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
                      value={updatedData.lastname}
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
                      value={updatedData.email}
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
                      value={updatedData.bolge}
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
                      value={updatedData.sehir}
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
                      value={updatedData.iskolu}
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
                      value={updatedData.bolum}
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
                      value={updatedData.birim}
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
                      value={updatedData.takim}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
              
              {/* Submit button */}
              <div className="mt-6">
                <button
                  type="button"
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline disabled:bg-gray-400"
                  onClick={updateUser}
                  disabled={isLoading}
                >
                  Kullanıcı Bilgilerini Güncelle
                </button>
              </div>
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