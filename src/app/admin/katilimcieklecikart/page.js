"use client";
import { useState } from "react";
import Link from "next/link";

export default function KatilimciEkleCikartPage() {
  const [courseQuery, setCourseQuery] = useState("");
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [currentAction, setCurrentAction] = useState(""); // "add" or "remove"
  const [userQuery, setUserQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [enrolledUsers, setEnrolledUsers] = useState([]); // State for currently enrolled users
  const [isLoading, setIsLoading] = useState(false); // Loading state for API operations
  const [actionResult, setActionResult] = useState(null); // For storing success/error messages

  // Helper: get JWT token from localStorage
  const getToken = () =>
    typeof window !== "undefined" && localStorage.getItem("token");

  // Search courses after 3+ characters
  const searchCourses = async (query) => {
    if (query.length < 3) {
      setCourses([]);
      return;
    }
    
    setIsLoading(true);
    try {
      const token = getToken();
      const res = await fetch("/api/admin/katilimcieklecikart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "search_courses", query }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error("Course search API error:", errorData);
        setActionResult({ error: errorData.error || "Sınıf arama hatası" });
        setCourses([]);
      } else {
        const data = await res.json();
        setCourses(data.courses || []);
        setActionResult(null);
      }
    } catch (err) {
      console.error("Course search error:", err);
      setActionResult({ error: "Sınıf arama sırasında bir hata oluştu." });
      setCourses([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Search users based on the action
  const searchUsers = async (query) => {
    if (query.length < 3 || !selectedCourse) {
      setUsers([]);
      return;
    }
    
    setIsLoading(true);
    try {
      const token = getToken();
      const actionToSend = currentAction === "add" ? "search_users_to_add" : "search_users";
      const res = await fetch("/api/admin/katilimcieklecikart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: actionToSend, query, course_name: selectedCourse }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error("User search API error:", errorData);
        setActionResult({ error: errorData.error || "Kullanıcı arama hatası" });
        setUsers([]);
      } else {
        const data = await res.json();
        setUsers(data.users || []);
        setActionResult(null);
      }
    } catch (err) {
      console.error("User search error:", err);
      setActionResult({ error: "Kullanıcı arama sırasında bir hata oluştu." });
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all enrolled users for a selected class
  const fetchEnrolledUsers = async (courseName) => {
    setIsLoading(true);
    try {
      const token = getToken();
      const res = await fetch("/api/admin/katilimcieklecikart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          action: "search_users", 
          query: "%", // Wild card to get all users
          course_name: courseName 
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error("Enrolled users fetch API error:", errorData);
        setActionResult({ error: errorData.error || "Kayıtlı kullanıcıları alma hatası" });
        setEnrolledUsers([]);
      } else {
        const data = await res.json();
        setEnrolledUsers(data.users || []);
        setActionResult(null);
      }
    } catch (err) {
      console.error("Enrolled users fetch error:", err);
      setActionResult({ error: "Kayıtlı kullanıcıları alma sırasında bir hata oluştu." });
      setEnrolledUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle course selection
  const handleCourseSelect = (courseName) => {
    setSelectedCourse(courseName);
    setCourses([]);
    setCourseQuery("");
    setCurrentAction(""); // reset action
    setUsers([]);
    setUserQuery("");
    setSelectedUsers([]);
    setActionResult(null);
    
    // Fetch enrolled users when a course is selected
    fetchEnrolledUsers(courseName);
  };

  // Handle action selection ("add" or "remove")
  const handleActionSelect = (action) => {
    setCurrentAction(action);
    setUsers([]);
    setUserQuery("");
    setSelectedUsers([]);
    setActionResult(null);
  };

  // Add a user from search results to the selection
  const handleUserSelect = (user) => {
    if (!selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  // Remove a selected user
  const removeUser = (userId) => {
    setSelectedUsers(selectedUsers.filter((u) => u.id !== userId));
  };

  // Remove all selected users
  const removeAllUsers = () => {
    setSelectedUsers([]);
  };

  // Keep track of completed actions to display summary
  const [actionSummary, setActionSummary] = useState({
    action: "", // "add" or "remove"
    courseName: "",
    users: [],
    timestamp: null
  });

  // Execute the action (add or remove) on selected users
  const executeAction = async () => {
    if (selectedUsers.length === 0) {
      setActionResult({ error: `Lütfen ${currentAction === "add" ? "eklenecek" : "çıkartılacak"} katılımcıları seçin.` });
      return;
    }
    
    setIsLoading(true);
    setActionResult(null);
    
    // Save the current state before potential reset
    const actionType = currentAction;
    const targetCourse = selectedCourse;
    const targetUsers = [...selectedUsers]; // Make a copy
    
    try {
      const token = getToken();
      const res = await fetch("/api/admin/katilimcieklecikart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: actionType === "add" ? "add_users" : "remove_users",
          user_ids: targetUsers.map((u) => u.id),
          course_name: targetCourse,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        console.error(`API ${actionType} error:`, data);
        setActionResult({ 
          error: data.error || `İşlem başarısız: ${res.status}`, 
          details: data.details || [] 
        });
      } else {
        if (data.error) {
          setActionResult({ error: data.error, details: data.details || [] });
        } else {
          // Save action summary before resetting the form
          setActionSummary({
            action: actionType,
            courseName: targetCourse,
            users: targetUsers,
            timestamp: new Date(),
            successCount: data.successCount || 0
          });
          
          // Reset the form to initial state but keep the course selected
          setCurrentAction("");
          setUsers([]);
          setUserQuery("");
          setSelectedUsers([]);
          
          // Add success message
          setActionResult({ success: data.message, details: data.errors || [] });
          
          // Refresh the enrolled users list after successful action
          fetchEnrolledUsers(targetCourse);
        }
      }
    } catch (err) {
      console.error("Action execution error:", err);
      setActionResult({ error: "İşlem sırasında bir hata oluştu." });
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

      {/* Main content - using static positioning instead of fixed/absolute */}
      <div className="pt-6 px-4 pb-32"> {/* Large bottom padding to ensure scrollability */}
        <div className="shadow-md rounded p-5 bg-white mt-4 mb-10 max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-5">Katılımcı Ekle / Çıkart</h1>

          {/* Action result message */}
          {actionResult && (
            <div className={`p-4 mb-4 rounded-md ${actionResult.error ? 'bg-red-50 border-l-4 border-red-500' : 'bg-green-50 border-l-4 border-green-500'}`}>
              <p className={`font-semibold ${actionResult.error ? 'text-red-700' : 'text-green-700'}`}>
                {actionResult.error || actionResult.success}
              </p>
              {actionResult.details && actionResult.details.length > 0 && (
                <ul className="mt-2 ml-5 list-disc">
                  {actionResult.details.map((detail, index) => (
                    <li key={index} className="text-sm mt-1">{detail}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          
          {/* Action Summary Display */}
          {actionSummary.timestamp && (
            <div className="p-4 mb-4 bg-blue-50 border-l-4 border-blue-500 rounded-md">
              <h3 className="font-bold text-blue-800">
                Son İşlem Özeti:
              </h3>
              <p className="mt-2">
                <span className="font-semibold">Sınıf:</span> {actionSummary.courseName}
              </p>
              <p className="mt-1">
                <span className="font-semibold">İşlem:</span> {actionSummary.action === "add" ? "Katılımcı Ekleme" : "Katılımcı Çıkartma"}
              </p>
              <p className="mt-1">
                <span className="font-semibold">Sonuç:</span> {actionSummary.successCount} katılımcı başarıyla {actionSummary.action === "add" ? "eklendi" : "çıkartıldı"}
              </p>
              
              {actionSummary.users.length > 0 && (
                <div className="mt-2">
                  <p className="font-semibold">İşlem yapılan katılımcılar:</p>
                  <ul className="ml-5 mt-1 list-disc">
                    {actionSummary.users.map((user, index) => (
                      <li key={index} className="text-sm mt-1">{user.display}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <p className="mt-2 text-xs text-gray-500">
                {new Date(actionSummary.timestamp).toLocaleTimeString()} tarihinde gerçekleştirildi
              </p>
            </div>
          )}

          {/* Course Search Section */}
          <div className="mb-4">
            <label className="block font-bold mb-2" htmlFor="course-search">
              Sınıf Ara:
            </label>
            <input
              className="w-full border border-gray-300 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="text"
              id="course-search"
              placeholder="Sınıf adını girin..."
              value={courseQuery}
              onChange={(e) => {
                const q = e.target.value;
                setCourseQuery(q);
                searchCourses(q);
              }}
            />
          </div>
          
          {courses.length > 0 && (
            <div id="course-results" className="mt-2 max-h-40 overflow-y-auto border rounded">
              {courses.map((course) => (
                <div
                  key={course}
                  className="cursor-pointer py-2.5 px-2.5 border-b border-gray-300 hover:bg-gray-100"
                  onClick={() => handleCourseSelect(course)}
                >
                  {course}
                </div>
              ))}
              <div className="text-gray-500 text-sm p-2">Seçmek için tıklayınız</div>
            </div>
          )}

          {selectedCourse && (
            <div id="selected-course" className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mt-3">
              <p>
                Seçilen Sınıf: <span id="selected-course-name">{selectedCourse}</span>
                <span
                  id="remove-selected-course"
                  className="bg-red-500 text-white text-xs rounded px-2 py-1 ml-2.5 cursor-pointer"
                  onClick={() => {
                    setSelectedCourse("");
                    setEnrolledUsers([]);
                    setActionResult(null);
                  }}
                >
                  Seçimi Kaldır
                </span>
              </p>
            </div>
          )}

          {/* Enrolled Users Section */}
          {selectedCourse && enrolledUsers.length > 0 && (
            <div className="mt-4">
              <h2 className="font-bold text-lg mb-2">Mevcut Katılımcılar:</h2>
              <div className="border rounded overflow-hidden">
                <div className="max-h-40 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İsim</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Soyisim</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {enrolledUsers.map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.firstname}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.lastname}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="bg-gray-50 px-4 py-3 border-t">
                  <span className="text-sm text-gray-700">
                    Toplam: <span className="font-medium">{enrolledUsers.length}</span> katılımcı
                  </span>
                </div>
              </div>
            </div>
          )}

          {selectedCourse && (
            <div id="action-selection" className="flex gap-2 mt-4">
              <button 
                className={`text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${currentAction === 'add' ? 'bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'}`}
                onClick={() => handleActionSelect("add")}
              >
                Katılımcı Ekle
              </button>
              <button 
                className={`text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${currentAction === 'remove' ? 'bg-red-700' : 'bg-red-500 hover:bg-red-600'}`}
                onClick={() => handleActionSelect("remove")}
              >
                Katılımcı Çıkart
              </button>
            </div>
          )}

          {currentAction && (
            <div id="user-search-section" className="mt-4">
              <div className="mb-4">
                <label className="block font-bold mb-2" htmlFor="user-search">
                  Katılımcı Seç:
                </label>
                <input
                  className="w-full border border-gray-300 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  type="text"
                  id="user-search"
                  placeholder="Katılımcı adını girin..."
                  value={userQuery}
                  onChange={(e) => {
                    const q = e.target.value;
                    setUserQuery(q);
                    searchUsers(q);
                  }}
                />
              </div>

              {users.length > 0 && (
                <div id="user-results" className="mt-2 border rounded-md overflow-hidden">
                  <div className="max-h-40 overflow-y-auto">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="cursor-pointer py-2.5 px-2.5 border-b border-gray-300 hover:bg-gray-100"
                        onClick={() => handleUserSelect({
                          id: user.id,
                          display: `${user.firstname} ${user.lastname} (${user.email})`
                        })}
                      >
                        {user.firstname} {user.lastname} - {user.email}
                      </div>
                    ))}
                  </div>
                  <div className="text-gray-500 text-sm p-2 bg-gray-50">Seçmek için tıklayınız</div>
                </div>
              )}

              <div className="border rounded-md shadow-sm mt-4 mb-8"> {/* Increased bottom margin */}
                <div className="bg-gray-100 px-4 py-3 border-b flex items-center">
                  <h3 className="font-bold">
                    Seçilen Katılımcılar{" "}
                    {selectedUsers.length > 0 && (
                      <span
                        id="remove-all-users"
                        className="bg-red-500 text-white text-xs rounded px-2 py-1 ml-2 cursor-pointer"
                        onClick={removeAllUsers}
                      >
                        Tümünü Kaldır
                      </span>
                    )}
                  </h3>
                </div>
                <div className="p-4 max-h-40 overflow-y-auto">
                  <ul id="selected-users" className="divide-y divide-gray-200">
                    {selectedUsers.map((user) => (
                      <li key={user.id} className="py-2 flex justify-between items-center">
                        <span>{user.display}</span>
                        <button 
                          className="w-5 h-5 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center hover:bg-gray-400" 
                          onClick={() => removeUser(user.id)}
                        >
                          <span className="text-xs leading-none">&times;</span>
                        </button>
                      </li>
                    ))}
                    {selectedUsers.length === 0 && (
                      <li className="py-2 text-gray-500 italic">Henüz katılımcı seçilmedi</li>
                    )}
                  </ul>
                </div>
                
                {/* Action Button */}
                <div className="border-t">
                  <button
                    id="action-button"
                    className={`block w-full text-center py-4 font-bold ${
                      currentAction === 'add' 
                        ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                        : 'bg-red-500 hover:bg-red-600 text-white'
                    }`}
                    onClick={executeAction}
                    disabled={selectedUsers.length === 0 || isLoading}
                  >
                    {currentAction === "add" ? "Katılımcı Ekle" : "Katılımcı Çıkart"}
                  </button>
                </div>
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