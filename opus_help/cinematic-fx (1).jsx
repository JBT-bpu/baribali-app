import { useState, useRef, useEffect, useCallback, useMemo } from "react";

/*
  CinematicUI Visual FX System — Demo
  
  This shows ALL the ambient/border effects integrated together.
  Drop your video in the center and these effects surround it.
  
  LAYERS (back to front):
  1. Deep ambient glow blobs (CSS, very slow pulse)
  2. Canvas particle system (vegetables, bokeh, fireflies)
  3. Light leak / flare overlay (CSS gradients)
  4. Edge bloom (video edge glow bleeds outward)
  5. Video area (your video goes here)
  6. Vignette overlay (darkens corners)
*/

// ─── PARTICLE SYSTEM (Canvas-based, 60fps) ────────────────────

const PARTICLE_TYPES = {
  veggie: {
    sprites: ["🍅", "🥬", "🫑", "🥒", "🥕", "🍋", "🌿", "🫒", "🍃", "🥗"],
    sizeRange: [14, 28],
    opacityRange: [0.15, 0.45],
    speedRange: [0.08, 0.25],
    rotationSpeed: [0.1, 0.4],
    blurRange: [1, 6],
    count: 12,
  },
  bokehSmall: {
    sprites: null,
    sizeRange: [3, 10],
    opacityRange: [0.05, 0.18],
    speedRange: [0.03, 0.12],
    rotationSpeed: [0, 0],
    blurRange: [2, 8],
    count: 30,
    colors: ["rgba(76,175,80,", "rgba(139,195,74,", "rgba(200,168,78,", "rgba(255,255,255,"],
  },
  bokehMedium: {
    sprites: null,
    sizeRange: [12, 28],
    opacityRange: [0.04, 0.12],
    speedRange: [0.02, 0.08],
    rotationSpeed: [0, 0],
    blurRange: [6, 16],
    count: 18,
    colors: ["rgba(76,175,80,", "rgba(139,195,74,", "rgba(200,168,78,", "rgba(255,255,255,", "rgba(100,200,120,"],
  },
  bokehLarge: {
    sprites: null,
    sizeRange: [30, 60],
    opacityRange: [0.02, 0.06],
    speedRange: [0.01, 0.04],
    rotationSpeed: [0, 0],
    blurRange: [14, 30],
    count: 8,
    colors: ["rgba(76,175,80,", "rgba(139,195,74,", "rgba(200,168,78,"],
  },
  firefly: {
    sprites: null, // drawn as glowing dots
    sizeRange: [1.5, 3.5],
    opacityRange: [0, 0.7], // they blink
    speedRange: [0.15, 0.5],
    rotationSpeed: [0, 0],
    blurRange: [0, 2],
    count: 16,
    colors: ["rgba(180,220,100,", "rgba(220,255,150,", "rgba(255,255,200,"],
  },
};

function createParticle(type, config, canvasW, canvasH, videoRect) {
  const rand = (min, max) => Math.random() * (max - min) + min;
  
  // Position particles OUTSIDE the video area
  let x, y;
  const margin = 20;
  const side = Math.floor(Math.random() * 4);
  
  if (videoRect) {
    // Place in border zones (outside video, inside canvas)
    switch (side) {
      case 0: // top
        x = rand(0, canvasW);
        y = rand(0, videoRect.top - margin);
        break;
      case 1: // bottom
        x = rand(0, canvasW);
        y = rand(videoRect.bottom + margin, canvasH);
        break;
      case 2: // left
        x = rand(0, videoRect.left - margin);
        y = rand(0, canvasH);
        break;
      case 3: // right
        x = rand(videoRect.right + margin, canvasW);
        y = rand(0, canvasH);
        break;
    }
  } else {
    x = rand(0, canvasW);
    y = rand(0, canvasH);
  }

  return {
    type,
    x,
    y,
    originX: x,
    originY: y,
    size: rand(config.sizeRange[0], config.sizeRange[1]),
    baseOpacity: rand(config.opacityRange[0], config.opacityRange[1]),
    opacity: 0, // fade in
    speed: rand(config.speedRange[0], config.speedRange[1]),
    rotation: rand(0, Math.PI * 2),
    rotationSpeed: rand(config.rotationSpeed[0], config.rotationSpeed[1]) * (Math.random() > 0.5 ? 1 : -1),
    blur: rand(config.blurRange[0], config.blurRange[1]),
    sprite: config.sprites ? config.sprites[Math.floor(Math.random() * config.sprites.length)] : null,
    color: config.colors ? config.colors[Math.floor(Math.random() * config.colors.length)] : null,
    // Wandering
    wanderAngle: rand(0, Math.PI * 2),
    wanderSpeed: rand(0.002, 0.008),
    wanderRadius: rand(20, 80),
    // Depth (affects parallax response)
    depth: rand(0.3, 1.0),
    // Phase
    phaseOffset: rand(0, Math.PI * 2),
    // Blink (for fireflies)
    blinkSpeed: rand(0.5, 2.0),
    blinkPhase: rand(0, Math.PI * 2),
    // Lifecycle
    life: 0,
    maxLife: rand(300, 800), // frames
    fadeInFrames: 60,
    fadeOutFrames: 60,
    // Force accumulation
    fx: 0,
    fy: 0,
  };
}

// ─── MAIN COMPONENT ────────────────────────────────────────────

export default function CinematicFX() {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animFrameRef = useRef(null);
  const gyroRef = useRef({ x: 0, y: 0 });
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const phaseRef = useRef("loop"); // intro | loop | preview | outro
  const previewCardRef = useRef(null);
  const timeRef = useRef(0);
  const videoRectRef = useRef(null);

  const [phase, setPhase] = useState("loop");
  const [previewCard, setPreviewCard] = useState(null);
  const [debugMode, setDebugMode] = useState(false);

  // Simulate phase changes for demo
  const cyclePhase = useCallback(() => {
    const phases = ["intro", "loop", "preview", "outro", "loop"];
    const cards = [null, null, "build", null, null];
    const idx = phases.indexOf(phaseRef.current);
    const next = (idx + 1) % phases.length;
    phaseRef.current = phases[next];
    previewCardRef.current = cards[next];
    setPhase(phases[next]);
    setPreviewCard(cards[next]);
  }, []);

  // ─── Gyroscope ───
  useEffect(() => {
    const handleOrientation = (e) => {
      gyroRef.current = {
        x: (e.gamma || 0) / 45, // -1 to 1
        y: (e.beta || 0) / 45,
      };
    };
    window.addEventListener("deviceorientation", handleOrientation);
    return () => window.removeEventListener("deviceorientation", handleOrientation);
  }, []);

  // ─── Mouse ───
  useEffect(() => {
    const handleMouse = (e) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      };
      // Also use as gyro fallback
      gyroRef.current = mouseRef.current;
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  // ─── Keyboard ───
  useEffect(() => {
    const handle = (e) => {
      if (e.key === "d") setDebugMode((p) => !p);
      if (e.key === " ") cyclePhase();
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [cyclePhase]);

  // ─── Canvas Particle Engine ───
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Calculate video rect (9:16 contain within canvas)
      const videoAspect = 9 / 16;
      const screenAspect = canvas.width / canvas.height;
      let vw, vh, vx, vy;
      if (screenAspect > videoAspect) {
        vh = canvas.height;
        vw = vh * videoAspect;
        vx = (canvas.width - vw) / 2;
        vy = 0;
      } else {
        vw = canvas.width;
        vh = vw / videoAspect;
        vx = 0;
        vy = (canvas.height - vh) / 2;
      }
      videoRectRef.current = {
        left: vx, top: vy, right: vx + vw, bottom: vy + vh,
        width: vw, height: vh, centerX: vx + vw / 2, centerY: vy + vh / 2,
      };
    };
    resize();
    window.addEventListener("resize", resize);

    // Initialize particles
    const initParticles = () => {
      const particles = [];
      const vr = videoRectRef.current;
      Object.entries(PARTICLE_TYPES).forEach(([type, config]) => {
        for (let i = 0; i < config.count; i++) {
          particles.push(createParticle(type, config, canvas.width, canvas.height, vr));
        }
      });
      particlesRef.current = particles;
    };
    initParticles();

    // ─── Animation Loop ───
    const animate = () => {
      timeRef.current++;
      const t = timeRef.current;
      const w = canvas.width;
      const h = canvas.height;
      const vr = videoRectRef.current;
      const gyro = gyroRef.current;
      const currentPhase = phaseRef.current;
      const currentCard = previewCardRef.current;

      ctx.clearRect(0, 0, w, h);

      // --- Card approximate positions (for proximity effects) ---
      const cardPositions = {
        build: { x: vr ? vr.left + vr.width * 0.16 : w * 0.16, y: vr ? vr.top + vr.height * 0.53 : h * 0.53 },
        recommended: { x: vr ? vr.left + vr.width * 0.5 : w * 0.5, y: vr ? vr.top + vr.height * 0.53 : h * 0.53 },
        login: { x: vr ? vr.left + vr.width * 0.84 : w * 0.84, y: vr ? vr.top + vr.height * 0.53 : h * 0.53 },
      };

      // --- Update & draw each particle ---
      particlesRef.current.forEach((p) => {
        p.life++;

        // --- Lifecycle (fade in/out, respawn) ---
        if (p.life < p.fadeInFrames) {
          p.opacity = (p.life / p.fadeInFrames) * p.baseOpacity;
        } else if (p.life > p.maxLife - p.fadeOutFrames) {
          p.opacity = ((p.maxLife - p.life) / p.fadeOutFrames) * p.baseOpacity;
        } else {
          p.opacity = p.baseOpacity;
        }

        if (p.life >= p.maxLife) {
          // Respawn
          const config = PARTICLE_TYPES[p.type];
          Object.assign(p, createParticle(p.type, config, w, h, vr));
          return;
        }

        // --- Firefly blink ---
        if (p.type === "firefly") {
          const blink = Math.sin(t * 0.05 * p.blinkSpeed + p.blinkPhase);
          p.opacity *= Math.max(0, blink);
        }

        // --- Wandering movement ---
        p.wanderAngle += p.wanderSpeed;
        const wanderX = Math.cos(p.wanderAngle) * p.wanderRadius * p.speed * 0.3;
        const wanderY = Math.sin(p.wanderAngle * 0.7 + p.phaseOffset) * p.wanderRadius * p.speed * 0.3;

        // --- Parallax from gyroscope ---
        const parallaxStrength = p.depth * 25;
        const parallaxX = gyro.x * parallaxStrength;
        const parallaxY = gyro.y * parallaxStrength;

        // --- Phase-reactive forces ---
        let forceX = 0, forceY = 0;

        if (currentPhase === "intro") {
          // Drift toward video center
          if (vr) {
            const dx = vr.centerX - p.x;
            const dy = vr.centerY - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            forceX = (dx / dist) * 0.15;
            forceY = (dy / dist) * 0.15;
          }
        }

        if (currentPhase === "preview" && currentCard) {
          const card = cardPositions[currentCard];
          if (card) {
            const dx = card.x - p.x;
            const dy = card.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            // Particles near card: brighten + gentle pull
            if (dist < 200) {
              p.opacity = Math.min(p.opacity * 1.8, 0.9);
              forceX = (dx / dist) * 0.08;
              forceY = (dy / dist) * 0.08;
            } else {
              // Far particles: dim
              p.opacity *= 0.6;
            }
          }
        }

        if (currentPhase === "outro") {
          // Scatter outward from center
          if (vr) {
            const dx = p.x - vr.centerX;
            const dy = p.y - vr.centerY;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            forceX = (dx / dist) * 1.2;
            forceY = (dy / dist) * 1.2;
            p.opacity *= 0.97; // fade during scatter
          }
        }

        // --- Apply forces with damping ---
        p.fx = (p.fx + forceX) * 0.95;
        p.fy = (p.fy + forceY) * 0.95;

        // --- Update position ---
        p.x = p.originX + wanderX + parallaxX + p.fx * t * 0.1;
        p.y = p.originY + wanderY + parallaxY + p.fy * t * 0.1;
        p.rotation += p.rotationSpeed * 0.02;

        // --- Keep in bounds (soft wrap) ---
        if (p.x < -50) p.x += w + 100;
        if (p.x > w + 50) p.x -= w + 100;
        if (p.y < -50) p.y += h + 100;
        if (p.y > h + 50) p.y -= h + 100;

        // --- Skip if invisible ---
        if (p.opacity < 0.01) return;

        // --- Draw ---
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        if (p.blur > 0.5) {
          ctx.filter = `blur(${p.blur}px)`;
        }

        if (p.type === "veggie" && p.sprite) {
          ctx.font = `${p.size}px serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(p.sprite, 0, 0);
        }

        if ((p.type === "bokehSmall" || p.type === "bokehMedium" || p.type === "bokehLarge") && p.color) {
          const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
          gradient.addColorStop(0, p.color + (p.type === "bokehLarge" ? "0.4)" : "0.6)"));
          gradient.addColorStop(0.3, p.color + (p.type === "bokehLarge" ? "0.15)" : "0.25)"));
          gradient.addColorStop(0.6, p.color + "0.08)");
          gradient.addColorStop(1, p.color + "0)");
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
          // Large bokeh gets a subtle ring edge
          if (p.type === "bokehLarge" || p.type === "bokehMedium") {
            ctx.strokeStyle = p.color + "0.06)";
            ctx.lineWidth = p.type === "bokehLarge" ? 1.5 : 0.8;
            ctx.beginPath();
            ctx.arc(0, 0, p.size * 0.85, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        if (p.type === "firefly" && p.color) {
          // Glowing dot with bloom
          const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 4);
          gradient.addColorStop(0, p.color + "1)");
          gradient.addColorStop(0.2, p.color + "0.5)");
          gradient.addColorStop(1, p.color + "0)");
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 4, 0, Math.PI * 2);
          ctx.fill();
          // Hard core
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.filter = "none";
        ctx.restore();
      });

      // --- Debug overlay ---
      if (debugMode) {
        // Video rect
        if (vr) {
          ctx.strokeStyle = "rgba(255,0,0,0.3)";
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(vr.left, vr.top, vr.width, vr.height);
          ctx.setLineDash([]);
        }
        // Particle count
        ctx.fillStyle = "#0f0";
        ctx.font = "11px monospace";
        ctx.fillText(`Particles: ${particlesRef.current.length}`, 10, 20);
        ctx.fillText(`Phase: ${currentPhase}`, 10, 35);
        ctx.fillText(`Card: ${currentCard || "none"}`, 10, 50);
        ctx.fillText(`Gyro: ${gyro.x.toFixed(2)}, ${gyro.y.toFixed(2)}`, 10, 65);
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [debugMode]);

  // Sync phase to ref
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { previewCardRef.current = previewCard; }, [previewCard]);

  return (
    <div style={S.root}>
      {/* Layer 1: Deep ambient glows */}
      <div style={S.ambientLayer}>
        <div style={{
          ...S.ambientBlob,
          top: "-15%", right: "-20%", width: "70%", height: "50%",
          background: "radial-gradient(ellipse, rgba(76,175,80,0.08) 0%, transparent 70%)",
          animation: "ambientDrift 12s ease-in-out infinite",
        }} />
        <div style={{
          ...S.ambientBlob,
          bottom: "-10%", left: "-15%", width: "55%", height: "45%",
          background: "radial-gradient(ellipse, rgba(139,195,74,0.06) 0%, transparent 70%)",
          animation: "ambientDrift 16s ease-in-out infinite",
          animationDelay: "4s",
        }} />
        <div style={{
          ...S.ambientBlob,
          top: "30%", left: "50%", width: "40%", height: "35%",
          background: "radial-gradient(ellipse, rgba(200,168,78,0.04) 0%, transparent 70%)",
          animation: "ambientDrift 20s ease-in-out infinite",
          animationDelay: "8s",
        }} />
      </div>

      {/* Layer 2: Canvas particle system */}
      <canvas
        ref={canvasRef}
        style={S.particleCanvas}
      />

      {/* Layer 3: Light leaks / flares */}
      <div style={S.lightLeakLayer}>
        <div style={{
          ...S.lightLeak,
          top: 0, left: "10%", width: "30%", height: "40%",
          background: "linear-gradient(180deg, rgba(180,220,100,0.03) 0%, transparent 100%)",
          animation: "leakShift 8s ease-in-out infinite",
        }} />
        <div style={{
          ...S.lightLeak,
          bottom: 0, right: "15%", width: "25%", height: "35%",
          background: "linear-gradient(0deg, rgba(200,168,78,0.025) 0%, transparent 100%)",
          animation: "leakShift 10s ease-in-out infinite",
          animationDelay: "3s",
        }} />
      </div>

      {/* Layer 4: Edge bloom (video edge glow) */}
      <div style={S.edgeBloom}>
        <div style={S.bloomTop} />
        <div style={S.bloomBottom} />
        <div style={S.bloomLeft} />
        <div style={S.bloomRight} />
      </div>

      {/* Layer 5: Video placeholder */}
      <div style={S.videoArea}>
        <div style={S.videoPlaceholder}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>📹</div>
          <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>VIDEO AREA</div>
          <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", marginTop: "4px" }}>9:16 contain</div>
        </div>
      </div>

      {/* Layer 6: Vignette */}
      <div style={S.vignette} />

      {/* Controls */}
      <div style={S.controls}>
        <div style={S.controlTitle}>CinematicUI FX Demo</div>
        <div style={S.controlRow}>
          <span style={S.controlLabel}>Phase:</span>
          {["intro", "loop", "preview", "outro"].map((p) => (
            <button
              key={p}
              onClick={() => {
                phaseRef.current = p;
                previewCardRef.current = p === "preview" ? "build" : null;
                setPhase(p);
                setPreviewCard(p === "preview" ? "build" : null);
              }}
              style={{
                ...S.controlBtn,
                background: phase === p ? "rgba(76,175,80,0.3)" : "rgba(255,255,255,0.05)",
                borderColor: phase === p ? "rgba(76,175,80,0.5)" : "rgba(255,255,255,0.1)",
                color: phase === p ? "#7ddf8a" : "rgba(255,255,255,0.4)",
              }}
            >
              {p}
            </button>
          ))}
        </div>
        {phase === "preview" && (
          <div style={S.controlRow}>
            <span style={S.controlLabel}>Card:</span>
            {["build", "recommended", "login"].map((c) => (
              <button
                key={c}
                onClick={() => {
                  previewCardRef.current = c;
                  setPreviewCard(c);
                }}
                style={{
                  ...S.controlBtn,
                  background: previewCard === c ? "rgba(200,168,78,0.3)" : "rgba(255,255,255,0.05)",
                  borderColor: previewCard === c ? "rgba(200,168,78,0.5)" : "rgba(255,255,255,0.1)",
                  color: previewCard === c ? "#e8c85a" : "rgba(255,255,255,0.4)",
                }}
              >
                {c}
              </button>
            ))}
          </div>
        )}
        <div style={S.controlHint}>
          Space = cycle phases · D = debug overlay
        </div>
      </div>

      <style>{`
        @keyframes ambientDrift {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
          33% { transform: translate(3%, -2%) scale(1.05); opacity: 0.8; }
          66% { transform: translate(-2%, 1%) scale(0.95); opacity: 0.7; }
        }
        @keyframes leakShift {
          0%, 100% { transform: translateX(0) scaleY(1); opacity: 0.5; }
          50% { transform: translateX(5%) scaleY(1.1); opacity: 0.8; }
        }
        @keyframes edgePulse {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}

// ─── STYLES ───
const S = {
  root: {
    position: "fixed",
    inset: 0,
    background: "#060e03",
    overflow: "hidden",
  },

  // Ambient glows
  ambientLayer: {
    position: "absolute",
    inset: 0,
    zIndex: 1,
    overflow: "hidden",
  },
  ambientBlob: {
    position: "absolute",
    borderRadius: "50%",
    willChange: "transform, opacity",
  },

  // Particle canvas
  particleCanvas: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    zIndex: 2,
    pointerEvents: "none",
  },

  // Light leaks
  lightLeakLayer: {
    position: "absolute",
    inset: 0,
    zIndex: 3,
    pointerEvents: "none",
    mixBlendMode: "screen",
  },
  lightLeak: {
    position: "absolute",
    willChange: "transform, opacity",
  },

  // Edge bloom
  edgeBloom: {
    position: "absolute",
    inset: 0,
    zIndex: 4,
    pointerEvents: "none",
  },
  bloomTop: {
    position: "absolute",
    top: "5%",
    left: "15%",
    right: "15%",
    height: "60px",
    background: "linear-gradient(180deg, rgba(76,175,80,0.06) 0%, transparent 100%)",
    filter: "blur(20px)",
    animation: "edgePulse 6s ease-in-out infinite",
  },
  bloomBottom: {
    position: "absolute",
    bottom: "5%",
    left: "15%",
    right: "15%",
    height: "60px",
    background: "linear-gradient(0deg, rgba(76,175,80,0.06) 0%, transparent 100%)",
    filter: "blur(20px)",
    animation: "edgePulse 6s ease-in-out infinite",
    animationDelay: "3s",
  },
  bloomLeft: {
    position: "absolute",
    top: "15%",
    bottom: "15%",
    left: "10%",
    width: "40px",
    background: "linear-gradient(90deg, rgba(139,195,74,0.04) 0%, transparent 100%)",
    filter: "blur(15px)",
    animation: "edgePulse 8s ease-in-out infinite",
    animationDelay: "1.5s",
  },
  bloomRight: {
    position: "absolute",
    top: "15%",
    bottom: "15%",
    right: "10%",
    width: "40px",
    background: "linear-gradient(270deg, rgba(139,195,74,0.04) 0%, transparent 100%)",
    filter: "blur(15px)",
    animation: "edgePulse 8s ease-in-out infinite",
    animationDelay: "4.5s",
  },

  // Video area
  videoArea: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
    pointerEvents: "none",
  },
  videoPlaceholder: {
    aspectRatio: "9/16",
    height: "100%",
    maxWidth: "100%",
    border: "1px dashed rgba(255,255,255,0.1)",
    borderRadius: "4px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },

  // Vignette
  vignette: {
    position: "absolute",
    inset: 0,
    zIndex: 6,
    pointerEvents: "none",
    background: "radial-gradient(ellipse 70% 70% at center, transparent 50%, rgba(0,0,0,0.4) 100%)",
  },

  // Controls
  controls: {
    position: "absolute",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 100,
    background: "rgba(0,0,0,0.7)",
    backdropFilter: "blur(12px)",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.1)",
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    minWidth: "300px",
  },
  controlTitle: {
    fontSize: "11px",
    fontWeight: 700,
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    letterSpacing: "1px",
    textAlign: "center",
  },
  controlRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  controlLabel: {
    fontSize: "10px",
    color: "rgba(255,255,255,0.3)",
    width: "40px",
    fontWeight: 600,
  },
  controlBtn: {
    padding: "4px 10px",
    borderRadius: "6px",
    border: "1px solid",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
    flex: 1,
    textAlign: "center",
  },
  controlHint: {
    fontSize: "9px",
    color: "rgba(255,255,255,0.2)",
    textAlign: "center",
  },
};
