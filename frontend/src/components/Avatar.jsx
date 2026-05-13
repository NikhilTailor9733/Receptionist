import { useEffect, useState, useRef } from "react";

export default function Avatar({ isSpeaking }) {
  const [mouthOpen, setMouthOpen] = useState(false);
  const [particles, setParticles] = useState([]);
  const [blink, setBlink] = useState(false);
  const [waveHeights, setWaveHeights] = useState([2, 2, 2, 2, 2, 2, 2, 2]);

  // Mouth animation
  useEffect(() => {
    let interval;
    if (isSpeaking) {
      interval = setInterval(() => {
        setMouthOpen((prev) => !prev);
        setWaveHeights(Array.from({ length: 8 }, () => Math.random() * 18 + 4));
      }, 200);
    } else {
      setMouthOpen(false);
      setWaveHeights([2, 2, 2, 2, 2, 2, 2, 2]);
    }
    return () => clearInterval(interval);
  }, [isSpeaking]);

  // Random blink
  useEffect(() => {
    const blinkLoop = () => {
      const delay = Math.random() * 3000 + 2000;
      setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 150);
        blinkLoop();
      }, delay);
    };
    blinkLoop();
  }, []);

  // Floating particles init
  useEffect(() => {
    const pts = Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: Math.random() * 320 - 160,
      y: Math.random() * 320 - 160,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 4 + 3,
      delay: Math.random() * 4,
      opacity: Math.random() * 0.5 + 0.2,
    }));
    setParticles(pts);
  }, []);

  return (
    <div className="flex items-center justify-center h-screen ">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');

        @keyframes floatUp {
          0% { transform: translateY(0px) translateX(0px); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 0.6; }
          100% { transform: translateY(-120px) translateX(20px); opacity: 0; }
        }
        @keyframes rotateSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes rotateSlowReverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes visorScan {
          0% { top: 0%; }
          100% { top: 100%; }
        }
        @keyframes flicker {
          0%, 95%, 100% { opacity: 1; }
          96% { opacity: 0.4; }
          97% { opacity: 1; }
          98% { opacity: 0.2; }
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.018); }
        }
        @keyframes waveBar {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
        @keyframes hexRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes dash {
          to { stroke-dashoffset: 0; }
        }
        .font-mono-tech { font-family: 'Share Tech Mono', monospace; }
        .animate-breathe { animation: breathe 4s ease-in-out infinite; }
        .animate-flicker { animation: flicker 5s ease-in-out infinite; }
        .ring-outer { animation: rotateSlow 12s linear infinite; }
        .ring-inner { animation: rotateSlowReverse 8s linear infinite; }
      `}</style>

      <div className="relative flex flex-col items-center" style={{ fontFamily: "'Share Tech Mono', monospace" }}>

        {/* Floating particles */}
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full bg-cyan-400 pointer-events-none"
            style={{
              width: p.size,
              height: p.size,
              left: `calc(50% + ${p.x}px)`,
              top: `calc(50% + ${p.y}px)`,
              opacity: p.opacity,
              animation: `floatUp ${p.duration}s ${p.delay}s ease-in-out infinite`,
              boxShadow: "0 0 6px rgba(6,182,212,0.9)",
            }}
          />
        ))}

        {/* Outer rotating hex ring */}
        <div className="absolute" style={{ width: 340, height: 340 }}>
          <svg width="340" height="340" viewBox="0 0 340 340" className="ring-outer" style={{ opacity: 0.25 }}>
            <polygon
              points="170,10 320,92.5 320,247.5 170,330 20,247.5 20,92.5"
              fill="none" stroke="#22d3ee" strokeWidth="1"
              strokeDasharray="6 4"
            />
          </svg>
        </div>

        {/* Inner rotating ring */}
        <div className="absolute" style={{ width: 290, height: 290 }}>
          <svg width="290" height="290" viewBox="0 0 290 290" className="ring-inner" style={{ opacity: 0.2 }}>
            <polygon
              points="145,8 272,77.5 272,212.5 145,282 18,212.5 18,77.5"
              fill="none" stroke="#818cf8" strokeWidth="1"
              strokeDasharray="3 8"
            />
          </svg>
        </div>

        {/* Main face */}
        <div
          className="animate-breathe animate-flicker relative"
          style={{
            width: 220, height: 220,
            borderRadius: "30% 30% 35% 35%",
            background: "linear-gradient(160deg, #0f172a 60%, #0e2233 100%)",
            border: "1.5px solid rgba(6,182,212,0.5)",
            boxShadow: isSpeaking
              ? "0 0 30px rgba(6,182,212,0.6), 0 0 80px rgba(6,182,212,0.2), inset 0 0 30px rgba(6,182,212,0.05)"
              : "0 0 20px rgba(6,182,212,0.3), 0 0 50px rgba(6,182,212,0.1), inset 0 0 20px rgba(6,182,212,0.03)",
            transition: "box-shadow 0.3s ease",
          }}
        >
          {/* Circuit lines on face */}
          <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 220 220">
            <line x1="20" y1="60" x2="60" y2="60" stroke="#22d3ee" strokeWidth="0.8"/>
            <line x1="60" y1="60" x2="60" y2="40" stroke="#22d3ee" strokeWidth="0.8"/>
            <circle cx="60" cy="40" r="2" fill="#22d3ee"/>
            <line x1="160" y1="60" x2="200" y2="60" stroke="#22d3ee" strokeWidth="0.8"/>
            <line x1="160" y1="60" x2="160" y2="40" stroke="#22d3ee" strokeWidth="0.8"/>
            <circle cx="160" cy="40" r="2" fill="#22d3ee"/>
            <line x1="20" y1="150" x2="55" y2="150" stroke="#818cf8" strokeWidth="0.8"/>
            <line x1="55" y1="150" x2="55" y2="170" stroke="#818cf8" strokeWidth="0.8"/>
            <circle cx="55" cy="170" r="2" fill="#818cf8"/>
            <line x1="165" y1="150" x2="200" y2="150" stroke="#818cf8" strokeWidth="0.8"/>
            <line x1="165" y1="150" x2="165" y2="170" stroke="#818cf8" strokeWidth="0.8"/>
            <circle cx="165" cy="170" r="2" fill="#818cf8"/>
            <line x1="90" y1="15" x2="130" y2="15" stroke="#22d3ee" strokeWidth="0.6" strokeDasharray="3 2"/>
            <line x1="110" y1="200" x2="110" y2="215" stroke="#22d3ee" strokeWidth="0.6"/>
          </svg>

          {/* Forehead strip */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 flex gap-1.5">
            {[1,1,1,1,1].map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: "#22d3ee",
                  opacity: isSpeaking ? 0.9 : 0.4,
                  boxShadow: "0 0 5px rgba(6,182,212,0.8)",
                  animation: isSpeaking ? `pulseGlow ${0.2 + i * 0.1}s ease-in-out infinite alternate` : "none",
                }}
              />
            ))}
          </div>

          {/* VISOR EYES */}
          <div className="absolute flex gap-6" style={{ top: "34%", left: "50%", transform: "translate(-50%, -50%)" }}>
            {/* Left eye visor */}
            <div
              className="relative overflow-hidden"
              style={{
                width: 60, height: blink ? 2 : 22,
                borderRadius: 4,
                background: "linear-gradient(90deg, #0ea5e9, #22d3ee, #0ea5e9)",
                boxShadow: "0 0 14px rgba(6,182,212,0.9), 0 0 30px rgba(6,182,212,0.4)",
                transition: "height 0.08s ease",
              }}
            >
              {/* Scan line */}
              {!blink && (
                <div className="absolute w-full h-0.5 bg-white/40"
                  style={{ animation: "visorScan 1.5s linear infinite" }} />
              )}
            </div>
            {/* Right eye visor */}
            <div
              className="relative overflow-hidden"
              style={{
                width: 60, height: blink ? 2 : 22,
                borderRadius: 4,
                background: "linear-gradient(90deg, #0ea5e9, #22d3ee, #0ea5e9)",
                boxShadow: "0 0 14px rgba(6,182,212,0.9), 0 0 30px rgba(6,182,212,0.4)",
                transition: "height 0.08s ease",
              }}
            >
              {!blink && (
                <div className="absolute w-full h-0.5 bg-white/40"
                  style={{ animation: "visorScan 1.8s linear infinite" }} />
              )}
            </div>
          </div>

          {/* Nose bridge — thin line */}
          <div className="absolute left-1/2 -translate-x-1/2"
            style={{ top: "52%", width: 1.5, height: 16, background: "rgba(6,182,212,0.3)" }} />

          {/* MOUTH */}
          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: "68%" }}>
            {isSpeaking ? (
              /* Waveform mouth */
              <div className="flex items-center gap-0.5" style={{ height: 28 }}>
                {waveHeights.map((h, i) => (
                  <div
                    key={i}
                    className="rounded-full"
                    style={{
                      width: 4,
                      height: h,
                      background: "linear-gradient(180deg, #22d3ee, #0284c7)",
                      boxShadow: "0 0 6px rgba(6,182,212,0.9)",
                      transition: "height 0.15s ease",
                    }}
                  />
                ))}
              </div>
            ) : (
              /* Closed mouth */
              <div style={{
                width: 56,
                height: 3,
                borderRadius: 99,
                background: "linear-gradient(90deg, transparent, #22d3ee, transparent)",
                boxShadow: "0 0 8px rgba(6,182,212,0.5)",
              }} />
            )}
          </div>

          {/* Cheek accents */}
          <div className="absolute" style={{ top: "55%", left: "8%", width: 18, height: 4, borderRadius: 99, background: "rgba(6,182,212,0.25)" }} />
          <div className="absolute" style={{ top: "55%", right: "8%", width: 18, height: 4, borderRadius: 99, background: "rgba(6,182,212,0.25)" }} />
        </div>

        {/* Status bar */}
        <div className="mt-5 flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full"
              style={{
                background: isSpeaking ? "#22d3ee" : "#374151",
                boxShadow: isSpeaking ? "0 0 8px #22d3ee" : "none",
                transition: "all 0.3s",
              }}
            />
            <span className="font-mono-tech text-xs tracking-widest"
              style={{ color: isSpeaking ? "#22d3ee" : "#4b5563", textShadow: isSpeaking ? "0 0 8px rgba(6,182,212,0.8)" : "none" }}>
              {isSpeaking ? "VOICE ACTIVE" : "IDLE"}
            </span>
            <div className="w-2 h-2 rounded-full"
              style={{
                background: isSpeaking ? "#22d3ee" : "#374151",
                boxShadow: isSpeaking ? "0 0 8px #22d3ee" : "none",
                transition: "all 0.3s",
              }}
            />
          </div>

          {/* Audio level bar */}
          <div className="flex gap-0.5 items-end" style={{ height: 16 }}>
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i}
                style={{
                  width: 3,
                  height: isSpeaking ? `${Math.random() * 12 + 4}px` : "3px",
                  borderRadius: 99,
                  background: i < 7 ? "#22d3ee" : i < 14 ? "#818cf8" : "#e879f9",
                  opacity: isSpeaking ? 0.8 : 0.2,
                  transition: "height 0.15s ease, opacity 0.3s",
                  boxShadow: isSpeaking ? "0 0 4px rgba(6,182,212,0.6)" : "none",
                }}
              />
            ))}
          </div>
        </div>

        {/* Background ambient glow */}
        <div className="absolute -z-10 w-96 h-96 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)",
            animation: "pulseGlow 3s ease-in-out infinite",
          }}
        />
      </div>
    </div>
  );
}