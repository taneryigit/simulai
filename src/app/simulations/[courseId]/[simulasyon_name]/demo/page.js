//src/app/simulations/[courseId]/[simulasyon_name]/demo/page.js
"use client";
import { AuthContext } from "@/context/AuthContext";
import { useParams } from "next/navigation";
import { useEffect, useState, useContext, useRef, useCallback } from "react";
import TopNav from "@/components/TopNav";
import Image from "next/image";

export default function TutorialDemoPage() {
    const params = useParams();
    const [imageUrl, setImageUrl] = useState("");
    const [interimResult, setInterimResult] = useState("");
    const [finalResult, setFinalResult] = useState("");
    const [recognition, setRecognition] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [autoSubmitOnStop, setAutoSubmitOnStop] = useState(false);
    const [backgroundImageUrl, setBackgroundImageUrl] = useState("");
    const [assistantId, setAssistantId] = useState(null);
    const [threadId, setThreadId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [aiResponse, setAiResponse] = useState("");
    const { user } = useContext(AuthContext);
    const courseId = params?.courseId;
    const [showInstructions, setShowInstructions] = useState(true);

    const instructionsText = [
        "• Simulasyona başlamak için Başla butonuna tıklayınız.",
        "• Konuşmanız bitince aynı butona tekrar basın; kayıt durur ve konuşmanız otomatik gönderilir.",
        "• Konuşmanız sürerken geçici sonuçlar bu alanın üstündeki Anlık Sonuçlar bölümünde görünür; durdurduğunuzda metne eklenir.",
        "• Konuştuklarınız görünmüyorsa mikrofona izin vermemişsinizdir. Lütfen izin verin.",
        "• Tam çevrilmeyen birkaç kelime olsa da konuşmaya devam edebilirsiniz."
    ].join("\n");


    // UX enhancement states
    const [audioLevel, setAudioLevel] = useState(0);
    const [isTyping, setIsTyping] = useState(false);
    const [isSendingTranscript, setIsSendingTranscript] = useState(false);
    const [isTypewriting, setIsTypewriting] = useState(false);
    const [displayedAiResponse, setDisplayedAiResponse] = useState("");
    const [pendingAiResponse, setPendingAiResponse] = useState(null);

    const textareaRef = useRef(null);

    // Refs for audio analysis and flow coordination
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const microphoneRef = useRef(null);
    const autoSubmitOnStopRef = useRef(false);
    const finalResultRef = useRef("");
    const handleSubmitRef = useRef(null);
    const sendAnimationTimeoutRef = useRef(null);
    const typewriterTimeoutRef = useRef(null);

    // Tutorial specific states
    const [tutorialActive, setTutorialActive] = useState(true);
    const [currentStep, setCurrentStep] = useState(0);
    const [tutorialCompleted, setTutorialCompleted] = useState(false);
    const [overlayStyle, setOverlayStyle] = useState({
        top: '10vh',
        right: '1rem',
        left: 'auto',
        width: '18rem'
    });

    // Tutorial steps configuration
    const tutorialSteps = [
        {
            id: 'welcome',
            title: 'Simülasyon Eğitimi\'ne Hoş Geldiniz!',
            description: 'Merhaba, ben Simay. Bu eğitimde simulasyon sayfasını ve işlevlerini tanıyacaksınız. Hazır olduğunuzda devam edebiliriniz.',
            target: null,
            position: 'center'
        },
        {
            id: 'mic-button',
            title: 'Başla / Gönder Butonu',
            description: 'Konuşmaya başlamak için "Başla" butonuna basın. Konuşmanız bittiğinde aynı buton "Gönder" olarak değişir ve kaydı otomatik olarak bana gönderir.',
            target: 'mic-button',
            position: 'top'
        },
        {
            id: 'microphone-permission',
            title: 'Mikrofon İzni',
            description: 'Başla butonuna bastığınızda tarayıcınız mikrofon izni isteyebilir. "Siteyi ziyaret ederken izin ver" seçeneğini işaretlediğinizden emin olun.',
            target: null,
            position: 'center',
            showImage: true,
            imagePath: '/images/background/mic.png'
        },
        {
            id: 'transcript-area',
            title: 'Tüm Konuştuklarınız',
            description: 'Konuştuklarınız otomatik olarak metne dönüşür ve bu bölümde toplanır. Konuşmanız bitince gönder ile bana gönderebilirsiniz.',
            target: 'transcript-area',
            position: 'top'
        },
        {
            id: 'listening-area',
            title: 'Sizi Dinliyorum Alanı',
            description: 'AI asistanının yanıtı bu alanda görünür. Yazım devam ederken "AI yazıyor" bildirimi belirecektir.',
            target: 'listening-area',
            position: 'bottom'
        },
           {
            id: 'yardimm',
            title: 'Yardım ve Destek',
            description: 'Herhangi bir sorunuz olursa yardim@simulai.com.tr adresine mail atabilirsiniz. Size yardımcı olmaktan mutluluk duyarız!',
            target: null,
            position: 'center'
        },
        {
            id: 'yardim',
            title: 'Demoyu tamamladınız!',
            description: 'Süper! artık hazırsınız. Birlikte bir deneme yapalım mı ? Bakalım pop müziğe ne kadar hakimsin :) Şimdiden başarılar!',
            target: null,
            position: 'center'
        }
    
    ];

    const updateOverlayPosition = useCallback(() => {
        if (!tutorialActive) {
            return;
        }

        const anchorElement = document.querySelector('[data-tutorial-id="listening-area"]');
        if (anchorElement) {
            const rect = anchorElement.getBoundingClientRect();
            const desiredWidth = Math.min(rect.width, 320);
            const availableMaxLeft = window.innerWidth - desiredWidth - 16;
            const clampedLeft = Math.max(16, Math.min(rect.left, availableMaxLeft));

            setOverlayStyle({
                top: `${rect.bottom + 16}px`,
                left: `${clampedLeft}px`,
                right: 'auto',
                width: `${desiredWidth}px`
            });
        } else {
            setOverlayStyle({
                top: '10vh',
                right: '1rem',
                left: 'auto',
                width: '18rem'
            });
        }
    }, [tutorialActive]);

    useEffect(() => {
        if (!tutorialActive) {
            return undefined;
        }

        updateOverlayPosition();
        window.addEventListener('resize', updateOverlayPosition);
        window.addEventListener('scroll', updateOverlayPosition, true);

        return () => {
            window.removeEventListener('resize', updateOverlayPosition);
            window.removeEventListener('scroll', updateOverlayPosition, true);
        };
    }, [tutorialActive, currentStep, updateOverlayPosition]);

    // Mobile viewport handling
    useEffect(() => {
        const setVh = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };

        setVh();

        const handleResize = () => {
            setTimeout(() => {
                setVh();
            }, 100);
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
        };
    }, []);

    // Check device orientation for mobile users
    useEffect(() => {
        const checkOrientation = () => {
            const isMobile = window.innerWidth <= 768;
            const isPortrait = window.innerHeight > window.innerWidth;

            const warning = document.getElementById('landscapeWarning');
            if (!warning) {
                return;
            }

            if (isMobile && isPortrait) {
                warning.style.display = 'flex';
            } else {
                warning.style.display = 'none';
            }
        };

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

    // Audio level monitoring
    useEffect(() => {
        let animationId;

        const updateAudioLevel = () => {
            if (analyserRef.current && isListening) {
                const bufferLength = analyserRef.current.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                analyserRef.current.getByteFrequencyData(dataArray);

                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                const average = sum / bufferLength;
                const normalizedLevel = Math.min(average / 128, 1);

                setAudioLevel(normalizedLevel);
                animationId = requestAnimationFrame(updateAudioLevel);
            }
        };

        if (isListening && analyserRef.current) {
            updateAudioLevel();
        }

        return () => {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        };
    }, [isListening]);

    // Check microphone permission
    const checkMicrophonePermission = async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Tarayıcınız mikrofonu desteklemiyor');
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) {
                    throw new Error('Web Audio API desteklenmiyor');
                }

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

            let errorMessage = "🎤 Mikrofon İzni Gerekli\n\n";

            if (error.name === 'NotAllowedError') {
                errorMessage += "Lütfen tarayıcınızdan mikrofon iznini aktifleştirin:\n\n";
                errorMessage += "1. URL çubuğundaki simgeye tıklayarak site ayarlarına gidin\n";
                errorMessage += "2. \"Gizlilik ve güvenlik\" menüsünden Site Ayarlarına gidin\n";
                errorMessage += "3. Mikrofon menüsünden izin verin";
            } else if (error.name === 'NotFoundError') {
                errorMessage += "Mikrofon bulunamadı. Lütfen:\n\n";
                errorMessage += "1. Mikrofonunuzun bağlı olduğundan emin olun\n";
                errorMessage += "2. Sistem ayarlarından mikrofon erişimini kontrol edin";
            } else {
                errorMessage += `Mikrofon erişiminde hata oluştu:\n${error.message}`;
            }

            alert(errorMessage);
            return false;
        }
    };
    // Enhanced notification sounds with better feedback
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

    // Fetch assistant and thread IDs for demo
    useEffect(() => {
        const initializeSimulation = async () => {
            try {
                if (params?.simulasyon_name) {
                    const response = await fetch(`/api/simulations/init?simulasyon_name=${encodeURIComponent(params.simulasyon_name)}`);
                    const data = await response.json();
                    if (data.assistant_id) setAssistantId(data.assistant_id);
                    if (data.thread_id) setThreadId(data.thread_id);
                }
            } catch (error) {
                console.error('Failed to initialize simulation:', error);
            }
        };

        initializeSimulation();
    }, [params]);

    // Auto-resize textarea similar to ana sayfa düzeni
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const adjustHeight = () => {
            if (!textareaRef.current) {
                return;
            }

            const node = textareaRef.current;
            node.style.height = 'auto';

            const rect = node.getBoundingClientRect();
            const bottomPadding = 24;
            const availableHeight = Math.max(
                window.innerHeight - rect.top - bottomPadding,
                120
            );

            const targetHeight = Math.min(node.scrollHeight, availableHeight);
            node.style.height = `${targetHeight}px`;
            node.scrollTop = node.scrollHeight;
        };

        adjustHeight();

        const handleResize = () => adjustHeight();
        const observer = typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(adjustHeight)
            : null;

        if (observer) {
            observer.observe(textarea);
        }

        window.addEventListener('resize', handleResize);

        return () => {
            if (observer) {
                observer.disconnect();
            }
            window.removeEventListener('resize', handleResize);
        };
    }, [aiResponse, displayedAiResponse, isLoading, isTyping, isTypewriting]);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.scrollTop = textarea.scrollHeight;
    }, [displayedAiResponse, aiResponse, isTypewriting]);

    useEffect(() => {
        if (!pendingAiResponse) {
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
    }, [pendingAiResponse]);

    useEffect(() => {
        if (params?.simulasyon_name) {
            fetchRandomImage(params.simulasyon_name);
            fetchBackgroundImage(params.simulasyon_name);
        }
    }, [params]);

    const fetchRandomImage = async (simulationName) => {
        try {
            const response = await fetch(`/api/simulations/images?simulation=${simulationName}`);
            const data = await response.json();
            if (response.ok && data.images.length > 0) {
                const randomIndex = Math.floor(Math.random() * data.images.length);
                setImageUrl(`/images/simulasyon/${simulationName}/positive/${data.images[randomIndex]}`);
            }
        } catch (error) {
            console.error('Failed to fetch image:', error);
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
        } catch (error) {
            console.error('Failed to fetch background image:', error);
        }
    };

    // Speech recognition setup
    useEffect(() => {
        if (typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognitionInstance = new SpeechRecognition();

            recognitionInstance.interimResults = true;
            recognitionInstance.lang = "tr-TR";
            recognitionInstance.continuous = true;
            recognitionInstance.maxAlternatives = 1;

            recognitionInstance.onstart = () => {
                setIsListening(true);
            };

            recognitionInstance.onend = () => {
                setIsListening(false);
                setAutoSubmitOnStop(false);

                if (autoSubmitOnStopRef.current) {
                    autoSubmitOnStopRef.current = false;
                    setTimeout(() => {
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

                let errorMessage = "❌ Ses Tanıma Hatası\n\n";

                if (event.error === 'not-allowed') {
                    errorMessage += "Mikrofona erişim verilemedi. Lütfen:\n";
                    errorMessage += "1. Tarayıcı ayarlarından mikrofon iznini kontrol edin\n";
                    errorMessage += "2. Sayfayı yenileyin ve tekrar deneyin";
                } else if (event.error === 'no-speech') {
                    errorMessage += "Ses algılanamadı. Lütfen:\n";
                    errorMessage += "1. Mikrofonunuza yakın konuşun\n";
                    errorMessage += "2. Çevresel gürültüyü azaltın";
                } else if (event.error === 'audio-capture') {
                    errorMessage += "Ses yakalama hatası. Lütfen:\n";
                    errorMessage += "1. Mikrofonunuzun çalıştığını kontrol edin\n";
                    errorMessage += "2. Başka uygulamaların mikrofonu kullanmadığından emin olun";
                } else {
                    errorMessage += `Hata kodu: ${event.error}\nLütfen sayfayı yenileyin ve tekrar deneyin.`;
                }

                alert(errorMessage);
            };
            setRecognition(recognitionInstance);

            return () => {
                if (recognitionInstance) {
                    try {
                        recognitionInstance.stop();
                    } catch (error) {
                        console.error('Error stopping recognition during cleanup:', error);
                    }
                }
            };
        }
    }, []);

    const startRecognition = async () => {
        if (recognition && !isListening) {
            const hasPermission = await checkMicrophonePermission();
            if (!hasPermission) {
                return;
            }

            try {
                if (sendAnimationTimeoutRef.current) {
                    clearTimeout(sendAnimationTimeoutRef.current);
                    sendAnimationTimeoutRef.current = null;
                }

                setIsSendingTranscript(false);
                setInterimResult("");
                setFinalResult("");
                finalResultRef.current = "";
                setDisplayedAiResponse('');
                setPendingAiResponse(null);
                setIsTypewriting(false);
                setAudioLevel(0);
                setAutoSubmitOnStop(false);
                autoSubmitOnStopRef.current = false;

                if (isListening) {
                    recognition.stop();
                }

                setTimeout(() => {
                    recognition.start();
                }, 100);

            } catch (error) {
                console.error('Error starting recognition:', error);
                setIsListening(false);
                alert('❌ Ses tanıma başlatılamadı. Lütfen sayfayı yenileyin ve tekrar deneyin.');
            }
        }
    };

    const stopRecognition = ({ autoSubmit = false } = {}) => {
        if (autoSubmit) {
            setAutoSubmitOnStop(true);
            autoSubmitOnStopRef.current = true;
        }

        if (recognition && isListening) {
            try {
                recognition.stop();
                setAudioLevel(0);

                playSound('stop');

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
        if (tutorialActive) {
            return;
        }

        setShowInstructions(false);

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

    const handleSubmit = async ({ trigger = 'manual' } = {}) => {
        const transcript = finalResultRef.current.trim();
        if (!transcript || !assistantId || !user?.id || !courseId) {
            if (isSendingTranscript) {
                setIsSendingTranscript(false);
            }

            if (!transcript && trigger === 'manual') {
                alert('⚠️ Lütfen bir şeyler söyleyin!\n\nÖnce Başla butonuna basarak konuşmanızı kaydedin, ardından aynı butona tekrar basarak kaydı bitirin.');
            }

            setIsTyping(false);
            setIsTypewriting(false);
            setPendingAiResponse(null);
            return;
        }

        setAiResponse('');
        setDisplayedAiResponse('');
        setPendingAiResponse(null);
        setIsTypewriting(false);
        setIsLoading(true);
        setIsTyping(true);

        try {
            const processResponse = await fetch('/api/simulations/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: transcript,
                    assistant_id: assistantId,
                    thread_id: threadId
                })
            });

            const data = await processResponse.json();

            if (data.response) {
                setAiResponse(data.response);
                setPendingAiResponse(data.response);
                setDisplayedAiResponse('');
                setIsTypewriting(false);

                setInterimResult('');
                finalResultRef.current = '';
                setFinalResult('');
                clearTranscriptWithAnimation();
                if (params?.simulasyon_name) {
                    fetchRandomImage(params.simulasyon_name);
                }
            } else {
                setIsSendingTranscript(false);
                setIsTyping(false);
                setIsTypewriting(false);
                setPendingAiResponse(null);
            }
        } catch (error) {
            console.error('Submit error:', error);
            setIsSendingTranscript(false);
            setIsTyping(false);
            setIsTypewriting(false);
            setPendingAiResponse(null);
            alert('İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.');
        } finally {
            setIsLoading(false);
        }
    };

    handleSubmitRef.current = handleSubmit;

    // Tutorial Navigation Functions
    const nextStep = () => {
        if (params?.simulasyon_name) {
            fetchRandomImage(params.simulasyon_name);
        }

        if (currentStep < tutorialSteps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            completeTutorial();
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const completeTutorial = () => {
        setTutorialActive(false);
        setTutorialCompleted(true);
        setShowInstructions(false);
        setInterimResult('');
        setFinalResult('');
        finalResultRef.current = '';
    };

    // Enhanced Microphone Icon Component
    const MicrophoneIcon = ({ isRecording, audioLevel }) => {
        const waveScale = isRecording ? 1 + (audioLevel * 0.3) : 1;

        return (
            <div className="relative flex items-center justify-center">
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

    // Typing indicator component
    const TypingIndicator = () => (
        <div className="flex items-center space-x-1 bg-white/80 rounded-full px-3 py-2 shadow-md">
            <span className="text-red-600 text-xs font-medium mr-2">AI yazıyor</span>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
    );

    // Tutorial Overlay Component
    const TutorialOverlay = () => {
        if (!tutorialActive) return null;

        const step = tutorialSteps[currentStep];
        const isPractice = step.id === 'practice';
        const isYardim = step.id === 'yardim';

        return (
            <div className="fixed inset-0 z-[12000] pointer-events-none">
                <div
                    className="pointer-events-auto"
                    style={{
                        position: 'absolute',
                        ...overlayStyle,
                        maxWidth: 'calc(100vw - 2rem)'
                    }}
                >
                    <div className="w-full">
                        <div className="bg-white rounded-lg shadow-2xl p-4 border-4 border-red-500">
                            {step.showImage && step.imagePath && (
                                <div className="mb-3 flex justify-center">
                                    <Image
                                        src={step.imagePath}
                                        alt="Mikrofon İzni"
                                        width={150}
                                        height={100}
                                        className="rounded-lg shadow-md object-contain"
                                    />
                                </div>
                            )}

                            <div className="mb-3">
                                <h3 className="text-lg font-bold text-gray-800 mb-2">
                                    {step.title}
                                </h3>
                                <p className="text-gray-600 leading-relaxed text-sm">
                                    {step.description}
                                </p>
                            </div>

                            <div className="mb-3">
                                <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                                    <span>Adım {currentStep + 1} / {tutorialSteps.length}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1">
                                    <div
                                        className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                                        style={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between">
                                <button
                                    className={`px-3 py-1 rounded transition-colors text-sm ${
                                        currentStep === 0
                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            : 'bg-gray-500 text-white hover:bg-gray-600'
                                    }`}
                                    onClick={prevStep}
                                    disabled={currentStep === 0}
                                >
                                    Geri
                                </button>
                                <button
                                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                                    onClick={nextStep}
                                >
                                    {isYardim ? 'Başla!' : (isPractice ? 'Devam' : 'İleri')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {step.target && (
                    <style jsx global>{`
                        [data-tutorial-id="${step.target}"] {
                            position: relative;
                            z-index: 9999 !important;
                        }

                        [data-tutorial-id="${step.target}"]:before {
                            content: '';
                            position: absolute;
                            top: -12px;
                            left: -12px;
                            right: -12px;
                            bottom: -12px;
                            border: 4px solid #ff0000;
                            border-radius: 12px;
                            animation: tutorialPulse1 1.2s infinite;
                            z-index: 9998;
                            box-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
                        }

                        [data-tutorial-id="${step.target}"]:after {
                            content: '';
                            position: absolute;
                            top: -20px;
                            left: -20px;
                            right: -20px;
                            bottom: -20px;
                            border: 3px solid #dc2626;
                            border-radius: 16px;
                            animation: tutorialPulse2 1.2s infinite;
                            z-index: 9997;
                            box-shadow: 0 0 8px rgba(220, 38, 38, 0.4);
                        }

                        @keyframes tutorialPulse1 {
                            0% {
                                opacity: 1;
                                transform: scale(1);
                            }
                            50% {
                                opacity: 0.7;
                                transform: scale(1.03);
                            }
                            100% {
                                opacity: 1;
                                transform: scale(1);
                            }
                        }

                        @keyframes tutorialPulse2 {
                            0% {
                                opacity: 0.8;
                                transform: scale(1);
                            }
                            50% {
                                opacity: 0.4;
                                transform: scale(1.06);
                            }
                            100% {
                                opacity: 0.8;
                                transform: scale(1);
                            }
                        }

                        [data-tutorial-id="${step.target}"] {
                            pointer-events: none !important;
                        }
                    `}</style>
                )}
            </div>
        );
    };

    return (
        <div
            className="w-screen flex flex-col md:flex-row min-h-screen overflow-hidden"
            style={{
                backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : 'none',
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundColor: backgroundImageUrl ? 'transparent' : '#f0f0f0',
                minHeight: 'calc(var(--vh, 1vh) * 100)',
                height: 'auto',
                WebkitOverflowScrolling: 'touch'
            }}
        >
            <div className="min-h-screen bg-white relative w-full md:w-auto">
                <TopNav />
            </div>

            <TutorialOverlay />

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
                <div className="image-container w-full h-full flex items-center justify-center">
                    {imageUrl && (
                        <Image
                            src={imageUrl}
                            alt="Simülasyon"
                            className="w-auto max-w-full h-full object-contain"
                            width={600}
                            height={900}
                            priority
                            style={{ maxHeight: '100%', width: 'auto' }}
                        />
                    )}
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
                    <div
                        className="relative bg-white/90 border border-gray-200 rounded-lg shadow-sm p-4 flex-shrink-0"
                        data-tutorial-id="listening-area"
                    >
                        <label className="block text-gray-700 font-semibold mb-2">Sizi dinliyorum</label>
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
                        {(isTyping || isTypewriting) && (
                            <div className="absolute bottom-6 right-6">
                                <TypingIndicator />
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col flex-1 space-y-6 min-h-0">
                        {tutorialCompleted && (
                            <div className="flex justify-center items-center p-4 mt-6">
                                <p className="text-green-600 font-semibold">Her şey hazır! Başla butonuna basarak deneme yapabilirsiniz.</p>
                            </div>
                        )}
                       
                            </div>

                            <div
                                className="field bg-white/90 border border-gray-200 rounded-lg shadow-sm p-4 w-full mt-4"
                                data-tutorial-id="transcript-area"
                            >
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
                                            minHeight: '10rem',
                                            maxHeight: '40vh',
                                            overflowY: 'auto'
                                        }}
                                    />
                                </div>
                    
                        
                                         <div className="flex-1 flex flex-col justify-end space-y-6 w-full min-h-0">
                            <div className="flex justify-start">
                                <button
                                    className={`flex items-center gap-2 px-4 py-2 rounded font-medium transition-all duration-200 shadow-md overflow-visible relative ${
                                        (isListening || autoSubmitOnStop)
                                            ? 'bg-red-500 hover:bg-red-600 text-white'
                                            : 'bg-white hover:bg-gray-50 text-red-500 border-2 border-red-500'
                                    }`}
                                    onClick={handlePrimaryButtonClick}
                                    disabled={isLoading || autoSubmitOnStop || tutorialActive}
                                    data-tutorial-id="mic-button"
                                    style={{
                                        position: 'relative',
                                        minWidth: '98px',
                                        minHeight: '42px',
                                        opacity: tutorialActive ? 0.85 : 1,
                                        pointerEvents: tutorialActive ? 'none' : 'auto'
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
    );
}
