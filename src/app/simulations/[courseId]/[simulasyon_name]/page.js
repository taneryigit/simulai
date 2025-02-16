//src/app/simulations/[courseId]/[simulasyon_name]/page.js
"use client";
import { AuthContext } from "@/context/AuthContext";
import { useParams } from "next/navigation";
import { useEffect, useState, useContext, useRef } from "react";
import TopNav from "@/components/TopNav";
import Image from "next/image";


//  SimulationComplete component

export default function SimulationPage() {
    const params = useParams();
    const [imageUrl, setImageUrl] = useState("");
    const [interimResult, setInterimResult] = useState("");
    const [finalResult, setFinalResult] = useState("");
    const [recognition, setRecognition] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [backgroundImageUrl, setBackgroundImageUrl] = useState("");
    const [showSubmit, setShowSubmit] = useState(false);
    const [isStopEnabled, setIsStopEnabled] = useState(false);
    const [assistantId, setAssistantId] = useState(null);
    const [threadId, setThreadId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [aiResponse, setAiResponse] = useState("");
    const { user } = useContext(AuthContext);
    const courseId = params?.courseId;
    const textareaRef = useRef(null);
    const [showInstructions, setShowInstructions] = useState(true);

    useEffect(() => {
        function checkSafariBrowser() {
            const userAgent = navigator.userAgent;
            const isAppleDevice = /iPhone|iPad|iPod|Macintosh/.test(userAgent);
            const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent); // Exclude Chrome and Android
            
            if (isAppleDevice && !isSafari) {
                alert("Bu simülasyonu en iyi deneyimlemek için lütfen Safari tarayıcısında açın.");
                window.location.href = "safari://"; // Triggers Safari on iOS/macOS
            }
        }
    
        checkSafariBrowser();
    }, []);
    
    useEffect(() => {
        function checkOrientation() {
            if (window.innerHeight > window.innerWidth) {
                document.getElementById('landscapeWarning').style.display = 'flex';
            } else {
                document.getElementById('landscapeWarning').style.display = 'none';
            }
        }
    
        // Check on initial load
        checkOrientation();
    
        // Add event listener for screen resize or orientation change
        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation);
    
        // Cleanup event listeners on component unmount
        return () => {
            window.removeEventListener('resize', checkOrientation);
            window.removeEventListener('orientationchange', checkOrientation);
        };
    }, []);
    


    // ✅ State for animated "Bir saniye..." effect
    const [loadingText, setLoadingText] = useState("Bir saniye");
    useEffect(() => {
        if (isLoading) {
            let dots = 0;
            const interval = setInterval(() => {
                setLoadingText(`Bir saniye${".".repeat(dots % 4)}`); // "Bir saniye...", then resets
                dots++;
            }, 500);

            return () => clearInterval(interval); // Cleanup on unmount
        } else {
            setLoadingText("Bir saniye"); // Reset after loading
        }
    }, [isLoading]);
    
    // Fetch assistant and thread IDs
    useEffect(() => {
        const clearIncompleteSimulations = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) throw new Error("Oturum açılmamış. Lütfen giriş yapın.");
    
                const response = await fetch("/api/simulations/clear-incomplete", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                });
    
                const result = await response.json();
                if (!result.success) throw new Error(result.error || "Simülasyon temizleme hatası");
            } catch  {
            
            }
        };
    
        const initializeSimulation = async () => {
            try {
                if (params?.simulasyon_name) {
                    await clearIncompleteSimulations(); // ✅ Incomplete simulations are cleared first
    
                    const response = await fetch(`/api/simulations/init?simulasyon_name=${encodeURIComponent(params.simulasyon_name)}`);
                    const data = await response.json();
                    if (data.assistant_id) setAssistantId(data.assistant_id);
                    if (data.thread_id) setThreadId(data.thread_id);
                }
            } catch  {
          
            }
        };
    
        initializeSimulation();
    }, [params]);
    

    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        
        // Reset height temporarily to get the correct scrollHeight
        textarea.style.height = 'auto';
        
        // Set to scrollHeight
        textarea.style.height = textarea.scrollHeight + 'px';
        
        // Add a minimum height if content is very short
        if (textarea.scrollHeight < 48) { // 48px = 3rem
            textarea.style.height = '48px';
        }
    }, [aiResponse, isLoading]); // Also watch for isLoading changes

    useEffect(() => {
        if (params?.simulasyon_name) {
            fetchRandomImage(params.simulasyon_name);
            fetchBackgroundImage(params.simulasyon_name);
        }
    }, [params]);
    // Keep existing image fetching functions
    const fetchRandomImage = async (simulationName) => {
        try {
            const response = await fetch(`/api/simulations/images?simulation=${simulationName}`);
            const data = await response.json();
            if (response.ok && data.images.length > 0) {
                const randomIndex = Math.floor(Math.random() * data.images.length);
                setImageUrl(`/images/simulasyon/${simulationName}/positive/${data.images[randomIndex]}`);
            }
        } catch  {
        
        }
    };

    const fetchBackgroundImage = async (simulationName) => {
        try {
            const response = await fetch(`/api/simulations/background-images?simulation=${simulationName}`);
            const data = await response.json();
            if (response.ok && data.images.length > 0) {
                const randomIndex = Math.floor(Math.random() * data.images.length);
                setBackgroundImageUrl(`/images/simulasyon/${simulationName}/background/${data.images[randomIndex]}`);
            }
        } catch  {
            
        }
    };

// Add retry mechanism function


// Add saveToCompleteTable function
const saveToCompleteTable = async (userId, courseId, simulasyonName, userResponse, aiResponse, threadId) => {
    // Strict validation matching PHP version
    if (!userId || !courseId || !simulasyonName) {
       
        throw new Error('Missing required fields');
    }

    if (!userResponse?.trim() || !aiResponse?.trim()) {
       
        throw new Error('Missing response data');
    }

    // Type conversion (matching PHP's type casting)
    const payload = {
        user_id: parseInt(userId, 10),
        course_id: parseInt(courseId, 10),
        simulasyon_name: simulasyonName.trim(),
        user_response: userResponse.trim(),
        ai_response: aiResponse.trim(),
        thread_id: threadId
    };

    // Extract key points if this is a final response
    if (aiResponse.includes('Eğitim simülasyonumuz burada bitti')) {
        const keyPointData = extractKeyPointData(aiResponse);
        if (!keyPointData) {
            throw new Error('Failed to extract key point data');
        }
        Object.assign(payload, keyPointData);
    }

    try {
        const response = await fetch('/api/simulations/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save data');
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Server indicated failure');
        }

      
        return data;

    } catch (error) {
       
        throw error;
    }
};

    // Speech recognition setup (keep existing code)
    useEffect(() => {
        if (typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognitionInstance = new SpeechRecognition();
            
            recognitionInstance.continuous = true; // Changed to true for continuous listening
            recognitionInstance.interimResults = true;
            recognitionInstance.lang = "tr-TR";
            recognitionInstance.maxAlternatives = 1;
    
            recognitionInstance.onstart = () => {
                
                setIsListening(true);
            };
    
            recognitionInstance.onend = () => {
             
                // Restart recognition if still listening
                if (isListening) {
                    setTimeout(() => {
                        try {
                            recognitionInstance.start();
                        } catch  {
                          
                            setIsListening(false);
                        }
                    }, 500); // Add slight delay to prevent rapid restarts
                }
            };
    
            recognitionInstance.onresult = (event) => {
                let interimTranscript = '';
                let newFinalTranscript = '';
    
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
    
                    if (event.results[i].isFinal) {
                        newFinalTranscript += transcript + ' ';
                    } else {
                        interimTranscript += transcript + ' ';
                    }
                }
    
                setInterimResult(interimTranscript.trim());
                if (newFinalTranscript) {
                    setFinalResult(prev => (prev + ' ' + newFinalTranscript).trim());
                    setIsStopEnabled(true);
                }
            };
    
            recognitionInstance.onerror = (event) => {
                
                if (event.error === 'not-allowed') {
                    alert('Lütfen mikrofon izni verin');
                } else if (event.error === 'network') {
                    
                    recognitionInstance.stop();
                    setTimeout(() => {
                        if (isListening) recognitionInstance.start();
                    }, 1000);
                }
                setIsListening(false);
            };
    
            setRecognition(recognitionInstance);
        }
    }, [isListening]);
    
    const startRecognition = () => {
        if (recognition && !isListening) {
            try {
                setInterimResult("");
                setFinalResult("");
                setShowSubmit(false);
                setIsStopEnabled(false);
                setIsListening(true); // Ensure we update state
                recognition.start();
            } catch {
                
                setIsListening(false);
            }
        }
    };
    
    const stopRecognition = () => {
        if (recognition && isListening) {
            try {
                recognition.stop();
                setIsListening(false);
                setShowSubmit(true);
            } catch  {
               
            }
        }
    };
    
    // Extract key point data
    const extractKeyPointData = (aiResponse) => {
  
        const extractedData = {};
        
        // Match the exact PHP regex patterns
        const keyPointRegex = /"Key(\d+)":\s*"([^"]+)",\s*"Puan\1":\s*(\d+)/g;
        const totalRegex = /Toplam_Puan:\s*(\d+)/;
        
        let match;
        let foundKeys = 0;
        
        // Extract key points and scores
        while ((match = keyPointRegex.exec(aiResponse)) !== null) {
            const keyNumber = match[1];
            const keyText = match[2].trim();
            const points = parseInt(match[3], 10);
            
            // Validate each entry
            if (!keyText || isNaN(points)) {
                
                return null;
            }
            
            extractedData[`key${keyNumber}`] = keyText;
            extractedData[`puan${keyNumber}`] = points;
            foundKeys++;
        }
        
        // Extract total score
        const totalMatch = totalRegex.exec(aiResponse);
        if (totalMatch) {
            const totalPoints = parseInt(totalMatch[1], 10);
            if (!isNaN(totalPoints)) {
                extractedData.toplam_puan = totalPoints;
            }
        }
        
        // Validation checks (matching PHP logic)
        if (foundKeys === 0 || !extractedData.toplam_puan) {
          
            return null;
        }
        
        // Ensure all required keys are present
        for (let i = 1; i <= 5; i++) {
            if (!extractedData[`key${i}`] || !extractedData[`puan${i}`]) {
              
                return null;
            }
        }
        
        
        return extractedData;
    };
    
    // Retry mechanism for extraction


// Modify the state declarations
const [simulationCompleted, setSimulationCompleted] = useState(false);

// Modify handleSimulationEnd
const handleSimulationEnd = async (response) => {
    // Create loading overlay immediately to show feedback
    const loadingOverlay = document.createElement('div');
    
    try {
        if (!params?.simulasyon_name || !threadId || !courseId || !user?.id) {
     
            throw new Error('Missing required simulation data');
        }

        // Extract key points with improved validation
        const extractedData = extractKeyPointData(response);
        if (!extractedData) {
           
            throw new Error('Failed to extract simulation data');
        }

        // Show loading overlay before starting the end process
        loadingOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;
        loadingOverlay.innerHTML = `
            <div class="text-center">
                <p class="text-xl mb-2">Simülasyon sonlandırılıyor...</p>
                <p>Lütfen bekleyin</p>
            </div>
        `;
        document.body.appendChild(loadingOverlay);

        // Prepare payload with type checking
        const payload = {
            simulasyon_name: params.simulasyon_name.trim(),
            thread_id: threadId,
            course_id: parseInt(courseId, 10),
            user_id: parseInt(user.id, 10),
            user_response: finalResult.trim(),
            ai_response: response.trim(),
            ...extractedData
        };

        // First attempt to end simulation
        const verifyResponse = await fetch('/api/simulations/end', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!verifyResponse.ok) {
            const errorData = await verifyResponse.json();
            throw new Error(errorData.error || 'Failed to process simulation end');
        }

        const result = await verifyResponse.json();
        
        if (result.success) {
            // Disable all buttons
            document.querySelectorAll('button').forEach(button => {
                button.disabled = true;
            });

            // Set simulation completed state
            setSimulationCompleted(true);

            // Update loading overlay message
            loadingOverlay.innerHTML = `
                <div class="text-center">
                    <p class="text-xl mb-2">Simülasyon başarıyla tamamlandı</p>
                    <p>Yönlendiriliyorsunuz...</p>
                </div>
            `;

            // Remove loading overlay after a short delay
            setTimeout(() => {
                if (loadingOverlay.parentNode) {
                    loadingOverlay.remove();
                }
            }, 2500);
        } else {
            throw new Error('Server indicated failure in the response');
        }

    } catch (error) {
        
        
        // Update loading overlay to show error
        if (loadingOverlay.parentNode) {
            loadingOverlay.innerHTML = `
                <div class="text-center text-red-600">
                    <p class="text-xl mb-2">Hata Oluştu</p>
                    <p>Simülasyon sonlandırma işlemi başarısız oldu.</p>
                </div>
            `;
            
            // Remove error overlay after 5 seconds
            setTimeout(() => {
                if (loadingOverlay.parentNode) {
                    loadingOverlay.remove();
                }
            }, 5000);
        }
        
        throw error;
    }
};

// Update SimulationComplete component
const SimulationComplete = () => {
    const params = useParams(); // Get courseId from URL parameters

    return (
        <div className="flex justify-center items-center p-4">
            {simulationCompleted && (
                <button
                    id="selectNewSimulationButton"
                    onClick={() => window.location.href = `/simulations/${params.courseId}`}
                    className="px-6 py-3 bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600 transition-colors duration-200"
                >
                    Başka Simülasyon Seç
                </button>
            )}
        </div>
    );
};


    // Handle submit
    const handleSubmit = async () => {
        if (!finalResult.trim() || !assistantId || !user?.id || !courseId) {
            return;
        }
        setIsLoading(true);
        try {
            const processResponse = await fetch('/api/simulations/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: finalResult,
                    assistant_id: assistantId,
                    thread_id: threadId
                })
            });
    
            const data = await processResponse.json();
            
            if (data.response) {
                // First step: Save to complete table
                await saveToCompleteTable(
                    user.id,
                    courseId,
                    params.simulasyon_name,
                    finalResult,
                    data.response,
                    threadId
                );
    
                // Directly set the AI response without typewriter effect
                setAiResponse(data.response);
                
                // Second step: If simulation has ended, handle the end process
                if (data.response.includes('Eğitim simülasyonumuz burada bitti')) {
                    await handleSimulationEnd(data.response);
                }
                
                setFinalResult('');
                fetchRandomImage(params.simulasyon_name);
            }
        } catch  {
            alert('İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.');
        } finally {
            setIsLoading(false);
        }
    };
   

    // Return the existing JSX with loading state
    return (
     
                
        <div className="container flex min-h-screen"  style={{ 
            backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : 'none', 
            backgroundSize: "cover", 
            backgroundPosition: "center",
            backgroundColor: backgroundImageUrl ? 'transparent' : '#f0f0f0',
            height: "100vh",  /* Ensures it fills the full viewport */
            overflow: "hidden" /* Prevents scrolling */
        }}
    > 
<div className="min-h-screen bg-white relative">
       
       <TopNav />
       </div>


            <div className="left w-3/5 flex">
            <div className="w-1/2 p-4 mt-[40px]">
    <textarea 
        ref={textareaRef}
        className="w-full p-2 border rounded bg-gray-100 text-gray-900 resize-none transition-height duration-200"
        value={isLoading ? loadingText : aiResponse}
        placeholder="Sizi dinliyorum..."
        readOnly
        style={{ 
            maxHeight: "90vh", /* Sayfanın %90’ını aşmaz */
            overflowY: aiResponse.length > 300 ? "auto" : "hidden", /* İçerik uzunsa scroll çıksın */
            overflowX: "hidden", /* Yatay kaydırmayı tamamen engelle */
            wordWrap: "break-word", /* Uzun kelimeleri kırarak hizala */
            whiteSpace: "pre-wrap", /* Metni düzgün şekilde sar */
            padding: "8px", /* İç boşluğu minimuma indir */
            maxHeight: "90vh", /* Prevents text area from overflowing */
        overflowY: "hidden", /* Prevents vertical scrolling */
            lineHeight: "1.2" /* Satır yüksekliğini düzenle */

        }}
    />
</div>
<div className="w-2/5 p-4  mt-[30px] z-50"> 
                    <div className="image-container w-full h-full flex items-center justify-center ">
                        {imageUrl && (
                            <Image 
                                src={imageUrl} 
                                alt="Simülasyon" 
                                className="max-h-screen w-full object-contain rounded shadow-md" 
                            />
                        )}
                    </div>
                </div>
            </div>
            <div className="right w-1/2 flex flex-col h-screen">
                <div className="h-1/4">
                        <SimulationComplete />
</div>
                <div className="h-3/4 p-4">
                    <div className="h-full flex flex-col justify-end space-y-4 w-full">
                        <div className="field bg-gray-800/80 p-4 rounded w-full">
                            <label className="label text-white font-bold mb-2">Anlık Sonuçlar</label>
                            <div className="control">
                                <p className="textarea bg-white h-14 w-full text-gray-900" style={{ resize: 'none' }}>
                                    {interimResult}
                                </p>
                            </div>
                        </div>

                        <div className="field bg-gray-800/80 p-4 rounded w-full">
                            <label className="label text-white font-bold mb-2">Tüm Konuştuklarınız</label>
                            <div className="control">
                            <textarea 
                                className="textarea bg-white h-48 w-full text-gray-900" 
                                value={showInstructions ? `• Simulasyona Başlamak İçin Başla'ya tıklayınız.
                            • Konuştuklarınız önce Anlık Sonuçlar alanında görünür, bir süre beklerseniz aşağıya düşer.
                            • Konuşmaya devam ettikçe konuşmalarınız Tüm Konuştuklarınız alanına eklenir.
                            • Bitir'e basınca çıkan Gönder butonu ile konuştuklarınızı gönderebilirsiniz.
                            • Tam çevrilmeyen birkaç kelime olsa da konuşmaya devam edebilirsiniz.
                            • Konuştuklarınızı beğenmezseniz yeniden Başla butonuna basınız. Bu konuşmayı baştan başlatır.` : finalResult}  
                                readOnly
                                style={{ resize: 'none', whiteSpace: 'pre-line' }}
                            />
     
                            </div>
                        </div>
                        <div className="flex justify-start space-x-2">
                            <button 
                                className="button bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded" 
                                onClick={() => {
                                    setShowInstructions(false);  // Hide instructions when "Başla" is clicked
                                    startRecognition();
                                }} 
                                disabled={isListening}
                            >
                                Başla
                            </button>
                            <button 
                                className="button bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded" 
                                onClick={stopRecognition} 
                                disabled={!isListening || !isStopEnabled}
                            >
                                Bitir
                            </button>
                            {showSubmit && (
                                <button 
                                    className="button bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded" 
                                    onClick={handleSubmit}
                                    disabled={!finalResult.trim() || isLoading}
                                >
                                    Gönder
                                </button>
                            )}
                        </div>
                        <div id="landscapeWarning" style={{
    display: 'none',
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    fontSize: '1.5em',
    fontWeight: 'bold',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    textAlign: 'center'
}}>
    Daha iyi bir deneyim için lütfen cihazınızı yatay moda çevirin (Please rotate your device to landscape mode for the best experience).
</div>

                    </div>
                </div>
            </div>
        </div>
    );
}