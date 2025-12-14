// src/app/simulations/[courseId]/[simulasyon_name]/avatar/page.js
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { AuthContext } from "@/context/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useContext, useRef, useCallback } from "react";
import TopNav from "@/components/TopNav";
import AvatarViewer from "@/components/AvatarViewer";
import AudioUnlock from "@/components/AudioUnlock";

export default function SpeechSimulationPage() {
    const params = useParams();
    const router = useRouter();
    const [interimResult, setInterimResult] = useState("");
    const [finalResult, setFinalResult] = useState("");
    const [recognition, setRecognition] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [backgroundImageUrl, setBackgroundImageUrl] = useState("");
    const [autoSubmitOnStop, setAutoSubmitOnStop] = useState(false);

    // --- NEW: Dual-mode + instructions from DB
    const [mode, setMode] = useState("assistants"); // "assistants" | "chat"
    const [instructionsDb, setInstructionsDb] = useState("");

    const [assistantId, setAssistantId] = useState(null);
    const [threadId, setThreadId] = useState(null);

    const [isLoading, setIsLoading] = useState(false);
    const [aiResponse, setAiResponse] = useState("");
    const [endMessageOnly, setEndMessageOnly] = useState(false);
    const { user } = useContext(AuthContext);
    const courseId = params?.courseId;
    const textareaRef = useRef(null);
    const [showInstructions, setShowInstructions] = useState(true);
    const [isAudioLoaded, setIsAudioLoaded] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [audioLoadingStatus, setAudioLoadingStatus] = useState("");
    const [audioUnlocked, setAudioUnlocked] = useState(false);

    const instructionsText = [
        "• Simulasyona başlamak için Başla butonuna tıklayınız.",
        "• Konuşmanız bitince aynı butona tekrar basın; kayıt durur ve konuşmanız otomatik gönderilir.",
        "• Konuşmanız sürerken geçici sonuçlar bu alanın üstündeki Anlık Sonuçlar bölümünde görünür; durdurduğunuzda metne eklenir.",
        "• Konuştuklarınız görünmüyorsa mikrofona izin vermemişsinizdir. Lütfen izin verin.",
        "• Tam çevrilmeyen birkaç kelime olsa da konuşmaya devam edebilirsiniz."
    ].join("\n");

    // New UX enhancement states - EKLENEN
    const [audioLevel, setAudioLevel] = useState(0);
    const [isTyping, setIsTyping] = useState(false);
    const [isSendingTranscript, setIsSendingTranscript] = useState(false);
    const [isTypewriting, setIsTypewriting] = useState(false);
    const [displayedAiResponse, setDisplayedAiResponse] = useState("");
    const [pendingAiResponse, setPendingAiResponse] = useState(null);
    const canNavigateToReport = Boolean(threadId && courseId && params?.simulasyon_name);

    // Refs for audio analysis - EKLENEN
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const microphoneRef = useRef(null);
    const autoSubmitOnStopRef = useRef(false);
    const finalResultRef = useRef("");
    const handleSubmitRef = useRef(null);
    const sendAnimationTimeoutRef = useRef(null);
    const typewriterTimeoutRef = useRef(null);
    const redirectTimeoutRef = useRef(null);

    // Audio related states (TTS için)
    const [audioPlaying, setAudioPlaying] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);
    const audioRef = useRef(null);
    const [voiceGender, setVoiceGender] = useState("neutral");
    const [sessionVoice, setSessionVoice] = useState(null);
    const [isIOS, setIsIOS] = useState(false);

    // Define voice sets by gender
    const MALE_VOICES = ['onyx', 'echo', 'ash'];
    const FEMALE_VOICES = ['nova', 'shimmer', 'alloy'];
    const NEUTRAL_VOICES = ['sage', 'coral', 'fable'];

    function getRandomVoiceFromGender(gender) {
        let voiceSet;
        switch (gender) {
            case 'male': voiceSet = MALE_VOICES; break;
            case 'female': voiceSet = FEMALE_VOICES; break;
            case 'neutral': voiceSet = NEUTRAL_VOICES; break;
            default:
                console.warn(`Unknown gender: ${gender}, defaulting to neutral`);
                voiceSet = NEUTRAL_VOICES;
        }
        const randomIndex = Math.floor(Math.random() * voiceSet.length);
        const selectedVoice = voiceSet[randomIndex];
        return selectedVoice;
    }

    const handleAudioUnlock = useCallback(() => {
        setAudioUnlocked(true);

        if (isIOS) {
            try {
                const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
                if (AudioContextCtor) {
                    const ctx = new AudioContextCtor();
                    const buffer = ctx.createBuffer(1, 1, 22050);
                    const source = ctx.createBufferSource();
                    source.buffer = buffer;
                    source.connect(ctx.destination);
                    source.start(0);
                    source.stop(ctx.currentTime + 0.01);
                    source.onended = () => {
                        if (ctx.close) {
                            ctx.close().catch(() => {});
                        }
                    };
                    console.log("iOS audio context unlocked");
                }
            } catch (unlockError) {
                console.warn("Failed to unlock iOS audio:", unlockError);
            }
        }

        const element = audioRef.current;
        if (!element) {
            return;
        }

        const attemptPlay = () => {
            element.autoplay = true;
            element.playsInline = true;
            element.setAttribute("webkit-playsinline", "true");
            element.setAttribute("playsinline", "true");
            const playPromise = element.play();
            if (playPromise && typeof playPromise.catch === "function") {
                playPromise.catch((error) => {
                    console.warn("Ses otomatik oynatılamadı:", error);
                    setAudioLoadingStatus("Ses otomatik başlatılamadı. Lütfen tarayıcı ayarlarınızı kontrol edin.");
                });
            }
        };

        if (element.readyState >= 3 || isAudioLoaded) {
            attemptPlay();
        } else {
            const onCanPlay = () => {
                element.removeEventListener("canplay", onCanPlay);
                attemptPlay();
            };

            element.addEventListener("canplay", onCanPlay);
        }
    }, [isAudioLoaded, isIOS]);

    // Detect iOS device - EKLENEN
    useEffect(() => {
        const checkIOS = () => {
            const userAgent = window.navigator.userAgent?.toLowerCase?.() || "";
            const isIOSDevice =
                /iphone|ipad|ipod/.test(userAgent) ||
                (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

            setIsIOS(isIOSDevice);
            console.log("Is iOS device:", isIOSDevice);
        };

        checkIOS();
    }, []);

    // Improved mobile viewport handling - EKLENEN
    useEffect(() => {
        const setVh = () => {
            let vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        setVh();
        const handleResize = () => { setTimeout(() => { setVh(); }, 100); };
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
        };
    }, []);

    // Audio level monitoring - EKLENEN
    useEffect(() => {
        let animationId;
        const updateAudioLevel = () => {
            if (analyserRef.current && isListening) {
                const bufferLength = analyserRef.current.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                analyserRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
                const average = sum / bufferLength;
                const normalizedLevel = Math.min(average / 128, 1);
                setAudioLevel(normalizedLevel);
                animationId = requestAnimationFrame(updateAudioLevel);
            }
        };
        if (isListening && analyserRef.current) {
            updateAudioLevel();
        }
        return () => { if (animationId) cancelAnimationFrame(animationId); };
    }, [isListening]);

    // Check microphone permission - EKLENEN
    const checkMicrophonePermission = async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Tarayıcınız mikrofonu desteklemiyor');
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            });

            // Set up audio analysis - EKLENEN
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) throw new Error('Web Audio API desteklenmiyor');
                const audioContext = new AudioContext();
                const analyser = audioContext.createAnalyser();
                const microphone = audioContext.createMediaStreamSource(stream);
                analyser.fftSize = 256;
                microphone.connect(analyser);
                audioContextRef.current = audioContext;
                analyserRef.current = analyser;
                microphoneRef.current = microphone;
                playSound('start');
                return true;
            } catch (audioError) {
                console.warn('Audio analysis setup failed:', audioError);
                playSound('start');
                return true;
            }
        } catch (error) {
            console.error('Microphone permission error:', error);
            let errorMessage = '🎤 Mikrofon İzni Gerekli\n\n';
            if (error.name === 'NotAllowedError') {
                errorMessage += 'Lütfen tarayıcınızdan mikrofon iznini aktifleştirin:\n\n';
                errorMessage += '1. URL çubuğundaki (Chrome için : Edge için ...) simgesine tıklayarak Ayarlara gidin\n';
                errorMessage += '2. "Gizlilik ve güvenlik menüsü altından Site Ayarlaına (İzinleri) gidin\n';
                errorMessage += '3. Mikrofon menüsü altından izin verin ';
            } else if (error.name === 'NotFoundError') {
                errorMessage += 'Mikrofon bulunamadı. Lütfen:\n\n';
                errorMessage += '1. Mikrofonunuzun bağlı olduğundan emin olun\n';
                errorMessage += '2. Sistem ayarlarından mikrofon erişimini kontrol edin';
            } else {
                errorMessage += 'Mikrofon erişiminde hata oluştu:\n' + error.message;
            }
            alert(errorMessage);
            return false;
        }
    };

    // Enhanced notification sounds - EKLENEN
    const playSound = (type) => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const audioContext = new AudioContext();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            if (type === 'start') {
                oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
                oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.1);
                oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.15);
                gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.25);
            } else if (type === 'stop') {
                oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
                oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.1);
                oscillator.frequency.setValueAtTime(440, audioContext.currentTime + 0.15);
                gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.25);
            }
        } catch (error) {
            console.warn('Sound playback failed:', error);
        }
    };

    const generateSpeech = async (text) => {
        if (!text) return;

        const audioElement = audioRef.current;
        if (!audioElement) {
            console.warn("Audio element not ready for playback");
            return;
        }

        try {
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
                setAudioUrl(null);
            }

            try {
                audioElement.pause();
                audioElement.currentTime = 0;
            } catch (pauseError) {
                console.error("Error stopping existing audio:", pauseError);
            }

            audioElement.removeAttribute('src');
            audioElement.load();
            audioElement.autoplay = false;
            audioElement.oncanplay = null;
            audioElement.onerror = null;
            audioElement.onended = null;
            audioElement.onplay = null;
            audioElement.onplaying = null;
            audioElement.onpause = null;

            setAudioPlaying(false);
            setIsAudioLoaded(false);
            setLoadingProgress(0);
            setAudioLoadingStatus("Hazırlanıyor...");

            const trimmedText = text.length > 4000 ? text.substring(0, 4000) + "..." : text;
            setAudioLoadingStatus();

            const voice = sessionVoice || 'alloy';

            const response = await fetch("/api/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ input: trimmedText, voice }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("TTS failed:", errorText);
                setAudioLoadingStatus("Ses oluşturma hatası: " + (errorText || response.status));
                return;
            }

            const audioBlob = await response.blob();

            if (!audioBlob || audioBlob.size === 0) {
                console.error("Received empty audio blob");
                setAudioLoadingStatus("Boş ses verisi alındı!");
                return;
            }

            setLoadingProgress(50);
            setAudioLoadingStatus("Ses hazırlanıyor...");

            const url = URL.createObjectURL(audioBlob);
            setAudioUrl(url);
            audioElement.setAttribute('webkit-playsinline', 'true');
            audioElement.setAttribute('playsinline', 'true');
            audioElement.preload = 'auto';
            audioElement.muted = false;
            audioElement.volume = 1;
            audioElement.crossOrigin = 'anonymous';
            audioElement.playsInline = true;

            audioElement.autoplay = (!isIOS || audioUnlocked);

            const safetyTimeout = setTimeout(() => {
                setIsAudioLoaded(true);
                setAudioLoadingStatus();
                setLoadingProgress(100);
            }, 5000);

            const handleCanPlay = () => {
                clearTimeout(safetyTimeout);
                audioElement.oncanplay = null;
                setIsAudioLoaded(true);
                setAudioLoadingStatus();
                setLoadingProgress(100);

                if (!isIOS || audioUnlocked) {
                    const playPromise = audioElement.play();
                    if (playPromise && typeof playPromise.catch === 'function') {
                        playPromise.catch((error) => {
                            console.warn('Autoplay failed:', error);
                            setAudioLoadingStatus("Ses otomatik başlatılamadı. Lütfen tarayıcı ayarlarınızı kontrol edin.");
                        });
                    }
                } else {
                    setAudioLoadingStatus("Ses hazır. Tarayıcı ses izinlerini doğrulayın.");
                }
            };

            const handleError = (e) => {
                clearTimeout(safetyTimeout);
                audioElement.onerror = null;
                audioElement.oncanplay = null;
                console.error("Audio error:", e);
                setAudioLoadingStatus("Ses yükleme hatası!");
                setIsAudioLoaded(false);
                setAudioPlaying(false);
            };

            const handlePlay = () => {
                setAudioLoadingStatus();
                setAudioPlaying(true);
            };

            const handlePause = () => {
                if (audioElement.currentTime > 0 && !audioElement.ended) {
                    setAudioLoadingStatus();
                }
                setAudioPlaying(false);
            };

            const handleEnded = () => {
                setAudioLoadingStatus();
                setAudioPlaying(false);
            };

            audioElement.oncanplay = handleCanPlay;
            audioElement.onerror = handleError;
            audioElement.onended = handleEnded;
            audioElement.onplay = handlePlay;
            audioElement.onplaying = handlePlay;
            audioElement.onpause = handlePause;
            audioElement.src = url;
            audioElement.load();

            setTimeout(() => {
                if (typeof audioElement.isConnected === 'boolean' && !audioElement.isConnected) {
                    return;
                }
                if (audioElement.readyState < 3) {
                    clearTimeout(safetyTimeout);
                    setIsAudioLoaded(true);
                    setAudioLoadingStatus();
                    setLoadingProgress(100);
                }
            }, 3000);

        } catch (error) {
            console.error("Audio generation error:", error);
            setIsAudioLoaded(false);
            setAudioPlaying(false);
            setAudioLoadingStatus("Ses yükleme başarısız: " + error.message);
        }
    };

    const stopSpeech = () => {
        if (audioRef.current) {
          try {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setAudioPlaying(false);
          } catch (error) {
            console.error("Error stopping audio:", error);
            setAudioPlaying(false);
          }
        }
    };

    const clearTranscriptWithAnimation = () => {
        if (sendAnimationTimeoutRef.current) {
            clearTimeout(sendAnimationTimeoutRef.current);
        }
        sendAnimationTimeoutRef.current = setTimeout(() => {
            setFinalResult('');
            finalResultRef.current = '';
            setIsSendingTranscript(false);
            sendAnimationTimeoutRef.current = null;
        }, 600);
    };

    const navigateToReport = () => {
        if (!threadId || !courseId || !params?.simulasyon_name) {
            return;
        }
        if (redirectTimeoutRef.current) {
            clearTimeout(redirectTimeoutRef.current);
            redirectTimeoutRef.current = null;
        }
        stopSpeech();
        router.push(`/simulations/${params.courseId}/${params.simulasyon_name}/rapor?threadId=${encodeURIComponent(threadId)}&courseId=${encodeURIComponent(courseId)}`);
    };

    // Release previously created audio URLs when a new one is set
    useEffect(() => {
        return () => {
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
        };
    }, [audioUrl]);

    // Clean up audio resources when component unmounts
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                const audio = audioRef.current;
                audio.oncanplay = null;
                audio.onplay = null;
                audio.onplaying = null;
                audio.onended = null;
                audio.onpause = null;
                audio.onerror = null;
                audio.pause();
                audio.src = '';
                audioRef.current = null;
            }
            if (sendAnimationTimeoutRef.current) {
                clearTimeout(sendAnimationTimeoutRef.current);
                sendAnimationTimeoutRef.current = null;
            }
            if (typewriterTimeoutRef.current) {
                clearTimeout(typewriterTimeoutRef.current);
                typewriterTimeoutRef.current = null;
            }
            if (redirectTimeoutRef.current) {
                clearTimeout(redirectTimeoutRef.current);
                redirectTimeoutRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (audioUnlocked && audioRef.current && isAudioLoaded && audioRef.current.paused) {
            const element = audioRef.current;
            element.setAttribute('webkit-playsinline', 'true');
            element.setAttribute('playsinline', 'true');
            element.autoplay = true;
            element.playsInline = true;

            setTimeout(() => {
                const playPromise = element.play();
                if (playPromise && typeof playPromise.catch === 'function') {
                    playPromise.catch(error => {
                        console.warn('Otomatik ses çalma başarısız oldu:', error);
                        setAudioLoadingStatus("Ses otomatik başlatılamadı. Lütfen tarayıcı ayarlarınızı kontrol edin.");
                    });
                }
            }, isIOS ? 200 : 50);
        }
    }, [audioUnlocked, isAudioLoaded, isIOS]);

    useEffect(() => {
        if (!pendingAiResponse || !isAudioLoaded) {
            return undefined;
        }
        if (typewriterTimeoutRef.current) {
            clearTimeout(typewriterTimeoutRef.current);
            typewriterTimeoutRef.current = null;
        }

        const fullText = pendingAiResponse;
        let index = 0;
        const startDelay = 150;
        const stepDelay = 18;

        setDisplayedAiResponse("");
        setIsTyping(false);
        setIsTypewriting(true);

        const typeStep = () => {
            index += 1;
            setDisplayedAiResponse(fullText.slice(0, index));

            if (index < fullText.length) {
                typewriterTimeoutRef.current = setTimeout(typeStep, stepDelay);
            } else {
                setDisplayedAiResponse(fullText);
                setIsTypewriting(false);
                setPendingAiResponse(null);
                typewriterTimeoutRef.current = null;
            }
        };

        typewriterTimeoutRef.current = setTimeout(typeStep, startDelay);

        return () => {
            if (typewriterTimeoutRef.current) {
                clearTimeout(typewriterTimeoutRef.current);
                typewriterTimeoutRef.current = null;
            }
        };
    }, [pendingAiResponse, isAudioLoaded]);

    // Check device orientation - GELİŞTİRİLDİ
    useEffect(() => {
        function checkOrientation() {
            const isMobile = window.innerWidth <= 768;
            const isPortrait = window.innerHeight > window.innerWidth;
            if (isMobile && isPortrait) {
                const warning = document.getElementById('landscapeWarning');
                if (warning) {
                    warning.style.display = 'flex';
                }
            } else {
                const warning = document.getElementById('landscapeWarning');
                if (warning) {
                    warning.style.display = 'none';
                }
            }
        }

        checkOrientation();

        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', () => {
            setTimeout(checkOrientation, 100);
        });

        return () => {
            window.removeEventListener('resize', checkOrientation);
            window.removeEventListener('orientationchange', checkOrientation);
        };
    }, []);

    // Initialize the simulation  --- (kept the same, only ADDED mode + instructions)
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
            } catch {
                // Error handling silently
            }
        };

        const initializeSimulation = async () => {
            try {
                if (params?.simulasyon_name) {
                    await clearIncompleteSimulations();

                    const response = await fetch(`/api/simulations/init?simulasyon_name=${encodeURIComponent(params.simulasyon_name)}`);
                    const data = await response.json();

                    if (data.assistant_id) setAssistantId(data.assistant_id);
                    if (data.thread_id) setThreadId(data.thread_id);

                    // NEW: capture DB instructions for optional chat mode priming
                    if (typeof data?.simulation_details?.instructions === "string") {
                        setInstructionsDb(data.simulation_details.instructions);
                    }

                    // NEW: resolve mode (URL override > api-provided > presence of assistant)
                    let resolved = "assistants";
                    try {
                        const sp = new URLSearchParams(window.location.search);
                        const q = sp.get("mode");
                        if (q === "chat" || q === "assistants") resolved = q;
                        else resolved = data.mode || (data.assistant_id ? "assistants" : "chat");
                    } catch {
                        resolved = data.mode || (data.assistant_id ? "assistants" : "chat");
                    }
                    setMode(resolved);

                    // Existing voice handling (unchanged), default neutral fallback
                    if (data.voice_gender) {
                        const gender = data.voice_gender?.trim().toLowerCase();
                        setVoiceGender(gender);
                        const randomVoice = getRandomVoiceFromGender(gender);
                        setSessionVoice(randomVoice);
                    } else {
                        console.warn("⚠️ No voice_gender received from API, using default");
                        const randomVoice = getRandomVoiceFromGender('neutral');
                        setSessionVoice(randomVoice);
                        setVoiceGender('neutral');
                    }
                }
            } catch (error) {
                console.error("❌ Error during simulation initialization:", error);
                setSessionVoice('sage');
                setVoiceGender('neutral');
            }
        };

        initializeSimulation();
    }, []);

    // Auto-resize textarea - EKLENEN
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const adjustHeight = () => {
            if (!textareaRef.current) return;

            const node = textareaRef.current;
            node.style.height = 'auto';

            const rect = node.getBoundingClientRect();
            const bottomPadding = 24; // leave room for margins/buttons
            const availableHeight = Math.max(
                window.innerHeight - rect.top - bottomPadding,
                120
            );

            const targetHeight = Math.min(node.scrollHeight, availableHeight);
            node.style.height = `${targetHeight}px`;

            node.scrollTop = node.scrollHeight;
        };

        adjustHeight();

        const handleResize = () => { adjustHeight(); };

        const observer = typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(adjustHeight)
            : null;

        if (observer) observer.observe(textarea);
        window.addEventListener('resize', handleResize);

        return () => {
            if (observer) observer.disconnect();
            window.removeEventListener('resize', handleResize);
        };
    }, [aiResponse, displayedAiResponse, isLoading, isTyping, isTypewriting]);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.scrollTop = textarea.scrollHeight;
    }, [displayedAiResponse, aiResponse, isTypewriting]);

    // Load images for the simulation (keeping for background)
    useEffect(() => {
        if (params?.simulasyon_name) {
            fetchBackgroundImage(params.simulasyon_name);
        }
    }, []);

    const fetchBackgroundImage = async (simulationName) => {
        try {
            const response = await fetch(`/api/simulations/background-images?simulation=${simulationName}`);
            const data = await response.json();
            if (response.ok && data.images.length > 0) {
                const randomIndex = Math.floor(Math.random() * data.images.length);
                setBackgroundImageUrl(`/images/simulasyon/${simulationName}/background/${data.images[randomIndex]}`);
            }
        } catch {
            // Error handling silently
        }
    };

    const saveToCompleteTable = async (userId, courseId, simulasyonName, userResponse, aiResponse, threadId) => {
        if (!userId || !courseId || !simulasyonName) {
            throw new Error('Missing required fields');
        }
        if (!userResponse?.trim() || !aiResponse?.trim()) {
            throw new Error('Missing response data');
        }

        const payload = {
            user_id: parseInt(userId, 10),
            course_id: parseInt(courseId, 10),
            simulasyon_name: simulasyonName.trim(),
            user_response: userResponse.trim(),
            ai_response: aiResponse.trim(),
            thread_id: threadId
        };

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
                headers: { 'Content-Type': 'application/json' },
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

    // Speech recognition setup - GELİŞTİRİLDİ
    useEffect(() => {
        if (typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognitionInstance = new SpeechRecognition();

            recognitionInstance.interimResults = true;
            recognitionInstance.lang = "tr-TR";
            recognitionInstance.continuous = true;
            recognitionInstance.maxAlternatives = 1;

            recognitionInstance.onstart = () => {
                console.log('Recognition started');
                setIsListening(true);
            };

            recognitionInstance.onend = () => {
                console.log('Recognition ended');
                setIsListening(false);

                if (autoSubmitOnStopRef.current) {
                    autoSubmitOnStopRef.current = false;
                    setTimeout(() => {
                        setAutoSubmitOnStop(false);
                        if (handleSubmitRef.current) {
                            handleSubmitRef.current({ trigger: 'auto' });
                        }
                    }, 100);
                }
            };

            recognitionInstance.onresult = (event) => {
                let interimTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    let transcript = event.results[i][0].transcript;
                    transcript = transcript.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
                    if (event.results[i].isFinal) {
                        setFinalResult(prev => {
                            const next = (prev + ' ' + transcript).trim();
                            finalResultRef.current = next;
                            return next;
                        });
                    } else {
                        interimTranscript += transcript + ' ';
                    }
                }
                setInterimResult(interimTranscript.trim());
            };

            recognitionInstance.onerror = (event) => {
                console.error("Error: ", event.error);
                setIsListening(false);
                setAutoSubmitOnStop(false);
                autoSubmitOnStopRef.current = false;
                setIsSendingTranscript(false);

                let errorMessage = '❌ Ses Tanıma Hatası\n\n';
                if (event.error === 'not-allowed') {
                    errorMessage += 'Mikrofon iznine ulaşılamıyor. Lütfen:\n';
                    errorMessage += '1. Tarayıcı ayarlarından mikrofon iznini kontrol edin\n';
                    errorMessage += '2. Sayfayı yenileyin ve tekrar deneyin';
                } else if (event.error === 'no-speech') {
                    errorMessage += 'Ses algılanamadı. Lütfen:\n';
                    errorMessage += '1. Mikrofonunuza yakın konuşun\n';
                    errorMessage += '2. Çevresel gürültüyü azaltın';
                } else if (event.error === 'audio-capture') {
                    errorMessage += 'Ses yakalama hatası. Lütfen:\n';
                    errorMessage += '1. Mikrofonunuzun çalıştığını kontrol edin\n';
                    errorMessage += '2. Başka uygulamaların mikrofonu kullanmadığından emin olun';
                } else {
                    errorMessage += `Hata kodu: ${event.error}\nLütfen sayfayı yenileyin ve tekrar deneyin.`;
                }
                alert(errorMessage);
            };

            setRecognition(recognitionInstance);

            return () => {
                if (recognitionInstance) {
                    try { recognitionInstance.stop(); } catch (error) {
                        console.error('Error stopping recognition during cleanup:', error);
                    }
                }
            };
        }
    }, []);

    // Start speech recognition - GELİŞTİRİLDİ
    const startRecognition = async () => {
        if (recognition && !isListening) {
            // Check microphone permission first - EKLENEN
            const hasPermission = await checkMicrophonePermission();
            if (!hasPermission) return;

            try {
                if (sendAnimationTimeoutRef.current) {
                    clearTimeout(sendAnimationTimeoutRef.current);
                    sendAnimationTimeoutRef.current = null;
                }

                setIsSendingTranscript(false);
                setInterimResult("");
                setFinalResult("");
                finalResultRef.current = "";
                setAutoSubmitOnStop(false);
                autoSubmitOnStopRef.current = false;
                setAudioLevel(0); // EKLENEN

                // Stop any playing audio
                stopSpeech();

                if (isListening) recognition.stop();

                setTimeout(() => { recognition.start(); }, 100);

            } catch (error) {
                console.error('Error starting recognition:', error);
                setIsListening(false);
                alert('❌ Ses tanıma başlatılamadı. Lütfen sayfayı yenileyin ve tekrar deneyin.');
            }
        }
    };

    // Stop speech recognition - GELİŞTİRİLDİ
    const stopRecognition = ({ autoSubmit = false } = {}) => {
        if (autoSubmit) {
            setAutoSubmitOnStop(true);
            autoSubmitOnStopRef.current = true;
        }

        if (recognition && isListening) {
            try {
                recognition.stop();
                setAudioLevel(0); // EKLENEN

                // Play stop sound - EKLENEN
                playSound('stop');

                // Clean up audio context - EKLENEN
                if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                    audioContextRef.current.close();
                }
                audioContextRef.current = null;
                analyserRef.current = null;
                microphoneRef.current = null;

            } catch (error) {
                console.error('Error stopping recognition:', error);
                setIsListening(false);
                if (autoSubmit) {
                    setAutoSubmitOnStop(false);
                    autoSubmitOnStopRef.current = false;
                }
                setIsSendingTranscript(false);
            }
        } else if (autoSubmit) {
            setAutoSubmitOnStop(false);
            autoSubmitOnStopRef.current = false;
        }
    };

    const handlePrimaryButtonClick = async () => {
        if (endMessageOnly) return;
        setShowInstructions(false);
        stopSpeech();

        if (isListening) {
            setIsSendingTranscript(true);
            stopRecognition({ autoSubmit: true });
        } else {
            if (sendAnimationTimeoutRef.current) {
                clearTimeout(sendAnimationTimeoutRef.current);
                sendAnimationTimeoutRef.current = null;
            }
            setIsSendingTranscript(false);
            await startRecognition();
        }
    };

    const extractKeyPointData = (aiResponse) => {
        let extractedData = {};
        const keyPointRegex = /"Key(\d+)":\s*"([^"]+)",\s*"Puan\1":\s*(\d+)/g;
        let match;
        let foundKeys = 0;

        while ((match = keyPointRegex.exec(aiResponse)) !== null) {
            const keyNumber = match[1];
            const keyText = match[2].trim();
            const points = parseInt(match[3], 10);
            if (!keyText || isNaN(points)) return null;
            extractedData[`key${keyNumber}`] = keyText;
            extractedData[`puan${keyNumber}`] = points;
            foundKeys++;
        }

        const totalRegex = /"Toplam_Puan":\s*(\d+)/;
        const match1 = totalRegex.exec(aiResponse);

        if (match1 && match1[1]) {
            extractedData.toplam_puan = parseInt(match1[1], 10);
        } else {
            const searchTerm = '"Toplam_Puan":';
            const index = aiResponse.indexOf(searchTerm);
            if (index !== -1) {
                const substr = aiResponse.substring(index + searchTerm.length).trim();
                const numberMatch = /^s*(\d+)/.exec(substr);
                if (numberMatch && numberMatch[1]) {
                    extractedData.toplam_puan = parseInt(numberMatch[1], 10);
                }
            }
        }

        if (!extractedData.toplam_puan && foundKeys > 0) {
            let sum = 0;
            for (let i = 1; i <= 10; i++) {
                if (extractedData[`puan${i}`]) sum += extractedData[`puan${i}`];
            }
            extractedData.toplam_puan = sum;
        }

        if (foundKeys === 0) {
            console.warn("No keys found on first attempt. Retrying...");
            return null;
        }

        return extractedData;
    };

    const handleSimulationEnd = async (response) => {
        try {
            if (!params?.simulasyon_name || !threadId || !courseId || !user?.id) {
                throw new Error("Missing required simulation data");
            }

            let extractedData = extractKeyPointData(response);
            if (!extractedData) {
                console.warn("Retrying key extraction...");
                extractedData = extractKeyPointData(response);
            }

            if (!extractedData) {
                console.warn("No keys found. Saving with NULL values.");
                extractedData = {
                    key1: null, key2: null, key3: null, key4: null, key5: null,
                    key6: null, key7: null, key8: null, key9: null, key10: null,
                    puan1: null, puan2: null, puan3: null, puan4: null, puan5: null,
                    puan6: null, puan7: null, puan8: null, puan9: null, puan10: null,
                    toplam_puan: null,
                };
            }

            const payload = {
                simulasyon_name: params.simulasyon_name.trim(),
                thread_id: threadId,
                course_id: parseInt(courseId, 10),
                user_id: parseInt(user.id, 10),
                user_response: finalResultRef.current.trim(),
                ai_response: response.trim(),
                ...extractedData,
            };

            const verifyResponse = await fetch("/api/simulations/end", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!verifyResponse.ok) {
                throw new Error("Failed to process simulation end");
            }

            if (typewriterTimeoutRef.current) {
                clearTimeout(typewriterTimeoutRef.current);
                typewriterTimeoutRef.current = null;
            }

            setPendingAiResponse(null);
            setDisplayedAiResponse("");
            setIsTypewriting(false);
            setIsTyping(false);
            setIsSendingTranscript(false);
            setInterimResult('');
            finalResultRef.current = '';
            setFinalResult('');
            setShowInstructions(false);
            setAutoSubmitOnStop(false);
            autoSubmitOnStopRef.current = false;

            stopSpeech();

            setEndMessageOnly(true);
            setAiResponse("Eğitim simülasyonumuz burada bitti.");

            if (redirectTimeoutRef.current) {
                clearTimeout(redirectTimeoutRef.current);
            }

            redirectTimeoutRef.current = setTimeout(() => {
                navigateToReport();
            }, 3000);
        } catch (error) {
            console.error("Simulation end error:", error);
        }
    };

    // --- NEW: Dual-mode aware submit (Assistants unchanged; Chat sends extra info)
    const handleSubmit = async ({ trigger = 'manual' } = {}) => {
        const transcript = finalResultRef.current.trim();
        if (!transcript || !user?.id || !courseId || (mode === 'assistants' && !assistantId)) {
            if (isSendingTranscript) setIsSendingTranscript(false);

            if (!transcript && trigger === 'manual') {
                alert('⚠️ Lütfen bir şeyler söyleyin!\n\nÖnce Başla butonuna basarak konuşmanızı kaydedin, ardından aynı butona tekrar basarak kaydı bitirin.');
            }

            setIsTyping(false);
            setIsTypewriting(false);
            setPendingAiResponse(null);
            setDisplayedAiResponse('');
            return;
        }

        setAiResponse('');
        setDisplayedAiResponse('');
        setPendingAiResponse(null);
        setIsTypewriting(false);
        setIsLoading(true);
        setIsTyping(true);

        // Stop any playing audio
        stopSpeech();

        try {
            // Build payload for both modes; server can branch on mode
            const body = {
                content: transcript,
                mode,                               // "assistants" | "chat"
                thread_id: threadId,                // shared thread id
                assistant_id: mode === 'assistants' ? assistantId : undefined,
                simulasyon_name: params.simulasyon_name, // for chat-mode routing/context
                db_instructions: instructionsDb     // for chat-mode priming
            };

            const processResponse = await fetch('/api/simulations/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await processResponse.json();

            if (data.response) {
                await saveToCompleteTable(
                    user.id,
                    courseId,
                    params.simulasyon_name,
                    transcript,
                    data.response,
                    threadId
                );

                const isFinalResponse = data.response.includes('Eğitim simülasyonumuz burada bitti');

                if (isFinalResponse) {
                    await handleSimulationEnd(data.response);
                } else {
                    setAiResponse(data.response);
                    setPendingAiResponse(data.response);
                    setDisplayedAiResponse('');
                    setIsTypewriting(false);
                    generateSpeech(data.response);
                }

                setInterimResult('');
                finalResultRef.current = '';
                clearTranscriptWithAnimation();
                fetchBackgroundImage(params.simulasyon_name);
            } else {
                setIsSendingTranscript(false);
                setIsTyping(false);
                setIsTypewriting(false);
                setPendingAiResponse(null);
                setDisplayedAiResponse('');
            }
        } catch {
            setIsSendingTranscript(false);
            setIsTyping(false);
            setIsTypewriting(false);
            setPendingAiResponse(null);
            setDisplayedAiResponse('');
            alert('İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.');
        } finally {
            setIsLoading(false);
        }
    };

    handleSubmitRef.current = handleSubmit;

    // Enhanced Microphone Icon Component - EKLENEN
    const MicrophoneIcon = ({ isRecording, audioLevel }) => {
        const waveScale = isRecording ? 1 + (audioLevel * 0.3) : 1;

        return (
            <div className="relative flex items-center justify-center">
                {/* Optimize edilmiş ses dalgaları */}
                {isRecording && (
                    <>
                        <div
                            className="absolute rounded-full border-2 border-white"
                            style={{
                                width: `${32 + (audioLevel * 22)}px`,
                                height: `${32 + (audioLevel * 22)}px`,
                                opacity: 0.8 + (audioLevel * 0.2),
                                borderWidth: '2px',
                                animation: 'pulse 1.4s infinite',
                                boxShadow: '0 0 8px rgba(255, 255, 255, 0.6)'
                            }}
                        />

                        <div
                            className="absolute rounded-full border-2 border-red-300"
                            style={{
                                width: `${48 + (audioLevel * 32)}px`,
                                height: `${48 + (audioLevel * 32)}px`,
                                opacity: 0.6 + (audioLevel * 0.4),
                                borderWidth: '2px',
                                animation: 'pulse 2.0s infinite',
                                boxShadow: '0 0 6px rgba(252, 165, 165, 0.4)'
                            }}
                        />

                        <div
                            className="absolute rounded-full border border-red-500"
                            style={{
                                width: `${62 + (audioLevel * 38)}px`,
                                height: `${62 + (audioLevel * 38)}px`,
                                opacity: 0.4 + (audioLevel * 0.6),
                                borderWidth: '1px',
                                animation: 'pulse 2.5s infinite'
                            }}
                        />

                        <div
                            className="absolute rounded-full bg-red-400"
                            style={{
                                width: `${15 + (audioLevel * 10)}px`,
                                height: `${15 + (audioLevel * 10)}px`,
                                opacity: 0.1 + (audioLevel * 0.2),
                                filter: 'blur(4px)',
                                animation: 'pulse 1.1s infinite'
                            }}
                        />
                    </>
                )}

                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={`relative z-20 transition-all duration-300 ${
                        isRecording ? 'text-white' : 'text-red-500'
                    }`}
                    style={{
                        transform: `scale(${waveScale})`,
                        filter: isRecording
                            ? `drop-shadow(0 0 8px rgba(239, 68, 68, 0.8)) brightness(1.1)`
                            : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
                    }}
                >
                    <path
                        d="M12 14C13.66 14 15 12.66 15 11V5C15 3.34 13.66 2 12 2C10.34 2 9 3.34 9 5V11C9 12.66 10.34 14 12 14Z"
                        fill="currentColor"
                    />
                    <path
                        d="M17 11C17 14.53 14.39 17.44 11 17.93V21H13C13.55 21 14 21.45 14 22C14 22.55 13.55 23 13 23H11C10.45 23 10 22.55 10 22C10 21.45 10.45 21 11 21H13V17.93C9.61 17.44 7 14.53 7 11H5C5 15.08 8.05 18.45 12 18.95C15.95 18.45 19 15.08 19 11H17Z"
                        fill="currentColor"
                    />
                </svg>
            </div>
        );
    };

    // Enhanced Typing indicator - EKLENEN
    const TypingIndicator = () => (
        <div className="flex items-center space-x-1 bg-white/80 rounded-full px-3 py-2 shadow-md">
            <span className="text-red-600 text-xs font-medium mr-2">AI yazıyor</span>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
    );

    return (
        <>
            {!audioUnlocked && (
                <AudioUnlock onUnlocked={handleAudioUnlock} />
            )}
            <audio
                ref={audioRef}
                className="hidden"
                playsInline
                preload="auto"
                crossOrigin="anonymous"
            />
            <div
                className="w-screen flex flex-col md:flex-row min-h-screen overflow-hidden"
                style={{
                    backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : 'none',
                    backgroundSize: "100% 100%",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    backgroundColor: backgroundImageUrl ? 'transparent' : '#f0f0f0',
                    minHeight: 'calc(var(--vh, 1vh) * 100)',
                    height: 'auto',
                    WebkitOverflowScrolling: 'touch'
                }}
            >
                <div className="min-h-screen bg-white relative w-full md:w-auto">
                    <TopNav />
                </div>

                <div
                    className="left w-full md:w-2/5 px-4 flex justify-center items-center"
                    style={{
                        height: 'calc(var(--vh, 1vh) * 100)',
                        maxHeight: 'calc(var(--vh, 1vh) * 100)',
                        paddingTop: '2rem',
                        paddingBottom: '1rem',
                        boxSizing: 'border-box'
                    }}
                >
                    <div className="avatar-container w-full h-full flex items-center justify-center">
                        <AvatarViewer
                            modelUrl="https://models.readyplayer.me/682ee654007f6100f05ccd93.glb"
                            audioRef={audioRef}
                            isPlaying={audioPlaying}
                        />
                    </div>
                </div>

                <div
                    className="right w-full md:w-3/5 flex flex-col"
                    style={{
                        height: 'calc(var(--vh, 1vh) * 100)',
                        maxHeight: 'calc(var(--vh, 1vh) * 100)',
                        paddingTop: '4rem',
                        paddingBottom: '1rem',
                        boxSizing: 'border-box',
                        overflowY: 'auto'
                    }}
                >
                    <div className="p-4 flex flex-col space-y-4 flex-1 min-h-0">
                        <div className="relative bg-white/90 border border-gray-200 rounded-lg shadow-sm p-4 flex-shrink-0">
                            {endMessageOnly ? (
                                <div className="space-y-4 text-gray-900">
                                    <p className="text-base font-semibold whitespace-pre-line">
                                        {aiResponse || 'Eğitim simülasyonumuz burada bitti.'}
                                    </p>
                                    <button
                                        onClick={navigateToReport}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition"
                                        disabled={!canNavigateToReport}
                                    >
                                        Raporu Gör
                                    </button>
                                    <p className="text-sm text-gray-500">
                                        {canNavigateToReport
                                            ? '3 saniye içinde otomatik yönlendirileceksiniz…'
                                            : 'Raporu görmek için gerekli bilgiler hazırlanıyor…'}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <label className="block text-gray-700 font-semibold mb-2"></label>
                                    <textarea
                                        ref={textareaRef}
                                        className="w-full p-2 border rounded bg-gray-100 text-gray-900 resize-none transition-height duration-200"
                                        value={
                                            isTypewriting
                                                ? displayedAiResponse
                                                : (isTyping ? '' : (displayedAiResponse || aiResponse))
                                        }
                                        placeholder={(displayedAiResponse || aiResponse || isTyping || isTypewriting || isLoading) ? '' : 'Sizi dinliyorum...'}
                                        readOnly
                                        style={{
                                            height: '35vh',
                                            maxHeight: '35vh',
                                            overflowY: 'auto',
                                            overflowX: 'hidden',
                                            wordWrap: 'break-word',
                                            whiteSpace: 'pre-wrap',
                                            padding: '8px',
                                            lineHeight: '1.2'
                                        }}
                                    />
                                    {isTyping && (
                                        <div className="absolute bottom-6 right-6">
                                            <TypingIndicator />
                                        </div>
                                    )}

                                    {/* Voice Debug Info */}
                                    {process.env.NODE_ENV === 'development' && (
                                        <div className="mt-3 text-xs text-gray-500 bg-gray-100 p-2 rounded">
                                            <div>Voice Gender: {voiceGender}</div>
                                            <div>Session Voice: {sessionVoice}</div>
                                            <div>Mode: {mode}</div>
                                        </div>
                                    )}

                                    {/* TTS Controls */}
                                    {aiResponse && !isLoading && (
                                        <div className="mt-3 flex flex-col space-y-2">
                                            {audioLoadingStatus && (
                                                <div className="text-sm text-gray-600">{audioLoadingStatus}</div>
                                            )}
                                            {audioLoadingStatus && !isAudioLoaded && (
                                                <div className="w-full">
                                                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                                                        <div
                                                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                                            style={{ width: `${loadingProgress}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="flex flex-col flex-1 space-y-6 min-h-0">
                            <div className="flex-shrink-0" aria-hidden="true">
                                <div className="flex justify-center items-center p-4" />
                            </div>
                            <div className="flex-1 flex flex-col justify-end space-y-6 w-full min-h-0">
                                <div className="field bg-white/90 border border-gray-200 rounded-lg shadow-sm p-4 w-full overflow-hidden">
                                    <label className="block text-gray-700 font-semibold mb-2">Tüm Konuştuklarınız</label>
                                    <div className="control space-y-3 overflow-y-auto">
                                        {!showInstructions && interimResult && (
                                            <div className="bg-gray-100 text-gray-900 p-3 rounded border border-gray-200 shadow-sm transition-all duration-300 ease-out">
                                                <p className="text-xs font-semibold tracking-wide uppercase text-gray-500 mb-1">Anlık Sonuçlar</p>
                                                <p className="whitespace-pre-line text-sm leading-relaxed">{interimResult}</p>
                                            </div>
                                        )}
                                        <textarea
                                            className={`textarea w-full text-gray-900 transition-all duration-500 ease-in-out transform ${
                                                isSendingTranscript
                                                    ? 'opacity-60 -translate-y-1 bg-gray-200'
                                                    : 'opacity-100 translate-y-0 bg-white'
                                            }`}
                                            value={showInstructions ? instructionsText : finalResult}
                                            readOnly
                                            style={{
                                                resize: 'vertical',
                                                whiteSpace: 'pre-line',
                                                minHeight: '25vh',
                                                maxHeight: '40vh',
                                                overflowY: 'auto'
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-start mt-[-20px]">
                                    <button
                                        className={`flex items-center gap-2 px-4 py-2 rounded font-medium transition-all duration-200 shadow-md overflow-visible relative ${
                                            (isListening || autoSubmitOnStop)
                                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                                : 'bg-white hover:bg-gray-50 text-red-500 border-2 border-red-500'
                                        }`}
                                        onClick={handlePrimaryButtonClick}
                                        disabled={isLoading || autoSubmitOnStop || endMessageOnly}
                                        style={{
                                            position: 'relative',
                                            minWidth: '98px',
                                            minHeight: '42px'
                                        }}
                                    >
                                        <MicrophoneIcon isRecording={isListening} audioLevel={audioLevel} />
                                        <span className={(isListening || autoSubmitOnStop) ? 'text-white' : 'text-red-500'}>
                                            {(isListening || autoSubmitOnStop) ? 'Gönder' : 'Başla'}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    id="landscapeWarning"
                    style={{
                        display: 'none',
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        background: 'rgba(0, 0, 0, 0.8)',
                        color: 'white',
                        fontSize: '1.2em',
                        fontWeight: 'bold',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 1000,
                        textAlign: 'center',
                        padding: '20px'
                    }}
                >
                    <div>
                        <p>Daha iyi bir deneyim için lütfen cihazınızı yatay moda çevirin</p>
                        <p style={{ fontSize: '0.8em', marginTop: '10px' }}>
                            (Please rotate your device to landscape mode for the best experience)
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
