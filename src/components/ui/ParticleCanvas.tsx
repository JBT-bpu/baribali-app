'use client';

import { useEffect, useRef, useCallback } from 'react';

// ─── Types ──────────────────────────────────────────────────
interface ParticleCanvasProps {
  className?: string;
  style?: React.CSSProperties;
  intensity?: 'low' | 'medium' | 'high';
  mode?: 'all' | 'bokeh' | 'sparks';
}

interface BokehParticle {
  kind: 'bokeh';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  color: string;
  alpha: number;
  baseAlpha: number;
  pulseSpeed: number;   // radians per frame
  pulsePhase: number;   // current phase
  isLarge: boolean;     // macro bokeh blob
}

interface FireflyParticle {
  kind: 'firefly';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  baseAlpha: number;
  twinkleTimer: number;     // frames until next state flip
  twinkleVisible: boolean;
}

type Particle = BokehParticle | FireflyParticle;

// ─── Helpers ────────────────────────────────────────────────
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const BOKEH_COLORS = [
  'rgba(240,208,96,',   // #f0d060 gold
  'rgba(200,168,78,',   // #c8a84e gold
  'rgba(76,175,80,',    // #4caf50 green
  'rgba(102,187,106,',  // #66bb6a green
];

const FIREFLY_COLORS = [
  'rgba(255,255,255,',  // white
  'rgba(255,245,200,',  // warm white
  'rgba(240,208,96,',   // gold
];

const INTENSITY_MULT = { low: 1, medium: 2, high: 3 } as const;

// ─── Particle Factories ────────────────────────────────────
function makeBokeh(w: number, h: number): BokehParticle {
  const isLarge = Math.random() < 0.30;
  const isGreen = Math.random() < 0.35;
  const baseAlpha = isLarge
    ? (isGreen ? rand(0.05, 0.13) : rand(0.08, 0.18))
    : (isGreen ? rand(0.08, 0.22) : rand(0.14, 0.32));
  const baseRadius = isLarge ? rand(36, 88) : rand(3, 16);
  const spd = isLarge ? rand(0.05, 0.14) : rand(0.20, 0.42);
  return {
    kind: 'bokeh',
    x: rand(0, w),
    y: rand(0, h),
    vx: (Math.random() - 0.5) * spd * 2,
    vy: (Math.random() - 0.5) * spd * 2,
    radius: baseRadius,
    baseRadius,
    isLarge,
    color: isGreen ? pick(BOKEH_COLORS.slice(2)) : pick(BOKEH_COLORS.slice(0, 2)),
    alpha: baseAlpha,
    baseAlpha,
    pulseSpeed: isLarge ? rand(0.003, 0.009) : rand(0.008, 0.018),
    pulsePhase: rand(0, Math.PI * 2),
  };
}

function makeFirefly(w: number, h: number): FireflyParticle {
  const ba = rand(0.45, 0.95);
  return {
    kind: 'firefly',
    x: rand(0, w),
    y: rand(0, h),
    vx: rand(-0.8, 0.8),
    vy: rand(-0.8, 0.8),
    radius: rand(1, 3.5),
    color: pick(FIREFLY_COLORS),
    alpha: ba,
    baseAlpha: ba,
    twinkleTimer: Math.floor(rand(25, 110)),
    twinkleVisible: true,
  };
}

// ─── Component ──────────────────────────────────────────────
export default function ParticleCanvas({
  className,
  style,
  intensity = 'medium',
  mode = 'all',
}: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const pausedRef = useRef(false);

  const initParticles = useCallback((w: number, h: number) => {
    const mult = INTENSITY_MULT[intensity];
    const bokehCount = mode !== 'sparks' ? Math.round(22 * mult) : 0;
    const fireflyCount = mode !== 'bokeh' ? Math.round(10 * mult) : 0;
    const particles: Particle[] = [];

    for (let i = 0; i < bokehCount; i++) particles.push(makeBokeh(w, h));
    for (let i = 0; i < fireflyCount; i++) particles.push(makeFirefly(w, h));

    particlesRef.current = particles;
  }, [intensity, mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) return;

    // ── Sizing ──────────────────────────────────────────────
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    initParticles(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', resize);

    // ── Visibility ──────────────────────────────────────────
    const onVisibility = () => {
      pausedRef.current = document.hidden;
    };
    document.addEventListener('visibilitychange', onVisibility);

    // ── Animation loop ──────────────────────────────────────
    const w = () => window.innerWidth;
    const h = () => window.innerHeight;

    const tick = () => {
      if (pausedRef.current) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      ctx.clearRect(0, 0, w(), h());

      for (const p of particlesRef.current) {
        // ── Update position ───────────────────────────────
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges with padding
        if (p.x < -20) p.x = w() + 20;
        if (p.x > w() + 20) p.x = -20;
        if (p.y < -20) p.y = h() + 20;
        if (p.y > h() + 20) p.y = -20;

        if (p.kind === 'bokeh') {
          // ── Pulse scale ───────────────────────────────
          p.pulsePhase += p.pulseSpeed;
          const scaleFactor = 0.82 + 0.36 * ((Math.sin(p.pulsePhase) + 1) / 2);
          p.radius = p.baseRadius * scaleFactor;

          if (p.isLarge) {
            // ── Large macro bokeh — soft radial gradient ──
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
            grad.addColorStop(0,   p.color + p.baseAlpha + ')');
            grad.addColorStop(0.5, p.color + (p.baseAlpha * 0.55) + ')');
            grad.addColorStop(1,   p.color + '0)');
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
          } else {
            // ── Small bokeh orb — solid + glow ───────────
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color + p.baseAlpha + ')';
            ctx.shadowColor = p.color + (p.baseAlpha * 0.5) + ')';
            ctx.shadowBlur = p.radius * 2.5;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        } else {
          // ── Firefly twinkle ───────────────────────────
          p.twinkleTimer--;
          if (p.twinkleTimer <= 0) {
            p.twinkleVisible = !p.twinkleVisible;
            p.twinkleTimer = Math.floor(rand(40, 160));
          }

          if (p.twinkleVisible) {
            const flickerAlpha = p.baseAlpha * rand(0.7, 1.0);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color + flickerAlpha + ')';
            ctx.shadowColor = p.color + (flickerAlpha * 0.6) + ')';
            ctx.shadowBlur = p.radius * 4;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    // ── Cleanup ─────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [initParticles]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        ...style,
      }}
    />
  );
}
