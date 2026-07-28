'use client';

import { useEffect, useRef } from 'react';

/**
 * The BariBali gold field — the drifting motes behind the landing, the size
 * picker and the builder. One implementation so every screen in the ordering
 * flow shows the *same* field; using a different particle system per screen
 * made the steps look like different apps.
 *
 * Pre-renders one glow sprite per colour once and drawImage()s it per particle —
 * per-frame ctx.shadowBlur (the slowest canvas op) and per-frame gradient
 * creation were the two most expensive things here.
 *
 * Reacts to the flow:
 *   impulseRef — a swipe gust; motes drift the way the roster moved, then settle.
 *   dropRef    — 0→1 rushes the field radially outward for the dive transition.
 *   entrySweep — starts mid-motion at a signed speed and decays, so a screen
 *                arriving from the transition finishes that motion instead of
 *                popping in at rest. `entryHold` freezes it while still covered.
 */

// Pre-render one soft glow sprite per colour.
function makeGlowSprite(col: string, hardStop: number): HTMLCanvasElement {
    const size = 64;
    const s = document.createElement('canvas');
    s.width = s.height = size;
    const sctx = s.getContext('2d')!;
    const g = sctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, col);
    g.addColorStop(hardStop, col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    sctx.fillStyle = g;
    sctx.fillRect(0, 0, size, size);
    return s;
}

interface GoldFieldProps {
    /** Horizontal swipe gust (decays to 0 automatically). */
    impulseRef?: { current: number };
    /** Signed vertical sweep (-1 = up, +1 = down) for the rise transition. */
    dropRef?: { current: number };
    /**
     * Start mid-sweep at this signed speed and decelerate — for a screen arriving
     * from the transition. Must carry the same sign the previous screen swept in,
     * or the motion reverses on arrival and the hand-off reads as a cut.
     */
    entrySweep?: number;
    /**
     * Freeze the arriving sweep at full speed instead of decaying it. Set while
     * the veil is still covering, so the whole deceleration happens *after* the
     * reveal — otherwise the motion is spent before it can be seen.
     */
    entryHold?: boolean;
    /** Stacking position. Use -1 inside an overlay to sit above its scrim but
     *  behind its content; 201 to ride above the transition layer. */
    zIndex?: number;
    /** Scales the particle count (1 = default density). */
    density?: number;
    /**
     * Hand the exact particle state to the next page. With the same key on both
     * sides, the field that unmounts mid-dive saves every mote's position and the
     * current rush strength, and the field that mounts restores them — so the two
     * screens show the *same* particles continuing, not a lookalike restart.
     */
    persistKey?: string;
}

export default function GoldField({ impulseRef, dropRef, entrySweep = 0, entryHold = false, zIndex = 1, density = 1, persistKey }: GoldFieldProps) {
    const ref = useRef<HTMLCanvasElement>(null);
    const warpRef = useRef(entrySweep);
    // Mirrored into a ref so toggling the hold doesn't restart the render loop
    // (which would rebuild the field and lose the motes we just inherited).
    const holdRef = useRef(entryHold);
    useEffect(() => { holdRef.current = entryHold; }, [entryHold]);

    useEffect(() => {
        const c = ref.current; if (!c) return;
        const ctx = c.getContext('2d')!;
        const resize = () => { c.width = c.offsetWidth; c.height = c.offsetHeight; };
        resize();
        window.addEventListener('resize', resize);
        // Palette matches the design tokens in globals.css (gold-deep/light/
        // bright, cream) — literal hex here since canvas fillStyle can't
        // resolve CSS custom properties.
        const sparkCols = ['#c8a832', '#f0d060', '#ffe066', '#c8a84e', '#fffacc'];
        const bokehCols = ['#c8a832', '#f0d060', '#ffe066', '#c8a84e'];
        // Tight core + wide falloff reads like the old shadowBlur glow.
        const sparkSprites = sparkCols.map(col => makeGlowSprite(col, 0.18));
        const bokehSprites = bokehCols.map(col => makeGlowSprite(col, 0.55));
        // Fewer particles on small screens — less overdraw on weaker GPUs.
        const small = window.innerWidth < 480;
        const SPARKS = Math.round((small ? 92 : 168) * density);
        const BOKEH = Math.round((small ? 19 : 36) * density);
        type Spark = { x: number; y: number; r: number; s: number; o: number; sp: number; d: number; ph: number };
        type Bokeh = { x: number; y: number; r: number; s: number; o: number; sp: number; ph: number };
        const sparks: Spark[] = Array.from({ length: SPARKS }, () => ({
            x: Math.random() * c.width, y: Math.random() * c.height,
            r: Math.random() * 2.8 + 0.5, s: Math.random() * 0.65 + 0.18,
            o: Math.random() * 0.45 + 0.12, sp: Math.floor(Math.random() * sparkSprites.length),
            d: (Math.random() - 0.5) * 0.32, ph: Math.random() * Math.PI * 2,
        }));
        const bokeh: Bokeh[] = Array.from({ length: BOKEH }, () => ({
            x: Math.random() * c.width, y: Math.random() * c.height,
            r: Math.random() * 54 + 18, s: Math.random() * 0.14 + 0.03,
            o: Math.random() * 0.10 + 0.04, sp: Math.floor(Math.random() * bokehSprites.length),
            ph: Math.random() * Math.PI * 2,
        }));
        // Restore the previous page's field, if it handed one over: same motes in
        // the same places, still rushing at the same strength. Only the arriving
        // side (entrySweep) restores — otherwise a hand-off left unconsumed could
        // later leak into the screen that produced it.
        if (persistKey && entrySweep !== 0) {
            try {
                const raw = sessionStorage.getItem(persistKey);
                if (raw) {
                    sessionStorage.removeItem(persistKey);
                    const st = JSON.parse(raw);
                    if (Array.isArray(st.sparks)) {
                        for (let i = 0; i < Math.min(sparks.length, st.sparks.length); i++) {
                            const [x, y, r, ph] = st.sparks[i];
                            sparks[i].x = x * c.width; sparks[i].y = y * c.height; sparks[i].r = r; sparks[i].ph = ph;
                        }
                    }
                    if (Array.isArray(st.bokeh)) {
                        for (let i = 0; i < Math.min(bokeh.length, st.bokeh.length); i++) {
                            const [x, y, r, ph] = st.bokeh[i];
                            bokeh[i].x = x * c.width; bokeh[i].y = y * c.height; bokeh[i].r = r; bokeh[i].ph = ph;
                        }
                    }
                    if (typeof st.drop === 'number') warpRef.current = st.drop;
                }
            } catch { /* nothing handed over — start fresh */ }
        }

        let raf: number, t = 0, drop = 0, live = 0;
        const draw = () => {
            t += 0.013; ctx.clearRect(0, 0, c.width, c.height);
            // "Sweep" — during the rise the field drifts upward with the panel and
            // stretches vertically. Signed, so it follows the panel's direction.
            // Eased so it ramps in; `entry` is the same motion arriving pre-loaded
            // and decaying to rest.
            // Slow ramp (~0.05/frame): the field eases into the sweep over ~20
            // frames, so the transition creeps into motion instead of kicking off.
            drop += ((dropRef?.current ?? 0) - drop) * 0.05;
            const entry = warpRef.current;
            // Frozen while the veil is up; once revealed it coasts to rest over
            // roughly a second, so the deceleration is the part you actually see.
            if (!holdRef.current) {
                if (Math.abs(entry) > 0.002) warpRef.current = entry * 0.955; else if (entry) warpRef.current = 0;
            }
            const sweepRaw = drop + entry;
            const sweep = Math.abs(sweepRaw) < 0.004 ? 0 : sweepRaw;
            const sweepMag = Math.abs(sweep);
            live = sweep;
            // Swipe gust: a horizontal impulse the hero selector sets on each
            // swipe, applied to every particle and decayed to zero over ~0.5s so
            // the field drifts the way the roster moved, then settles.
            const imp = impulseRef?.current ?? 0;
            // Horizontal streak factor during a fast gust — sparks stretch into
            // speed-lines, selling a quick "camera pan" and settling as imp decays.
            // A swipe gust stretches motes horizontally; the transition stretches
            // them vertically into trails as they accelerate. `norm` keeps the
            // brightness/size response sane no matter how hard the sweep is driven.
            const norm = Math.min(sweepMag, 1);
            const streakX = 1 + Math.min(Math.abs(imp) * 0.28, 4);
            const streakY = 1 + Math.min(sweepMag * 1.6, 3.2);
            for (const b of bokeh) {
                b.y -= b.s - sweep * (2.4 + b.r * 0.05);
                b.x += Math.sin(t * 0.35 + b.ph) * 0.28 + imp * 0.6;
                b.o = 0.04 + Math.sin(t * 0.45 + b.ph) * 0.07 + 0.04;
                if (b.y < -b.r * 2) b.y = c.height + b.r;
                if (b.y > c.height + b.r * 2) b.y = -b.r;
                ctx.globalAlpha = Math.min(0.3, Math.max(0, b.o + norm * 0.08));
                ctx.drawImage(bokehSprites[b.sp], b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
            }
            for (const p of sparks) {
                // Bigger motes read as nearer, so they accelerate harder — parallax.
                p.y -= p.s - sweep * (3.2 + p.r * 1.6);
                p.x += p.d + Math.sin(t + p.ph) * 0.16 + imp;
                p.o = 0.08 + Math.sin(t * 0.9 + p.ph) * 0.28 + 0.12;
                if (p.y < -6) { p.y = c.height + 6; p.x = Math.random() * c.width; }
                if (p.y > c.height + 6) { p.y = -6; p.x = Math.random() * c.width; }
                if (p.x < 0) p.x = c.width; if (p.x > c.width) p.x = 0;
                ctx.globalAlpha = Math.min(1, Math.max(0, p.o + norm * 0.22));
                // Sprite drawn at ~4.5x the core radius so the falloff shows, then
                // stretched along whichever axis is moving.
                const d = p.r * 4.5;
                ctx.drawImage(sparkSprites[p.sp], p.x - (d * streakX) / 2, p.y - (d * streakY) / 2, d * streakX, d * streakY);
            }
            if (impulseRef) impulseRef.current = Math.abs(imp) < 0.04 ? 0 : imp * 0.9;
            ctx.globalAlpha = 1;
            raf = requestAnimationFrame(draw);
        };
        draw();
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
            // Unmounting mid-sweep: hand this exact field to the next page.
            // (Magnitude, not sign — the sweep is negative when travelling left.)
            if (persistKey && Math.abs(live) > 0.05) {
                try {
                    const norm = (v: number, span: number) => +(v / span).toFixed(4);
                    sessionStorage.setItem(persistKey, JSON.stringify({
                        sparks: sparks.map(p => [norm(p.x, c.width), norm(p.y, c.height), p.r, p.ph]),
                        bokeh: bokeh.map(b => [norm(b.x, c.width), norm(b.y, c.height), b.r, b.ph]),
                        drop: live,
                    }));
                } catch { /* storage unavailable — the next page just starts fresh */ }
            }
        };
    }, [impulseRef, dropRef, density, persistKey, entrySweep]);

    return <canvas ref={ref} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex }} />;
}
