//app/admin/sinifolustur/page.js
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function SinifOlusturPage() {
  // Step tracking
  const [currentStep, setCurrentStep] = useState(1);
  
  // Data from API
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [setError] = useState(null);

  // Form state
  const [classForm, setClassForm] = useState({
    className: "",
    courseId: "",
    startDate: "",
    endDate: ""
  });
  
  // Message state
  const [message, setMessage] = useState(null);
  
  // User filtering
  const [filters, setFilters] = useState({
    iskolu: "",
    bolum: "",
    bolge: "",
    sehir: "",
    birim: "",
    takim: ""
  });
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  
  // Excel upload
  const [excelFile, setExcelFile] = useState(null);
  const [excelData, setExcelData] = useState(null);
  const [unmatchedEmails, setUnmatchedEmails] = useState([]);
  
  // Active tab
  const [activeTab, setActiveTab] = useState("manual");

  // Get token from localStorage
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // Fetch data on mount
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/sinifolustur", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to fetch data");
        }
        
        const json = await res.json();
        setData(json);
        setFilteredUsers(json.users);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    if (token) {
      fetchData();
    } else {
      setError("Authentication token not found. Please log in again.");
      setLoading(false);
    }
  }, [token,setError]);

  // Filter users based on selected attributes
  useEffect(() => {
    if (!data || !data.users) return;

    let filtered = [...data.users];
    
    // Apply each filter with a value
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter(user => user[key] === value);
      }
    });
    
    setFilteredUsers(filtered);
  }, [filters, data]);

  // Handle form field changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setClassForm(prev => ({ ...prev, [name]: value }));
  };

  // Update filters
  const handleFilterChange = (attribute, value) => {
    const newFilters = { ...filters };
    newFilters[attribute] = value;
    
    // Reset all filters after the changed one
    const attributes = Object.keys(filters);
    const currentIndex = attributes.indexOf(attribute);
    
    for (let i = currentIndex + 1; i < attributes.length; i++) {
      newFilters[attributes[i]] = "";
    }
    
    setFilters(newFilters);
  };

  // Fetch filtered users
  const fetchFilteredUsers = () => {
    setMessage({ success: `${filteredUsers.length} kullanıcı filtrelere göre bulundu.` });
    setTimeout(() => setMessage(null), 3000);
  };

  // User selection handler
  const handleUserSelect = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // Excel file handling
  const handleExcelUpload = async (e) => {
    e.preventDefault();
    
    if (!excelFile) {
      setMessage({ error: "Lütfen bir Excel dosyası seçin." });
      return;
    }
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", excelFile);
      
      if (classForm.courseId) {
        formData.append("course_id", classForm.courseId);
      }

      const res = await fetch("/api/admin/process_excel", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Excel dosyasını işlerken hata oluştu");
      }
      
      const result = await res.json();
      
      if (result.data) {
        setExcelData(result.data);
      }
      
      if (result.unmatched_emails && result.unmatched_emails.length > 0) {
        setUnmatchedEmails(result.unmatched_emails);
      }
      
      if (result.new_users && result.new_users.length > 0) {
        // Add users from the result to selected users
        const userIds = result.new_users.map(user => user.id);
        setSelectedUsers(prev => [...new Set([...prev, ...userIds])]);
        setMessage({ success: `${result.new_users.length} kullanıcı Excel'den eklendi.` });
      } else if (result.unmatched_emails?.length > 0) {
        setMessage({ 
          warning: "Bazı e-postalar sistemde bulunamadı.", 
          details: result.unmatched_emails 
        });
      } else {
        setMessage({ success: "Excel dosyası başarıyla işlendi." });
      }
    } catch (err) {
      console.error("Excel upload error:", err);
      setMessage({ error: `Hata: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  // Navigate between steps
  const goToStep = (step) => {
    // Validate current step
    if (step > currentStep) {
      if (currentStep === 1 && !classForm.courseId) {
        setMessage({ error: "Lütfen önce bir eğitim seçin." });
        return;
      }
      if (currentStep === 2 && (!classForm.startDate || !classForm.endDate)) {
        setMessage({ error: "Lütfen başlangıç ve bitiş tarihlerini seçin." });
        return;
      }
      if (currentStep === 3 && !classForm.className) {
        setMessage({ error: "Lütfen bir sınıf adı girin." });
        return;
      }
    }
    
    setCurrentStep(step);
    setMessage(null);
  };

  // Helper to get selected course name
  const getSelectedCourseName = () => {
    if (!data || !classForm.courseId) return '';
    const course = data.courses.find(c => c.course_id.toString() === classForm.courseId);
    return course ? course.course_name : '';
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!classForm.courseId || !classForm.className || selectedUsers.length === 0) {
      setMessage({ error: "Lütfen tüm alanları doldurun ve en az bir katılımcı seçin." });
      return;
    }
    
    setLoading(true);
    setMessage(null);
    
    try {
      // First create the class
      const createRes = await fetch("/api/admin/sinifolustur", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "createClass",
          data: {
            className: classForm.className,
            courseId: parseInt(classForm.courseId),
            startDate: classForm.startDate || null,
            endDate: classForm.endDate || null,
            ownerId: parseInt(data.user.id || 0)
          },
        }),
      });
      
      if (!createRes.ok) {
        const errorData = await createRes.json();
        throw new Error(errorData.error || "Sınıf oluşturma hatası");
      }
      
      const createResult = await createRes.json();
      
      if (!createResult.success) {
        throw new Error(createResult.error || "Sınıf oluşturma başarısız");
      }
      
      const classId = createResult.newClass.id;
      
      // Now create enrollments for each selected user (excluding admin)
      const course = data.courses.find(c => c.course_id.toString() === classForm.courseId.toString());
      if (!course) {
        throw new Error("Seçilen eğitim bilgisi bulunamadı");
      }
      
      // Prepare enrollment records for selected users
      const enrollmentRecords = selectedUsers.map(userId => {
        const user = data.users.find(u => u.id === userId);
        if (!user) {
          console.warn(`User with ID ${userId} not found`);
          return null;
        }
        
        return {
          companyid: user.companyid || data.user.companyid,
          user_id: parseInt(userId),
          course_id: parseInt(classForm.courseId),
          course_name: course.course_name,
          class_name: classForm.className,
          class_start_date: classForm.startDate || null,
          class_end_date: classForm.endDate || null,
          firstname: user.firstname || '',
          lastname: user.lastname || '',
          course_user_passive: 0
        };
      }).filter(record => record !== null); // Remove any null records
      
      console.log(`Sending ${enrollmentRecords.length} enrollment records`);
      
      // Create enrollments for selected users
      const enrollRes = await fetch("/api/admin/process_enrollment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ records: enrollmentRecords }),
      });
      
      if (!enrollRes.ok) {
        const errorData = await enrollRes.json();
        throw new Error(errorData.error || "Katılımcı kayıt hatası");
      }
      
      const enrollResult = await enrollRes.json();
      
      // Set success message
      setMessage({ 
        success: enrollResult.message || "Sınıf başarıyla oluşturuldu!",
        details: [
          `${enrollResult.inserted || enrollmentRecords.length} katılımcı kaydedildi.`,
          `Sınıf oluşturma tarihi: ${new Date().toLocaleString()}`,
          `Sınıf ID: ${classId}`
        ]
      });
      
      // Reset form but keep user selection to allow multiple class creation
      setClassForm({
        className: "",
        courseId: "",
        startDate: "",
        endDate: ""
      });
      setCurrentStep(1);
      
    } catch (err) {
      console.error("Submit error:", err);
      setMessage({ error: `Hata: ${err.message}` });
    } finally {
      setLoading(false);
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
      {loading && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-md shadow-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-center">İşlem yapılıyor...</p>
          </div>
        </div>
      )}

      {/* Main content - using static positioning */}
      <div className="pt-6 px-4 pb-32"> {/* Large bottom padding for scrollability */}
        <div className="shadow-md rounded p-5 bg-white mt-4 mb-10 max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-5">Sınıf Oluşturma</h1>

          {/* Message display */}
          {message && (
            <div className={`p-4 mb-4 rounded-md border-l-4 ${
              message.error ? 'bg-red-50 border-red-500 text-red-700' : 
              message.warning ? 'bg-yellow-50 border-yellow-500 text-yellow-700' :
              'bg-green-50 border-green-500 text-green-700'
            }`}>
              <p className="font-semibold">
                {message.error || message.warning || message.success}
              </p>
              {message.details && (
                <ul className="mt-2 ml-5 list-disc">
                  {Array.isArray(message.details) ? 
                    message.details.map((detail, index) => (
                      <li key={index} className="text-sm mt-1">{detail}</li>
                    )) :
                    <li className="text-sm mt-1">{message.details}</li>
                  }
                </ul>
              )}
            </div>
          )}

          {/* Step Navigation */}
          <div className="flex mb-4 border-b">
            {[
              { num: 1, name: "Eğitim Seçiniz" },
              { num: 2, name: "Tarih Seçiniz" },
              { num: 3, name: "Sınıfa İsim Veriniz" },
              { num: 4, name: "Katılımcı Ekleyiniz" }
            ].map((step) => (
              <div 
                key={step.num}
                className={`cursor-pointer py-2 px-4 border-b-2 ${
                  currentStep === step.num 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent hover:text-blue-500'
                }`}
                onClick={() => goToStep(step.num)}
              >
                <span className="font-bold">{step.num}.</span> {step.name}
              </div>
            ))}
          </div>

          {/* Selections Summary Display - NEW SECTION */}
          <div className="mb-6 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
            <h3 className="font-bold mb-2">Seçimleriniz:</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-500">Eğitim:</span>
                <p className="text-gray-800">{getSelectedCourseName() || 'Henüz seçilmedi'}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Tarih Aralığı:</span>
                <p className="text-gray-800">
                  {classForm.startDate && classForm.endDate 
                    ? `${formatDate(classForm.startDate)} - ${formatDate(classForm.endDate)}`
                    : 'Henüz seçilmedi'}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Sınıf Adı:</span>
                <p className="text-gray-800">{classForm.className || 'Henüz seçilmedi'}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Step 1: Course Selection */}
            <div className={currentStep === 1 ? 'block' : 'hidden'}>
              <div className="mb-4">
                <label className="block font-bold mb-2" htmlFor="courseId">
                  Eğitim Seçiniz:
                </label>
                <select
                  id="courseId"
                  name="courseId"
                  value={classForm.courseId}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Bir eğitim seçiniz</option>
                  {data?.courses?.map(course => (
                    <option key={course.course_id} value={course.course_id}>
                      {course.course_name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  onClick={() => goToStep(2)}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  İleri
                </button>
              </div>
            </div>
            
            {/* Step 2: Date Selection */}
            <div className={currentStep === 2 ? 'block' : 'hidden'}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-bold mb-2" htmlFor="startDate">
                    Başlangıç Tarihi:
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={classForm.startDate}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block font-bold mb-2" htmlFor="endDate">
                    Bitiş Tarihi:
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={classForm.endDate}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              
              <div className="flex justify-between mt-6">
                <button
                  type="button"
                  onClick={() => goToStep(1)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Geri
                </button>
                <button
                  type="button"
                  onClick={() => goToStep(3)}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  İleri
                </button>
              </div>
            </div>
            
            {/* Step 3: Class Name */}
            <div className={currentStep === 3 ? 'block' : 'hidden'}>
              <div className="mb-4">
                <label className="block font-bold mb-2" htmlFor="className">
                  Sınıfınıza İsim Veriniz:
                </label>
                <textarea
                  id="className"
                  name="className"
                  value={classForm.className}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  maxLength="144"
                  placeholder="Sınıf isminiz daha önce verilmemiş olmalıdır..."
                  required
                ></textarea>
                <p className="text-sm text-gray-500 mt-1">
                  {classForm.className.length}/144 karakter
                </p>
              </div>
              
              {classForm.className && (
                <div className="mt-4 p-3 bg-gray-100 rounded border-l-4 border-blue-500">
                  <p className="font-medium">Sınıf Adı: {classForm.className}</p>
                </div>
              )}
              
              <div className="flex justify-between mt-6">
                <button
                  type="button"
                  onClick={() => goToStep(2)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Geri
                </button>
                <button
                  type="button"
                  onClick={() => goToStep(4)}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  İleri
                </button>
              </div>
            </div>
            
            {/* Step 4: Participant Selection */}
            <div className={currentStep === 4 ? 'block' : 'hidden'}>
              <h3 className="font-bold text-lg mb-4">Katılımcı Ekleyiniz</h3>
              
              {/* Tab Navigation */}
              <div className="mb-6 border-b">
                <ul className="flex">
                  <li className="mr-1">
                    <button 
                      type="button"
                      className={`py-2 px-4 font-semibold border-b-2 ${
                        activeTab === 'manual' 
                          ? 'border-blue-500 text-blue-600' 
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                      onClick={() => setActiveTab('manual')}
                    >
                      Katılımcı Seçerek Kayıt
                    </button>
                  </li>
                  <li className="mr-1">
                    <button 
                      type="button" 
                      className={`py-2 px-4 font-semibold border-b-2 ${
                        activeTab === 'excel' 
                          ? 'border-blue-500 text-blue-600' 
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                      onClick={() => setActiveTab('excel')}
                    >
                      Excel ile Kayıt
                    </button>
                  </li>
                </ul>
              </div>
              
              {/* Manual Selection Tab */}
              <div className={activeTab === 'manual' ? 'block' : 'hidden'}>
                <h4 className="font-bold mb-4">Filtrelere Göre Katılımcı Seçiniz</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  {Object.keys(filters).map((key, index) => (
                    <div key={key} className="mb-2">
                      <label className="block text-sm font-medium mb-1 capitalize" htmlFor={key}>
                        {key}:
                      </label>
                      <select
                        id={key}
                        value={filters[key]}
                        onChange={(e) => handleFilterChange(key, e.target.value)}
                        className="w-full border border-gray-300 rounded py-2 px-3"
                        disabled={index > 0 && !filters[Object.keys(filters)[index - 1]]}
                      >
                        <option value="">Seçin</option>
                        {data?.options[key]?.map(value => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                
                <button
                  type="button"
                  onClick={fetchFilteredUsers}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 w-full mb-6"
                >
                  Katılımcıları Getir
                </button>
                
                {filteredUsers.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-bold mb-2">Filtrelenmiş Katılımcılar: {filteredUsers.length}</h4>
                    
                    <div className="border rounded overflow-hidden">
                      <div className="max-h-60 overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seç</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İsim</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Soyisim</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bolum</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredUsers.map(user => (
                              <tr key={user.id}>
                                <td className="px-3 py-2 whitespace-nowrap">
                                  <input
                                    type="checkbox"
                                    checked={selectedUsers.includes(user.id)}
                                    onChange={(e) => handleUserSelect(user.id, e.target.checked)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{user.firstname}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{user.lastname}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{user.bolum || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Excel Upload Tab */}
              <div className={activeTab === 'excel' ? 'block' : 'hidden'}>
                <div className="mb-4">
                  <label className="block font-bold mb-2">
                    Excel Dosyası (.xlsx, .xls)
                  </label>
                  <div className="flex items-center">
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={(e) => setExcelFile(e.target.files[0])}
                      className="w-full border border-gray-300 rounded py-1 px-2"
                    />
                  </div>
                  {excelFile && (
                    <p className="mt-2 text-sm text-gray-600">
                      Seçilen dosya: {excelFile.name}
                    </p>
                  )}
                </div>
                
                <button
                  type="button"
                  onClick={handleExcelUpload}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 w-full mb-4"
                >
                  Katılımcıları Excel İle Yükle
                </button>
                
                {excelData && (
                  <div className="mt-4 p-3 bg-green-100 border-l-4 border-green-500 rounded">
                    <p className="font-semibold">Excel verileri başarıyla işlendi!</p>
                    <p>{excelData.length} satır bulundu.</p>
                  </div>
                )}
                
                {unmatchedEmails.length > 0 && (
                  <div className="mt-4 p-3 bg-yellow-100 border-l-4 border-yellow-500 rounded">
                    <p className="font-semibold">Sistemde bulunmayan e-postalar:</p>
                    <ul className="mt-2 list-disc list-inside">
                      {unmatchedEmails.map((email, index) => (
                        <li key={index} className="text-sm">{email}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              {/* Selected Users - Common for both tabs */}
              <div className="mt-6">
                <div className="bg-gray-100 px-4 py-3 border rounded-t flex items-center">
                  <h3 className="font-bold">Seçilen Katılımcılar ({selectedUsers.length})</h3>
                  
                  {selectedUsers.length > 0 && (
                    <button
                      type="button"
                      className="ml-auto bg-red-100 text-red-700 text-sm rounded px-2 py-1 hover:bg-red-200"
                      onClick={() => setSelectedUsers([])}
                    >
                      Tümünü Kaldır
                    </button>
                  )}
                </div>
                
                <div className="border border-t-0 rounded-b p-3 max-h-40 overflow-y-auto">
                  {selectedUsers.length === 0 ? (
                    <p className="text-gray-500 italic">Henüz katılımcı seçilmedi</p>
                  ) : (
                    <ul className="divide-y divide-gray-200">
                      {selectedUsers.map(userId => {
                        const user = data?.users?.find(u => u.id === userId);
                        return user ? (
                          <li key={userId} className="py-2 flex justify-between items-center">
                            <span>{user.firstname} {user.lastname}</span>
                            <button
                              type="button"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => setSelectedUsers(prev => prev.filter(id => id !== userId))}
                            >
                              ✕
                            </button>
                          </li>
                        ) : null;
                      })}
                    </ul>
                  )}
                </div>
              </div>
              
              <div className="flex justify-between mt-6">
                <button
                  type="button"
                  onClick={() => goToStep(3)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Geri
                </button>
                <button
                  type="submit"
                  className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  disabled={selectedUsers.length === 0}
                >
                  Sınıf Oluştur
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      
      {/* Add styles to ensure proper body styling */}
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