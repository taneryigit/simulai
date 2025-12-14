//src/app/simulations/[courseId]/[simulasyon_name]/speech/page.js
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { AuthContext } from "@/context/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useContext, useRef, useCallback, useMemo } from "react";
import TopNav from "@/components/TopNav";
import Image from "next/image";
import AudioUnlock from "@/components/AudioUnlock";


export default function SpeechSimulationPage() {
  const params = useParams();
  const router = useRouter();

  // ----- EXISTING STATES -----
  const [imageUrl, setImageUrl] = useState("");
  const [interimResult, setInterimResult] = useState("");
  const [finalResult, setFinalResult] = useState("");
  const [recognition, setRecognition] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState("");
  const [autoSubmitOnStop, setAutoSubmitOnStop] = useState(false);

  // OpenAI / simulation
  const [assistantId, setAssistantId] = useState(null);
  const [threadId, setThreadId] = useState(null);

  // NEW: Dual-mode + instructions from DB
  const [mode, setMode] = useState("assistants"); // "assistants" | "chat"
 const [, setInstructionsDb] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [endMessageOnly, setEndMessageOnly] = useState(false);
  const { user } = useContext(AuthContext);
  const courseId = params?.courseId;

  const textareaRef = useRef(null);
  const audioRef = useRef(null);

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

  // ----- UX ENHANCEMENTS (kept) -----
  const [audioLevel, setAudioLevel] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [isSendingTranscript, setIsSendingTranscript] = useState(false);
  const [isTypewriting, setIsTypewriting] = useState(false);
  const [displayedAiResponse, setDisplayedAiResponse] = useState("");
  const [pendingAiResponse, setPendingAiResponse] = useState(null);
  const canNavigateToReport = Boolean(threadId && courseId && params?.simulasyon_name);

  // Refs for audio analysis
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);
  const autoSubmitOnStopRef = useRef(false);
  const finalResultRef = useRef("");
  const handleSubmitRef = useRef(null);
  const sendAnimationTimeoutRef = useRef(null);
  const typewriterTimeoutRef = useRef(null);
  const redirectTimeoutRef = useRef(null);

  // TTS
  const [audioUrl, setAudioUrl] = useState(null);
  const [voiceGender, setVoiceGender] = useState("neutral");
  const [sessionVoice, setSessionVoice] = useState(null);
  const [isIOS, setIsIOS] = useState(false);

  // Voices
  const MALE_VOICES = ["onyx", "echo", "ash"];
  const FEMALE_VOICES = ["nova", "shimmer", "alloy"];
  const NEUTRAL_VOICES = ["sage", "coral", "fable"];

  const getRandomVoiceFromGender = (gender) => {
    let voiceSet;
    switch (gender) {
      case "male": voiceSet = MALE_VOICES; break;
      case "female": voiceSet = FEMALE_VOICES; break;
      case "neutral": voiceSet = NEUTRAL_VOICES; break;
      default:
        console.warn(`Unknown gender: ${gender}, defaulting to neutral`);
        voiceSet = NEUTRAL_VOICES;
    }
    const randomIndex = Math.floor(Math.random() * voiceSet.length);
    return voiceSet[randomIndex];
  };

  // --- AUDIO UNLOCK (unchanged) ---
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
          source.onended = () => { if (ctx.close) { ctx.close().catch(() => {}); } };
        }
      } catch (unlockError) {
        console.warn("Failed to unlock iOS audio:", unlockError);
      }
    }

    const element = audioRef.current;
    if (!element) return;

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

  // iOS detect
  useEffect(() => {
    const ua = window.navigator.userAgent?.toLowerCase?.() || "";
    const iOS = /iphone|ipad|ipod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(iOS);
  }, []);

  // Mobile viewport
  useEffect(() => {
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };
    setVh();
    const handleResize = () => setTimeout(setVh, 100);
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  // Audio level monitor
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
        const normalized = Math.min(average / 128, 1);
        setAudioLevel(normalized);
        animationId = requestAnimationFrame(updateAudioLevel);
      }
    };
    if (isListening && analyserRef.current) updateAudioLevel();
    return () => { if (animationId) cancelAnimationFrame(animationId); };
  }, [isListening]);

  // Microphone permission
  const checkMicrophonePermission = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("Tarayıcınız mikrofonu desteklemiyor");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });

      try {
        const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextCtor) throw new Error("Web Audio API desteklenmiyor");
        const audioContext = new AudioContextCtor();
        const analyser = audioContext.createAnalyser();
        const mic = audioContext.createMediaStreamSource(stream);
        analyser.fftSize = 256;
        mic.connect(analyser);
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        microphoneRef.current = mic;
        playSound("start");
        return true;
      } catch (audioError) {
        console.warn("Audio analysis setup failed:", audioError);
        playSound("start");
        return true;
      }
    } catch (error) {
      console.error("Microphone permission error:", error);
      let msg = "🎤 Mikrofon İzni Gerekli\n\n";
      if (error.name === "NotAllowedError") {
        msg += "Lütfen tarayıcınızdan mikrofon iznini aktifleştirin:\n1) URL çubuğundaki site ayarları\n2) Mikrofon: İzin ver\n";
      } else if (error.name === "NotFoundError") {
        msg += "Mikrofon bulunamadı. Bağlantıyı ve sistem izinlerini kontrol edin.";
      } else {
        msg += "Mikrofon erişiminde hata oluştu:\n" + error.message;
      }
      alert(msg);
      return false;
    }
  };

  // Notification sounds
  const playSound = (type) => {
    try {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) return;
      const ctx = new AudioContextCtor();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      if (type === "start") {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
      } else {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(440, ctx.currentTime + 0.15);
      }
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.25);
    } catch  { /* ignore */ }
  };

  // TTS
  const generateSpeech = async (text) => {
    if (!text) return;
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(null); }
      try { audio.pause(); audio.currentTime = 0; } catch {}
      audio.removeAttribute("src"); audio.load();
      audio.autoplay = false;
      audio.oncanplay = null; audio.onerror = null; audio.onended = null; audio.onplay = null; audio.onplaying = null; audio.onpause = null;

      setIsAudioLoaded(false);
      setLoadingProgress(0);
      setAudioLoadingStatus("Hazırlanıyor...");

      const trimmed = text.length > 4000 ? text.slice(0, 4000) + "..." : text;
      setAudioLoadingStatus();
      const voice = sessionVoice || getRandomVoiceFromGender(voiceGender || "neutral");

      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: trimmed, voice })
      });

      if (!res.ok) {
        const err = await res.text();
        setAudioLoadingStatus("Ses oluşturma hatası: " + (err || res.status));
        return;
      }

      const blob = await res.blob();
      if (!blob || blob.size === 0) {
        setAudioLoadingStatus("Boş ses verisi alındı!");
        return;
      }

      setLoadingProgress(50);
      setAudioLoadingStatus("Ses hazırlanıyor...");

      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      audio.setAttribute("webkit-playsinline", "true");
      audio.setAttribute("playsinline", "true");
      audio.preload = "auto";
      audio.muted = false; audio.volume = 1;
      audio.crossOrigin = "anonymous";
      audio.playsInline = true;
      audio.autoplay = (!isIOS || audioUnlocked);

      const safety = setTimeout(() => {
        setIsAudioLoaded(true);
        setAudioLoadingStatus();
        setLoadingProgress(100);
      }, 5000);

      const onCanPlay = () => {
        clearTimeout(safety);
        audio.oncanplay = null;
        setIsAudioLoaded(true);
        setAudioLoadingStatus();
        setLoadingProgress(100);

        if (!isIOS || audioUnlocked) {
          const p = audio.play();
          if (p && typeof p.catch === "function") {
            p.catch(() => setAudioLoadingStatus("Ses otomatik başlatılamadı. Tarayıcı ayarlarını kontrol edin."));
          }
        } else {
          setAudioLoadingStatus("Ses hazır. Tarayıcı ses izinlerini doğrulayın.");
        }
      };

      const onErr = () => {
        clearTimeout(safety);
        audio.onerror = null; audio.oncanplay = null;
        setAudioLoadingStatus("Ses yükleme hatası!");
        setIsAudioLoaded(false);
      };

      audio.oncanplay = onCanPlay;
      audio.onerror = onErr;
      audio.src = url;
      audio.load();

      setTimeout(() => {
        if (typeof audio.isConnected === "boolean" && !audio.isConnected) return;
        if (audio.readyState < 3) {
          clearTimeout(safety);
          setIsAudioLoaded(true);
          setAudioLoadingStatus();
          setLoadingProgress(100);
        }
      }, 3000);
    } catch  {
      setIsAudioLoaded(false);
      setAudioLoadingStatus("Ses yükleme başarısız: " + e.message);
    }
  };

  const stopSpeech = () => {
    if (audioRef.current) {
      try { audioRef.current.pause(); audioRef.current.currentTime = 0; }
      catch {}
    }
  };

  const clearTranscriptWithAnimation = () => {
    if (sendAnimationTimeoutRef.current) clearTimeout(sendAnimationTimeoutRef.current);
    sendAnimationTimeoutRef.current = setTimeout(() => {
      setFinalResult(""); finalResultRef.current = "";
      setIsSendingTranscript(false);
      sendAnimationTimeoutRef.current = null;
    }, 600);
  };

  const navigateToReport = () => {
    if (!threadId || !courseId || !params?.simulasyon_name) return;
    if (redirectTimeoutRef.current) { clearTimeout(redirectTimeoutRef.current); redirectTimeoutRef.current = null; }
    stopSpeech();
    router.push(`/simulations/${params.courseId}/${params.simulasyon_name}/rapor?threadId=${encodeURIComponent(threadId)}&courseId=${encodeURIComponent(courseId)}`);
  };

  // cleanup audioUrl
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        const a = audioRef.current;
        a.onplay = null; a.onplaying = null; a.onended = null; a.onpause = null; a.onerror = null;
        a.pause(); a.src = ""; audioRef.current = null;
      }
      if (sendAnimationTimeoutRef.current) { clearTimeout(sendAnimationTimeoutRef.current); sendAnimationTimeoutRef.current = null; }
      if (typewriterTimeoutRef.current) { clearTimeout(typewriterTimeoutRef.current); typewriterTimeoutRef.current = null; }
      if (redirectTimeoutRef.current) { clearTimeout(redirectTimeoutRef.current); redirectTimeoutRef.current = null; }
    };
  }, []);

  // autoplay once unlocked
  useEffect(() => {
    if (audioUnlocked && audioRef.current && isAudioLoaded && audioRef.current.paused) {
      const el = audioRef.current;
      el.setAttribute("webkit-playsinline", "true");
      el.setAttribute("playsinline", "true");
      el.autoplay = true;
      setTimeout(() => {
        const p = el.play();
        if (p && typeof p.catch === "function") {
          p.catch(() => setAudioLoadingStatus("Ses otomatik başlatılamadı. Lütfen tarayıcı ayarlarınızı kontrol edin."));
        }
      }, isIOS ? 200 : 50);
    }
  }, [audioUnlocked, isAudioLoaded, isIOS]);

  // typewriter for AI response
  useEffect(() => {
    if (!pendingAiResponse || !isAudioLoaded) return;
    if (typewriterTimeoutRef.current) { clearTimeout(typewriterTimeoutRef.current); typewriterTimeoutRef.current = null; }
    const full = pendingAiResponse;
    let idx = 0;
    const startDelay = 150, stepDelay = 18;
    setDisplayedAiResponse(""); setIsTyping(false); setIsTypewriting(true);
    const step = () => {
      idx += 1;
      setDisplayedAiResponse(full.slice(0, idx));
      if (idx < full.length) {
        typewriterTimeoutRef.current = setTimeout(step, stepDelay);
      } else {
        setDisplayedAiResponse(full); setIsTypewriting(false); setPendingAiResponse(null); typewriterTimeoutRef.current = null;
      }
    };
    typewriterTimeoutRef.current = setTimeout(step, startDelay);
    return () => { if (typewriterTimeoutRef.current) { clearTimeout(typewriterTimeoutRef.current); typewriterTimeoutRef.current = null; } };
  }, [pendingAiResponse, isAudioLoaded]);

  // orientation helper
  useEffect(() => {
    function checkOrientation() {
      const isMobile = window.innerWidth <= 768;
      const isPortrait = window.innerHeight > window.innerWidth;
      const el = document.getElementById("landscapeWarning");
      if (!el) return;
      el.style.display = isMobile && isPortrait ? "flex" : "none";
    }
    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", () => setTimeout(checkOrientation, 100));
    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  // --- URL mode override (optional) ---
  const urlMode = useMemo(() => {
    if (typeof window === "undefined") return null;
    const m = new URLSearchParams(window.location.search).get("mode");
    return m === "chat" || m === "assistants" ? m : null;
  }, []);

  // ---- INIT (dual-mode) ----
  useEffect(() => {
    const clearIncompleteSimulations = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Oturum açılmamış. Lütfen giriş yapın.");
        const res = await fetch("/api/simulations/clear-incomplete", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
        const out = await res.json();
        if (!out.success) throw new Error(out.error || "Simülasyon temizleme hatası");
      } catch { /* silent */ }
    };

    const initializeSimulation = async () => {
      try {
        if (params?.simulasyon_name) {
          await clearIncompleteSimulations();

          // mevcut projen: GET + query param. (compatibility)
          const response = await fetch(`/api/simulations/init?simulasyon_name=${encodeURIComponent(params.simulasyon_name)}`);
          const data = await response.json();

          if (data.assistant_id) setAssistantId(data.assistant_id);
          if (data.thread_id) setThreadId(data.thread_id);

          // RESOLVE MODE: url override > api > assistant_id presence
          const resolved = urlMode || data.mode || (data.assistant_id ? "assistants" : "chat");
          setMode(resolved);

          // instructions (DB) for preview / debugging
          if (typeof data.instructions === "string") setInstructionsDb(data.instructions);

          // voice
          if (data.voice_gender) {
            const gender = String(data.voice_gender || "").trim().toLowerCase();
            setVoiceGender(gender);
            setSessionVoice(getRandomVoiceFromGender(gender));
          } else {
            setSessionVoice(getRandomVoiceFromGender("neutral"));
            setVoiceGender("neutral");
          }
        }
      } catch (e) {
        console.error("❌ Error during simulation initialization:", e);
        setSessionVoice("sage");
        setVoiceGender("neutral");
      }
    };

    initializeSimulation();
  }, [params?.simulasyon_name, urlMode]);


useEffect(() => {
  if (voiceGender && !sessionVoice) {
    setSessionVoice(getRandomVoiceFromGender(voiceGender));
  }
}, [voiceGender, sessionVoice]);


  // Auto-resize upper textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const adjust = () => {
      if (!textareaRef.current) return;
      const node = textareaRef.current;
      node.style.height = "auto";
      const rect = node.getBoundingClientRect();
      const bottomPadding = 24;
      const available = Math.max(window.innerHeight - rect.top - bottomPadding, 120);
      const target = Math.min(node.scrollHeight, available);
      node.style.height = `${target}px`;
      node.scrollTop = node.scrollHeight;
    };
    adjust();
    const handleResize = () => adjust();
    const obs = typeof ResizeObserver !== "undefined" ? new ResizeObserver(adjust) : null;
    if (obs) obs.observe(textarea);
    window.addEventListener("resize", handleResize);
    return () => { if (obs) obs.disconnect(); window.removeEventListener("resize", handleResize); };
  }, [aiResponse, displayedAiResponse, isLoading, isTyping, isTypewriting]);

  useEffect(() => {
    const ta = textareaRef.current; if (!ta) return;
    ta.scrollTop = ta.scrollHeight;
  }, [displayedAiResponse, aiResponse, isTypewriting]);

  // Images
  useEffect(() => {
    if (params?.simulasyon_name) {
      fetchRandomImage(params.simulasyon_name);
      fetchBackgroundImage(params.simulasyon_name);
    }
  }, [params]);

  const fetchRandomImage = async (simulationName) => {
    try {
      const res = await fetch(`/api/simulations/images?simulation=${simulationName}`);
      const data = await res.json();
      if (res.ok && data.images.length > 0) {
        const i = Math.floor(Math.random() * data.images.length);
        setImageUrl(`/images/simulasyon/${simulationName}/positive/${data.images[i]}`);
      }
    } catch { /* silent */ }
  };

  const fetchBackgroundImage = async (simulationName) => {
    try {
      const res = await fetch(`/api/simulations/background-images?simulation=${simulationName}`);
      const data = await res.json();
      if (res.ok && data.images.length > 0) {
        const i = Math.floor(Math.random() * data.images.length);
        setBackgroundImageUrl(`/images/simulasyon/${simulationName}/background/${data.images[i]}`);
      }
    } catch { /* silent */ }
  };

  // Save to complete
  const saveToCompleteTable = async (userId, courseId, simulasyonName, userResponse, aiResponse, threadId) => {
    if (!userId || !courseId || !simulasyonName) throw new Error("Missing required fields");
    if (!userResponse?.trim() || !aiResponse?.trim()) throw new Error("Missing response data");

    const payload = {
      user_id: parseInt(userId, 10),
      course_id: parseInt(courseId, 10),
      simulasyon_name: simulasyonName.trim(),
      user_response: userResponse.trim(),
      ai_response: aiResponse.trim(),
      thread_id: threadId
    };

    if (aiResponse.includes("Eğitim simülasyonumuz burada bitti")) {
      const keyPointData = extractKeyPointData(aiResponse);
      if (!keyPointData) throw new Error("Failed to extract key point data");
      Object.assign(payload, keyPointData);
    }

    const res = await fetch("/api/simulations/save", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error((await res.json()).error || "Failed to save data");
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Server indicated failure");
    return data;
  };

  // Speech recognition
  useEffect(() => {
    if (typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.interimResults = true; rec.lang = "tr-TR"; rec.continuous = true; rec.maxAlternatives = 1;

      rec.onstart = () => { setIsListening(true); };
      rec.onend = () => {
        setIsListening(false); setAutoSubmitOnStop(false);
        if (autoSubmitOnStopRef.current) {
          autoSubmitOnStopRef.current = false;
          setTimeout(() => { if (handleSubmitRef.current) handleSubmitRef.current({ trigger: "auto" }); }, 100);
        }
      };
      rec.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          let t = event.results[i][0].transcript;
          t = t.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
          if (event.results[i].isFinal) {
            setFinalResult((prev) => {
              const next = (prev + " " + t).trim();
              finalResultRef.current = next;
              return next;
            });
          } else {
            interim += t + " ";
          }
        }
        setInterimResult(interim.trim());
      };
      rec.onerror = (ev) => {
        console.error("Error:", ev.error);
        setIsListening(false);
        setAutoSubmitOnStop(false);
        autoSubmitOnStopRef.current = false;
        setIsSendingTranscript(false);
        let msg = "❌ Ses Tanıma Hatası\n\n";
        if (ev.error === "not-allowed") {
          msg += "Mikrofon izni yok. Tarayıcı ayarlarından mikrofon iznini verip yenileyin.";
        } else if (ev.error === "no-speech") {
          msg += "Ses algılanamadı. Mikrofona yakın ve net konuşun.";
        } else if (ev.error === "audio-capture") {
          msg += "Ses yakalama hatası. Mikrofon çalışıyor ve başka uygulamalar kullanmıyor olmalı.";
        } else {
          msg += `Hata kodu: ${ev.error}\nLütfen sayfayı yenileyip tekrar deneyin.`;
        }
        alert(msg);
      };

      setRecognition(rec);
      return () => {
        if (rec) {
          try { rec.stop(); } catch  {}
        }
      };
    }
  }, []);

  const startRecognition = async () => {
    if (recognition && !isListening) {
      const ok = await checkMicrophonePermission();
      if (!ok) return;
      try {
        if (sendAnimationTimeoutRef.current) { clearTimeout(sendAnimationTimeoutRef.current); sendAnimationTimeoutRef.current = null; }
        setIsSendingTranscript(false);
        setInterimResult("");
        setFinalResult("");
        finalResultRef.current = "";
        setDisplayedAiResponse("");
        setPendingAiResponse(null);
        setIsTypewriting(false);
        setAutoSubmitOnStop(false);
        autoSubmitOnStopRef.current = false;
        setAudioLevel(0);
        stopSpeech();
        if (isListening) recognition.stop();
        setTimeout(() => recognition.start(), 100);
      } catch  {
        setIsListening(false);
        alert("❌ Ses tanıma başlatılamadı. Lütfen sayfayı yenileyin ve tekrar deneyin.");
      }
    }
  };

  const stopRecognition = ({ autoSubmit = false } = {}) => {
    if (autoSubmit) { setAutoSubmitOnStop(true); autoSubmitOnStopRef.current = true; }
    if (recognition && isListening) {
      try {
        recognition.stop();
        setAudioLevel(0);
        playSound("stop");
        if (audioContextRef.current && audioContextRef.current.state !== "closed") audioContextRef.current.close();
        audioContextRef.current = null; analyserRef.current = null; microphoneRef.current = null;
      } catch  {
        setIsListening(false);
        if (autoSubmit) { setAutoSubmitOnStop(false); autoSubmitOnStopRef.current = false; }
        setIsSendingTranscript(false);
      }
    } else if (autoSubmit) {
      setAutoSubmitOnStop(false); autoSubmitOnStopRef.current = false;
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
      if (sendAnimationTimeoutRef.current) { clearTimeout(sendAnimationTimeoutRef.current); sendAnimationTimeoutRef.current = null; }
      setIsSendingTranscript(false);
      await startRecognition();
    }
  };

  // Extract key points (unchanged)
  const extractKeyPointData = (text) => {
    const out = {};
    const keyRe = /"Key(\d+)":\s*"([^"]+)",\s*"Puan\1":\s*(\d+)/g;
    let m; let found = 0;
    while ((m = keyRe.exec(text)) !== null) {
      const n = m[1]; const t = m[2].trim(); const p = parseInt(m[3], 10);
      if (!t || isNaN(p)) return null;
      out[`key${n}`] = t; out[`puan${n}`] = p; found++;
    }
    const totRe = /"Toplam_Puan":\s*(\d+)/;
    const matchTot = totRe.exec(text);
    if (matchTot && matchTot[1]) out.toplam_puan = parseInt(matchTot[1], 10);
    else {
      const idx = text.indexOf('"Toplam_Puan":');
      if (idx !== -1) {
        const sub = text.substring(idx + '"Toplam_Puan":'.length).trim();
        const nm = /^s*(\d+)/.exec(sub);
        if (nm && nm[1]) out.toplam_puan = parseInt(nm[1], 10);
      }
    }
    if (!out.toplam_puan && found > 0) {
      let sum = 0; for (let i = 1; i <= 10; i++) if (out[`puan${i}`]) sum += out[`puan${i}`];
      out.toplam_puan = sum;
    }
    if (found === 0) return null;
    return out;
  };

  const handleSimulationEnd = async (response) => {
    try {
      if (!params?.simulasyon_name || !threadId || !courseId || !user?.id) throw new Error("Missing required simulation data");
      let extracted = extractKeyPointData(response);
      if (!extracted) extracted = extractKeyPointData(response);
      if (!extracted) {
        extracted = {
          key1: null, key2: null, key3: null, key4: null, key5: null,
          key6: null, key7: null, key8: null, key9: null, key10: null,
          puan1: null, puan2: null, puan3: null, puan4: null, puan5: null,
          puan6: null, puan7: null, puan8: null, puan9: null, puan10: null,
          toplam_puan: null
        };
      }
      const payload = {
        simulasyon_name: params.simulasyon_name.trim(),
        thread_id: threadId,
        course_id: parseInt(courseId, 10),
        user_id: parseInt(user.id, 10),
        user_response: finalResultRef.current.trim(),
        ai_response: response.trim(),
        ...extracted
      };
      const verify = await fetch("/api/simulations/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!verify.ok) throw new Error("Failed to process simulation end");

      if (typewriterTimeoutRef.current) { clearTimeout(typewriterTimeoutRef.current); typewriterTimeoutRef.current = null; }
      setPendingAiResponse(null);
      setDisplayedAiResponse("");
      setIsTypewriting(false);
      setIsTyping(false);
      setIsSendingTranscript(false);
      setInterimResult("");
      finalResultRef.current = "";
      setFinalResult("");
      setShowInstructions(false);
      setAutoSubmitOnStop(false);
      autoSubmitOnStopRef.current = false;
      stopSpeech();
      setEndMessageOnly(true);
      setAiResponse("Eğitim simülasyonumuz burada bitti.");
      if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = setTimeout(() => navigateToReport(), 3000);
    } catch (e) {
      console.error("Simulation end error:", e);
    }
  };

  // ---- SUBMIT (DUAL-MODE) ----
  const handleSubmit = async ({ trigger = "manual" } = {}) => {
    const transcript = finalResultRef.current.trim();

    // Guards: transcript + user + course must exist; assistant only for assistants mode
    if (!transcript || !user?.id || !courseId || (mode === "assistants" && !assistantId)) {
      if (isSendingTranscript) setIsSendingTranscript(false);
      if (!transcript && trigger === "manual") {
        alert("⚠️ Lütfen bir şeyler söyleyin!\n\nÖnce Başla butonuna basıp konuşun, sonra tekrar basarak kaydı bitirin.");
      }
      setIsTyping(false); setIsTypewriting(false); setPendingAiResponse(null);
      return;
    }

    setAiResponse("");
    setDisplayedAiResponse("");
    setPendingAiResponse(null);
    setIsTypewriting(false);
    setIsLoading(true);
    setIsTyping(true);
    stopSpeech();

    try {
      // Build payload for process route
      const body = {
        content: transcript,
        thread_id: threadId,
        mode,
        assistant_id: mode === "assistants" ? assistantId : undefined,
        simulasyon_name: mode === "chat" ? params.simulasyon_name : undefined
      };

      const processResponse = await fetch("/api/simulations/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await processResponse.json();

      if (data?.response) {
        await saveToCompleteTable(user.id, courseId, params.simulasyon_name, transcript, data.response, threadId);

        const isFinal = data.response.includes("Eğitim simülasyonumuz burada bitti");
        if (isFinal) {
          await handleSimulationEnd(data.response);
        } else {
          setAiResponse(data.response);
          setPendingAiResponse(data.response);
          setDisplayedAiResponse("");
          setIsTypewriting(false);
          generateSpeech(data.response);
        }

        setInterimResult("");
        finalResultRef.current = "";
        clearTranscriptWithAnimation();
        fetchRandomImage(params.simulasyon_name);
      } else {
        setIsSendingTranscript(false);
        setIsTyping(false);
        setIsTypewriting(false);
        setPendingAiResponse(null);
      }
    } catch {
      setIsSendingTranscript(false);
      setIsTyping(false);
      setIsTypewriting(false);
      setPendingAiResponse(null);
      alert("İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  };

  handleSubmitRef.current = handleSubmit;

  // UI bits (unchanged)
  const MicrophoneIcon = ({ isRecording, audioLevel }) => {
    const waveScale = isRecording ? 1 + (audioLevel * 0.3) : 1;
    return (
      <div className="relative flex items-center justify-center">
        {isRecording && (
          <>
            <div className="absolute rounded-full border-2 border-white"
              style={{ width: `${32 + (audioLevel * 22)}px`, height: `${32 + (audioLevel * 22)}px`, opacity: 0.8 + (audioLevel * 0.2), borderWidth: "2px", animation: "pulse 1.4s infinite", boxShadow: "0 0 8px rgba(255,255,255,0.6)" }} />
            <div className="absolute rounded-full border-2 border-red-300"
              style={{ width: `${48 + (audioLevel * 32)}px`, height: `${48 + (audioLevel * 32)}px`, opacity: 0.6 + (audioLevel * 0.4), borderWidth: "2px", animation: "pulse 2.0s infinite", boxShadow: "0 0 6px rgba(252,165,165,0.4)" }} />
            <div className="absolute rounded-full border border-red-500"
              style={{ width: `${62 + (audioLevel * 38)}px`, height: `${62 + (audioLevel * 38)}px`, opacity: 0.4 + (audioLevel * 0.6), borderWidth: "1px", animation: "pulse 2.5s infinite" }} />
            <div className="absolute rounded-full bg-red-400"
              style={{ width: `${15 + (audioLevel * 10)}px`, height: `${15 + (audioLevel * 10)}px`, opacity: 0.1 + (audioLevel * 0.2), filter: "blur(4px)", animation: "pulse 1.1s infinite" }} />
          </>
        )}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`relative z-20 transition-all duration-300 ${isRecording ? "text-white" : "text-red-500"}`}
          style={{ transform: `scale(${waveScale})`, filter: isRecording ? `drop-shadow(0 0 8px rgba(239,68,68,0.8)) brightness(1.1)` : "drop-shadow(0 2px 4px rgba(0,0,0,0.1))" }}>
          <path d="M12 14C13.66 14 15 12.66 15 11V5C15 3.34 13.66 2 12 2C10.34 2 9 3.34 9 5V11C9 12.66 10.34 14 12 14Z" fill="currentColor" />
          <path d="M17 11C17 14.53 14.39 17.44 11 17.93V21H13C13.55 21 14 21.45 14 22C14 22.55 13.55 23 13 23H11C10.45 23 10 22.55 10 22C10 21.45 10.45 21 11 21H13V17.93C9.61 17.44 7 14.53 7 11H5C5 15.08 8.05 18.45 12 18.95C15.95 18.45 19 15.08 19 11H17Z" fill="currentColor" />
        </svg>
      </div>
    );
  };

  const TypingIndicator = () => (
    <div className="flex items-center space-x-1 bg-white/80 rounded-full px-3 py-2 shadow-md">
      <span className="text-red-600 text-xs font-medium mr-2">AI yazıyor</span>
      <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
      <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
      <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
    </div>
  );

  return (
    <>
      {!audioUnlocked && <AudioUnlock onUnlocked={handleAudioUnlock} />}
      <audio ref={audioRef} className="hidden" playsInline preload="auto" crossOrigin="anonymous" />

      <div
        className="w-screen flex flex-col md:flex-row min-h-screen overflow-hidden"
        style={{
          backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : "none",
          backgroundSize: "100% 100%",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundColor: backgroundImageUrl ? "transparent" : "#f0f0f0",
          minHeight: "calc(var(--vh, 1vh) * 100)",
          height: "auto",
          WebkitOverflowScrolling: "touch"
        }}
      >
        <div className="min-h-screen bg-white relative w-full md:w-auto">
          <TopNav />
        </div>

        <div
          className="left w-full md:w-2/5 px-4 flex justify-center items-center"
          style={{
            height: "calc(var(--vh, 1vh) * 100)",
            maxHeight: "calc(var(--vh, 1vh) * 100)",
            paddingTop: "2rem",
            paddingBottom: "1rem",
            boxSizing: "border-box"
          }}
        >
          <div className="image-container w-full h-full flex items-center justify-center">
            {imageUrl && (
              <Image
                src={imageUrl}
                alt="Simülasyon"
                className="w-auto max-w-full h-full object-contain"
                width={600}
                height={900}
                priority
                style={{ maxHeight: "100%", width: "auto" }}
              />
            )}
          </div>
        </div>

        <div
          className="right w-full md:w-3/5 flex flex-col"
          style={{
            height: "calc(var(--vh, 1vh) * 100)",
            maxHeight: "calc(var(--vh, 1vh) * 100)",
            paddingTop: "4rem",
            paddingBottom: "1rem",
            boxSizing: "border-box",
            overflowY: "auto"
          }}
        >
          <div className="p-4 flex flex-col space-y-4 flex-1 min-h-0">
            <div className="relative bg-white/90 border border-gray-200 rounded-lg shadow-sm p-4 flex-shrink-0">
              {endMessageOnly ? (
                <div className="space-y-4 text-gray-900">
                  <p className="text-base font-semibold whitespace-pre-line">
                    {aiResponse || "Eğitim simülasyonumuz burada bitti."}
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
                      ? "3 saniye içinde otomatik yönlendirileceksiniz…"
                      : "Raporu görmek için gerekli bilgiler hazırlanıyor…"}
                  </p>
                </div>
              ) : (
                <>
                  
                

                  <textarea
                    ref={textareaRef}
                    className="w-full p-2 border rounded bg-gray-100 text-gray-900 resize-none transition-height duration-200"
                    value={
                      isTypewriting
                        ? displayedAiResponse
                        : isTyping
                        ? ""
                        : (displayedAiResponse || aiResponse)
                    }
                    placeholder={
                      (displayedAiResponse || aiResponse || isTyping || isTypewriting || isLoading)
                        ? ""
                        : "Sizi dinliyorum..."
                    }
                    readOnly
                    style={{
                      height: "35vh",
                      maxHeight: "35vh",
                      overflowY: "auto",
                      overflowX: "hidden",
                      wordWrap: "break-word",
                      whiteSpace: "pre-wrap",
                      padding: "8px",
                      lineHeight: "1.2"
                    }}
                  />
                  {isTyping && (
                    <div className="absolute bottom-6 right-6">
                      <TypingIndicator />
                    </div>
                  )}

                  {/* Voice Debug Info */}
                  {process.env.NODE_ENV === "development" && (
                    <div className="mt-3 text-xs text-gray-500 bg-gray-100 p-2 rounded">
                      <div>Voice Gender: {voiceGender}</div>
                      <div>Session Voice: {sessionVoice}</div>
                    </div>
                  )}

                  {/* TTS Loading */}
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
                        <p className="text-xs font-semibold tracking-wide uppercase text-gray-500 mb-1">
                          Anlık Sonuçlar
                        </p>
                        <p className="whitespace-pre-line text-sm leading-relaxed">{interimResult}</p>
                      </div>
                    )}
                    <textarea
                      className={`textarea w-full text-gray-900 transition-all duration-500 ease-in-out transform ${
                        isSendingTranscript ? "opacity-60 -translate-y-1 bg-gray-200" : "opacity-100 translate-y-0 bg-white"
                      }`}
                      value={showInstructions ? instructionsText : finalResult}
                      readOnly
                      style={{
                        resize: "vertical",
                        whiteSpace: "pre-line",
                        minHeight: "25vh",
                        maxHeight: "40vh",
                        overflowY: "auto"
                      }}
                    />
                  </div>
                </div>

                <div className="flex justify-start mt-[-20px]">
                  <button
                    className={`flex items-center gap-2 px-4 py-2 rounded font-medium transition-all duration-200 shadow-md overflow-visible relative ${
                      (isListening || autoSubmitOnStop)
                        ? "bg-red-500 hover:bg-red-600 text-white"
                        : "bg-white hover:bg-gray-50 text-red-500 border-2 border-red-500"
                    }`}
                    onClick={handlePrimaryButtonClick}
                    disabled={isLoading || autoSubmitOnStop || endMessageOnly}
                    style={{ position: "relative", minWidth: "98px", minHeight: "42px" }}
                  >
                    <MicrophoneIcon isRecording={isListening} audioLevel={audioLevel} />
                    <span className={(isListening || autoSubmitOnStop) ? "text-white" : "text-red-500"}>
                      {(isListening || autoSubmitOnStop) ? "Gönder" : "Başla"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* orientation hint */}
        <div
          id="landscapeWarning"
          style={{
            display: "none",
            position: "fixed",
            top: 0, left: 0, width: "100vw", height: "100vh",
            background: "rgba(0, 0, 0, 0.8)", color: "white",
            fontSize: "1.2em", fontWeight: "bold",
            justifyContent: "center", alignItems: "center",
            zIndex: 1000, textAlign: "center", padding: "20px"
          }}
        >
          <div>
            <p>Daha iyi bir deneyim için lütfen cihazınızı yatay moda çevirin</p>
            <p style={{ fontSize: "0.8em", marginTop: "10px" }}>
              (Please rotate your device to landscape mode for the best experience)
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
