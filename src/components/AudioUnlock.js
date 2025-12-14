"use client";

import { useRef, useState } from "react";

const SILENT_AUDIO_SRC = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";

export default function AudioUnlock({ onUnlocked }) {
    const [unlocked, setUnlocked] = useState(false);
    const audioRef = useRef(null);

    const enableAudio = async () => {
        try {
            if (audioRef.current) {
                audioRef.current.src = SILENT_AUDIO_SRC;
                audioRef.current.load();
                audioRef.current.muted = true;
                try {
                    await audioRef.current.play();
                } catch (playError) {
                    console.warn("Autoplay warmup failed:", playError);
                }
                audioRef.current.pause();
                audioRef.current.muted = false;
            }

            if (typeof window !== "undefined") {
                const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
                if (AudioContextCtor) {
                    const ctx = new AudioContextCtor();
                    if (ctx.state === "suspended") {
                        await ctx.resume();
                    }
                    // Close the temporary context to avoid exceeding context limits.
                    if (ctx.close) {
                        try {
                            await ctx.close();
                        } catch (closeError) {
                            console.warn("AudioContext close failed:", closeError);
                        }
                    }
                }
            }

            setUnlocked(true);
            if (onUnlocked) {
                onUnlocked();
            }
        } catch (error) {
            console.error("Autoplay kilidi açılamadı:", error);
        }
    };

    if (unlocked) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl p-6 text-center space-y-4 max-w-sm">
                <h2 className="text-lg font-semibold text-gray-900">Sesi Etkinleştir</h2>
                <p className="text-sm text-gray-600 leading-relaxed">
                    Tarayıcı, seslerin otomatik oynatılabilmesi için bir kez onay vermenizi istiyor.
                    Lütfen aşağıdaki butona dokunun.
                </p>
                <button
                    type="button"
                    onClick={enableAudio}
                    className="px-5 py-2.5 rounded-lg font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                    Sesi Etkinleştir
                </button>
            </div>
            <audio ref={audioRef} playsInline className="hidden" />
        </div>
    );
}
