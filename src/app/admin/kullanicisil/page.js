"use client";
import { useState } from "react";
import Link from "next/link";

export default function KullaniciSilPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionResult, setActionResult] = useState(null);

  // Helper: get JWT token from localStorage
  const getToken = () =>
    typeof window !== "undefined" && localStorage.getItem("token");

  // Search users when the query length is at least 3
  const searchUsers = async (query) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }
    
    setIsLoading(true);
    setActionResult(null);
    
    try {
      const token = getToken();
      const res = await fetch("/api/admin/kullanicisil", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action: "search_users", query })
      });
      
      const data = await res.json();
      
      if (data.users) {
        setSearchResults(data.users);
      } else if (data.error) {
        setActionResult({ error: data.error, details: data.details });
      }
    } catch (error) {
      console.error("User search error:", error);
      setActionResult({ 
        error: "Kullanıcı arama sırasında hata oluştu.", 
        details: error.message 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Delete selected user
  const deleteUser = async () => {
    if (!selectedUser) {
      setActionResult({ error: "Lütfen bir kullanıcı seçin." });
      return;
    }
    
    // Use the actionResult instead of confirm dialog for consistency
    setActionResult({
      confirmation: true,
      message: "Bu kullanıcıyı silmek istediğinizden emin misiniz?",
      user: selectedUser
    });
  };
  
  // Confirm deletion after user confirms
  const confirmDeletion = async () => {
    setIsLoading(true);
    setActionResult(null);
    
    try {
      const token = getToken();
      const res = await fetch("/api/admin/kullanicisil", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action: "delete_user", user_id: selectedUser.id })
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
        setActionResult({ success: data.message || "Kullanıcı başarıyla silindi." });
        setSelectedUser(null);
      } else {
        setActionResult({ 
          error: data.error || `Hata: ${res.status} ${res.statusText}`,
          details: data.details || responseText
        });
      }
    } catch (error) {
      console.error("Delete error:", error);
      setActionResult({ 
        error: "Kullanıcı silinirken hata oluştu.", 
        details: error.message 
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Cancel deletion
  const cancelDeletion = () => {
    setActionResult(null);
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
          <h1 className="text-2xl font-bold mb-5">Kullanıcı Sil</h1>
          
          {/* Action result message */}
          {actionResult && !actionResult.confirmation && (
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
          
          {/* Confirmation dialog */}
          {actionResult && actionResult.confirmation && (
            <div className="p-4 mb-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-md">
              <p className="font-semibold text-yellow-800">{actionResult.message}</p>
              <div className="mt-3 flex space-x-3">
                <button 
                  className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded"
                  onClick={confirmDeletion}
                >
                  Evet, Kullanıcıyı Sil
                </button>
                <button 
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded"
                  onClick={cancelDeletion}
                >
                  İptal
                </button>
              </div>
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
                  }}
                >
                  Seçimi Kaldır
                </button>
              </p>
            </div>
          )}

          {selectedUser && !actionResult?.confirmation && (
            <div className="mt-6">
              <button
                type="button"
                className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline disabled:bg-gray-400"
                onClick={deleteUser}
                disabled={isLoading}
              >
                Kullanıcıyı Sil
              </button>
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