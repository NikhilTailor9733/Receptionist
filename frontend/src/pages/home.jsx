// home.jsx — FIXED v3
// BUG FIX: check poll mein HR reply aane pe isWaitingRef immediately false,
// aur speak() ke baad mic properly restart hoti hai

import { useEffect, useRef, useState, useCallback } from "react";
import Avatar from "../components/Avatar";

function getFemaleVoice() {
  const voices = window.speechSynthesis.getVoices();
  const preferred = [
    "Google हिन्दी", "Google Hindi", "Lekha", "Veena",
    "Google UK English Female", "Microsoft Heera", "Microsoft Zira",
    "Samantha", "Victoria",
  ];
  for (const name of preferred) {
    const v = voices.find(v => v.name.includes(name));
    if (v) return v;
  }
  const langVoices = voices.filter(v =>
    (v.lang.startsWith("en-IN") || v.lang.startsWith("hi-IN")) && v.name !== ""
  );
  if (langVoices.length) return langVoices[0];
  return voices.find(v => v.lang.startsWith("en-IN") || v.lang.startsWith("hi")) || null;
}

export default function Home() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [statusText, setStatusText] = useState("Scanning for visitor...");
  const [sessionActive, setSessionActive] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [personName, setPersonName] = useState("");
  const [voiceReady, setVoiceReady] = useState(false);

  const videoRef = useRef(null);
  const recognitionRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const sessionActiveRef = useRef(false);
  const isThinkingRef = useRef(false);
  const isWaitingRef = useRef(false);
  const speechQueue = useRef([]);
  const isTTSBusy = useRef(false);
  const femaleVoiceRef = useRef(null);
  const currentModeRef = useRef(null);
  const currentPersonRef = useRef(null);
  const lastFaceTimeRef = useRef(0);
  const noFaceCountRef = useRef(0);
  const sessionStartingRef = useRef(false);

  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { sessionActiveRef.current = sessionActive; }, [sessionActive]);

  // isWaiting sync — stop mic when waiting starts
  useEffect(() => {
    isWaitingRef.current = isWaiting;
    if (isWaiting) {
      try { recognitionRef.current?.stop(); } catch { }
      setListening(false);
      setStatusText("⏳ Waiting for response...");
    }
  }, [isWaiting]);

  // Load female voice
  useEffect(() => {
    const load = () => {
      const v = getFemaleVoice();
      if (v) { femaleVoiceRef.current = v; setVoiceReady(true); console.log("🎙️ Voice:", v.name); }
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  // ── TTS ──
  const processQueue = useCallback(() => {
    if (isTTSBusy.current || speechQueue.current.length === 0) return;
    const text = speechQueue.current.shift();
    if (!text) return;

    isTTSBusy.current = true;
    isSpeakingRef.current = true;
    setIsSpeaking(true);
    try { recognitionRef.current?.stop(); } catch { }
    // Start wake word listener
    setTimeout(() => {
      if (isSpeakingRef.current && !wakeActiveRef.current) {
        wakeActiveRef.current = true;
        try { wakeRecRef.current?.start(); } catch { }
      }
    }, 500);

    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = "en-IN";
    utt.rate = 0.93;
    utt.pitch = 1.1;
    if (femaleVoiceRef.current) utt.voice = femaleVoiceRef.current;

    utt.onend = () => {
      isTTSBusy.current = false;
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      // Stop wake word listener — AI done speaking
      wakeActiveRef.current = false;
      try { wakeRecRef.current?.abort(); } catch { }
      if (isWaitingRef.current) {
        setStatusText("⏳ Waiting for response...");
      } else if (sessionActiveRef.current && !isThinkingRef.current) {
        setStatusText("Listening...");
        setTimeout(() => { try { recognitionRef.current?.start(); } catch { } }, 400);
      } else {
        setStatusText("Scanning for visitor...");
      }
      setTimeout(processQueue, 150);
    };
    utt.onerror = () => {
      isTTSBusy.current = false;
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      setTimeout(processQueue, 150);
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utt);


  }, []);

  const speak = useCallback((text) => {
    if (!text) return;
    console.log("🔊 Speaking:", text);
    speechQueue.current.push(text);
    processQueue();
  }, [processQueue]);

  // ── Speech Recognition ──
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { console.warn("❌ No SpeechRecognition"); return; }

    const rec = new SR();
    rec.continuous = false;
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => { setListening(true); setStatusText("Listening..."); };

    rec.onend = () => {
      setListening(false);
      if (isWaitingRef.current) return;
      if (sessionActiveRef.current && !isSpeakingRef.current && !isThinkingRef.current) {
        setTimeout(() => { try { rec.start(); } catch { } }, 400);
      }
    };

    rec.onerror = (e) => {
      setListening(false);
      if (["no-speech", "aborted"].includes(e.error)) {
        if (isWaitingRef.current) return;
        if (sessionActiveRef.current && !isSpeakingRef.current && !isThinkingRef.current) {
          setTimeout(() => { try { rec.start(); } catch { } }, 600);
        }
      }
    };

    rec.onresult = (e) => {
      if (!sessionActiveRef.current) return;
      if (isWaitingRef.current) return;
      const text = e.results[e.results.length - 1][0].transcript.trim();
      if (text) { console.log("👤 Said:", text); handleUserSpeech(text); }
    };

    recognitionRef.current = rec;
    return () => { try { rec.abort(); } catch { } };
  }, []); // eslint-disable-line

  // ── Wake Word Recognizer ──
  // Runs in short bursts ONLY while AI is speaking
  // Detects "Oxymora" → stops AI → hands to main mic
  const wakeRecRef = useRef(null);
  const wakeActiveRef = useRef(false);

  const stopAIForWake = useCallback(() => {
    console.log("🎯 Wake word! AI stopping.");
    window.speechSynthesis.cancel();
    speechQueue.current = [];
    isTTSBusy.current = false;
    isSpeakingRef.current = false;
    setIsSpeaking(false);
    wakeActiveRef.current = false;
    try { wakeRecRef.current?.abort(); } catch { }
    setStatusText("Listening...");
    setTimeout(() => { try { recognitionRef.current?.start(); } catch { } }, 300);
  }, []); // eslint-disable-line

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const WAKE = ["oxymora", "oxymoron", "aksimora", "oxy mora", "oxymara", "oksmora", "oximora"];

    const rec = new SR();
    rec.continuous = false;
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.maxAlternatives = 3;  // more alternatives = better chance of catching wake word

    rec.onresult = (e) => {
      // Check all alternatives for wake word
      const results = e.results[e.results.length - 1];
      for (let i = 0; i < results.length; i++) {
        const t = results[i].transcript.toLowerCase();
        if (WAKE.some(w => t.includes(w))) {
          stopAIForWake();
          return;
        }
      }
    };

    rec.onend = () => {
      // Restart only if AI is still speaking
      if (isSpeakingRef.current && sessionActiveRef.current && wakeActiveRef.current) {
        setTimeout(() => {
          if (isSpeakingRef.current && wakeActiveRef.current) {
            try { rec.start(); } catch { }
          }
        }, 100);
      } else {
        wakeActiveRef.current = false;
      }
    };

    rec.onerror = (e) => {
      if (e.error === "aborted") return;
      if (isSpeakingRef.current && sessionActiveRef.current && wakeActiveRef.current) {
        setTimeout(() => {
          if (isSpeakingRef.current && wakeActiveRef.current) {
            try { rec.start(); } catch { }
          }
        }, 200);
      }
    };

    wakeRecRef.current = rec;
    return () => { try { rec.abort(); } catch { } };
  }, [stopAIForWake]);

  // ── Camera ──
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } })
      .then(s => { if (videoRef.current) videoRef.current.srcObject = s; })
      .catch(e => console.error("📷", e));
  }, []);



  // ── API ──
  const sendToAI = useCallback(async (message) => {
    try {
      const res = await fetch("https://receptionist-production-3513.up.railway.app/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });
      return await res.json();
    } catch { return { reply: null }; }
  }, []);

  // ── Handle Speech ──
  const handleUserSpeech = useCallback(async (text) => {
    if (isWaitingRef.current) return;
    isThinkingRef.current = true;
    setStatusText("Thinking...");
    try { recognitionRef.current?.stop(); } catch { }

    const data = await sendToAI(text);
    isThinkingRef.current = false;

    if (data.reply) {
      // String-based detection to set waiting
      const lower = data.reply.toLowerCase();
      if (
        lower.includes("notified") ||
        lower.includes("inform kar diya") ||
        lower.includes("baith jaiye") ||
        lower.includes("have a seat") ||
        lower.includes("please wait") ||
        lower.includes("seat")
      ) {
        isWaitingRef.current = true;   // immediately set ref
        setIsWaiting(true);
      }
      speak(data.reply);
    }
  }, [sendToAI, speak]);

  // ── Clear session ──
  const clearSessionState = useCallback(() => {
    setSessionActive(false);
    sessionActiveRef.current = false;
    sessionStartingRef.current = false;
    isThinkingRef.current = false;
    isTTSBusy.current = false;
    isSpeakingRef.current = false;
    noFaceCountRef.current = 0;
    setIsSpeaking(false);
    setListening(false);
    setPersonName("");
    isWaitingRef.current = false;
    setIsWaiting(false);
    speechQueue.current = [];
    window.speechSynthesis.cancel();
    try { recognitionRef.current?.stop(); } catch { }
    setStatusText("Scanning for visitor...");
  }, []);

  // ── Guest session ──
  const startGuestSession = useCallback(async () => {
    if (sessionActiveRef.current || sessionStartingRef.current) return;
    sessionStartingRef.current = true;
    console.log("🟢 Guest session starting");
    currentModeRef.current = "guest";
    currentPersonRef.current = null;
    setSessionActive(true);
    sessionActiveRef.current = true;
    isWaitingRef.current = false;
    setIsWaiting(false);
    const data = await sendToAI("start");
    sessionStartingRef.current = false;
    if (data.reply) speak(data.reply);
  }, [sendToAI, speak]);

  // ── Employee session ──
  const startEmployeeSession = useCallback(async (empName) => {
    if (sessionStartingRef.current) return;
    sessionStartingRef.current = true;
    console.log("👔 Employee session:", empName);
    currentModeRef.current = "employee";
    currentPersonRef.current = empName;
    setPersonName(empName);
    setSessionActive(true);
    sessionActiveRef.current = true;
    isWaitingRef.current = false;
    setIsWaiting(false);
    setStatusText(`Welcome, ${empName}`);
    await sendToAI(`employee_login:${empName}`);
    sessionStartingRef.current = false;
    speak(`Welcome back ${empName}! How can I help you?`);
  }, [sendToAI, speak]);

  // ── End session ──
  const endSession = useCallback(async (reason = "") => {
    if (!sessionActiveRef.current) return;
    console.log("🔴 Session ending:", reason);
    const wasMode = currentModeRef.current;
    currentModeRef.current = null;
    currentPersonRef.current = null;
    clearSessionState();
    if (wasMode === "guest") await sendToAI("visitor_left");
  }, [sendToAI, clearSessionState]);

  // ── HR Poll — FIXED ──
  // Problem: setIsWaiting(false) is async (React state), but speak() uses
  // processQueue which checks isWaitingRef in utt.onend.
  // Fix: set isWaitingRef.current = false BEFORE speak() so utt.onend
  // correctly restarts mic after HR reply is spoken.
  useEffect(() => {
    const id = setInterval(async () => {
      if (!sessionActiveRef.current || currentModeRef.current === "employee") return;
      try {
        const data = await sendToAI("check");
        if (data.reply) {
          console.log("✅ HR replied:", data.reply);
          // ⚡ CRITICAL: set ref first, then state, then speak
          isWaitingRef.current = false;
          setIsWaiting(false);
          setStatusText("Listening...");
          speak(data.reply);
          // mic will restart in utt.onend because isWaitingRef is now false
        }
      } catch { }
    }, 2000);  // 2s instead of 3s for faster response
    return () => clearInterval(id);
  }, [sendToAI, speak]);

  // ── Face scan ──
  const scanFace = useCallback(async () => {
    if (!videoRef.current) return;
    if (isSpeakingRef.current) return;
    if (isThinkingRef.current) return;
    if (sessionStartingRef.current) return;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 640; canvas.height = 480;
      canvas.getContext("2d").drawImage(videoRef.current, 0, 0, 640, 480);
      const blob = await new Promise(r => canvas.toBlob(r, "image/jpeg", 0.9));
      const form = new FormData();
      form.append("image", blob);

      const res = await fetch(
        "https://receptionist-production-3513.up.railway.app/recognize",
        {
          method: "POST",
          body: form,
          headers: {
            Accept: "application/json"
          }
        }
      );
      const data = await res.json();
      const now = Date.now();
      console.log("📸 Scan:", data.status, data.name || "");

      if (data.status === "employee") {
        lastFaceTimeRef.current = now;
        noFaceCountRef.current = 0;
        if (currentPersonRef.current === data.name) return;
        if (sessionActiveRef.current) await endSession("new person");
        await startEmployeeSession(data.name);
        return;
      }
      if (data.status === "unknown") {
        lastFaceTimeRef.current = now;
        noFaceCountRef.current = 0;
        if (currentModeRef.current === "employee") {
          await endSession("employee left");
          await startGuestSession();
          return;
        }
        if (!sessionActiveRef.current) await startGuestSession();
        return;
      }
      if (data.status === "no_face") {
        noFaceCountRef.current += 1;
        const gap = now - lastFaceTimeRef.current;
        if (sessionActiveRef.current && noFaceCountRef.current >= 4 && gap > 20000) {
          await endSession("no face 20s");
        }
      }
    } catch (err) { console.error("📷 Scan error:", err); }
  }, [startGuestSession, startEmployeeSession, endSession]);

  useEffect(() => {
    const id = setInterval(scanFace, 5000);
    return () => clearInterval(id);
  }, [scanFace]);

  // ── Manual button ──
  const handleManualClick = async () => {
    if (sessionActiveRef.current) {
      await endSession("manual");
    } else {
      await startGuestSession();
      setTimeout(() => { try { recognitionRef.current?.start(); } catch { } }, 600);
    }
  };

  return (
    <div className="relative w-screen h-screen bg-gray-900 overflow-hidden">

      <video
        ref={videoRef} autoPlay muted playsInline
        className="absolute top-4 left-4 w-36 h-28 rounded-xl border-2 border-blue-500 object-cover z-10"
      />

      <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-black/60 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-full">
        <span className={`w-2 h-2 rounded-full animate-pulse ${isWaiting ? "bg-orange-400" : sessionActive ? "bg-green-400" : "bg-yellow-400"
          }`} />
        {statusText}{personName ? ` — ${personName}` : ""}
      </div>

      {voiceReady && (
        <div className="absolute top-16 right-4 z-10 text-xs text-green-400/60 px-3 py-1">
          🎙️ {femaleVoiceRef.current?.name || "Voice ready"}
        </div>
      )}

      <div className="flex items-center justify-center w-full h-full">
        <Avatar isSpeaking={isSpeaking} />
      </div>

      <button
        onClick={handleManualClick}
        className={`
          absolute bottom-10 left-1/2 -translate-x-1/2
          px-8 py-4 rounded-full shadow-xl font-semibold text-white text-lg
          transition-all duration-200 select-none
          ${sessionActive
            ? isWaiting
              ? "bg-orange-500 hover:bg-orange-600"
              : "bg-red-500 hover:bg-red-600"
            : "bg-blue-500 hover:bg-blue-600"
          }
        `}
      >
        {sessionActive
          ? isWaiting
            ? "⏳ Waiting for approval..."
            : listening
              ? "🎤 Listening..."
              : isSpeaking
                ? "🔊 Speaking..."
                : "🔴 End Session"
          : "🎤 Start Talking"
        }
      </button>
    </div>
  );
}
