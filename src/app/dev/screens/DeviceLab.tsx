'use client';

import { useState } from 'react';

/**
 * The lab renders the real app in same-origin iframes at exact device pixel
 * sizes, scaled down so several fit on one screen.
 *
 * What it CAN check: layout, gutters, overflow, wrapping, whether anything is
 * clipped or collides, and how each screen behaves from 320px up to 1920px.
 *
 * What it CANNOT check, and you still need a real phone for:
 *  - mobile browser chrome, so `100dvh` always equals `100vh` in here;
 *  - real `env(safe-area-inset-*)` values, which are 0 inside an iframe — the
 *    "safe areas" overlay draws where the notch and home indicator WOULD sit
 *    so you can see collisions, but the app's own inset padding won't apply;
 *  - touch, haptics, sound, and actual scroll momentum.
 */

type Cat = 'phone' | 'tablet' | 'desktop';

interface Device {
    name: string;
    cat: Cat;
    w: number;
    h: number;
    /** Insets this device reports with viewport-fit=cover — drawn, not applied. */
    top: number;
    bottom: number;
    note?: string;
}

const DEVICES: Device[] = [
    // ── Phones, narrow → wide. The first two are the real stress cases. ──
    { name: 'iPhone SE (1st gen)',  cat: 'phone', w: 320,  h: 568,  top: 20, bottom: 0,  note: 'narrowest + shortest' },
    { name: 'Galaxy A54',           cat: 'phone', w: 360,  h: 800,  top: 24, bottom: 24, note: 'common mid-range' },
    { name: 'Galaxy S8',            cat: 'phone', w: 360,  h: 740,  top: 24, bottom: 0 },
    { name: 'iPhone SE (2nd/3rd)',  cat: 'phone', w: 375,  h: 667,  top: 20, bottom: 0,  note: 'shortest current' },
    { name: 'iPhone 13 mini',       cat: 'phone', w: 375,  h: 812,  top: 50, bottom: 34 },
    { name: 'iPhone 13 / 14',       cat: 'phone', w: 390,  h: 844,  top: 47, bottom: 34, note: 'most common iPhone' },
    { name: 'iPhone 15 / 16',       cat: 'phone', w: 393,  h: 852,  top: 59, bottom: 34 },
    { name: 'Pixel 7',              cat: 'phone', w: 412,  h: 915,  top: 24, bottom: 24, note: 'common Android' },
    { name: 'Galaxy S23 Ultra',     cat: 'phone', w: 412,  h: 915,  top: 24, bottom: 24 },
    { name: 'iPhone 15 Pro Max',    cat: 'phone', w: 430,  h: 932,  top: 59, bottom: 34, note: "app's 430px max-width" },
    { name: 'iPhone 14 — landscape',cat: 'phone', w: 844,  h: 390,  top: 0,  bottom: 21, note: 'rotated' },

    // ── Tablets ──
    { name: 'iPad mini',            cat: 'tablet', w: 768,  h: 1024, top: 24, bottom: 20 },
    { name: 'iPad Air',             cat: 'tablet', w: 820,  h: 1180, top: 24, bottom: 20 },
    { name: 'iPad Pro 11″',         cat: 'tablet', w: 834,  h: 1194, top: 24, bottom: 20 },
    { name: 'iPad — landscape',     cat: 'tablet', w: 1024, h: 768,  top: 20, bottom: 20 },
    { name: 'Lenovo Tab M11',       cat: 'tablet', w: 1280, h: 800,  top: 0,  bottom: 0,  note: 'kitchen board' },

    // ── Desktop ──
    { name: 'Laptop',               cat: 'desktop', w: 1366, h: 768,  top: 0, bottom: 0 },
    { name: 'Desktop',              cat: 'desktop', w: 1440, h: 900,  top: 0, bottom: 0 },
    { name: 'Full HD',              cat: 'desktop', w: 1920, h: 1080, top: 0, bottom: 0 },
];

const ROUTES: { label: string; path: string }[] = [
    { label: 'בית',    path: '/home2' },
    { label: 'בונה M', path: '/build?size=M' },
    { label: 'בונה S', path: '/build?size=S' },
    { label: 'בונה L', path: '/build?size=L' },
    { label: 'הזמנות', path: '/orders' },
    { label: 'פרופיל', path: '/profile' },
    { label: 'תנאים',  path: '/terms' },
    { label: 'נגישות', path: '/accessibility' },
    { label: 'כניסה',  path: '/login' },
    { label: 'מטבח',   path: '/kitchen' },
];

const ZOOMS = [0.25, 0.3, 0.4, 0.5, 0.75, 1];
const CATS: { key: Cat | 'all'; label: string }[] = [
    { key: 'all', label: 'all' },
    { key: 'phone', label: 'phones' },
    { key: 'tablet', label: 'tablets' },
    { key: 'desktop', label: 'desktop' },
];

export default function DeviceLab() {
    const [path, setPath] = useState(ROUTES[0].path);
    const [custom, setCustom] = useState('');
    const [zoom, setZoom] = useState(0.4);
    const [showSafe, setShowSafe] = useState(true);
    const [cat, setCat] = useState<Cat | 'all'>('phone');
    const [only, setOnly] = useState<string | null>(null);
    // Bumping this remounts every iframe, which is the only reliable way to
    // reload cross-document content we don't script into.
    const [reloadKey, setReloadKey] = useState(0);

    const src = custom.trim() || path;
    const shown = only
        ? DEVICES.filter(d => d.name === only)
        : DEVICES.filter(d => cat === 'all' || d.cat === cat);

    return (
        <div style={S.root}>
            <div style={S.bar}>
                <div style={S.title}>Device lab</div>

                <div style={S.group}>
                    {ROUTES.map(r => (
                        <button
                            key={r.path}
                            onClick={() => { setCustom(''); setPath(r.path); }}
                            style={{ ...S.chip, ...(!custom && src === r.path ? S.chipOn : {}) }}
                        >{r.label}</button>
                    ))}
                </div>

                <input
                    value={custom}
                    onChange={e => setCustom(e.target.value)}
                    placeholder="/order/<id>  — any other path"
                    style={S.input}
                />

                <div style={S.group}>
                    <span style={S.lbl}>devices</span>
                    {CATS.map(c => (
                        <button
                            key={c.key}
                            onClick={() => { setOnly(null); setCat(c.key); }}
                            style={{ ...S.chip, ...(!only && cat === c.key ? S.chipOn : {}) }}
                        >{c.label}</button>
                    ))}
                </div>

                <div style={S.group}>
                    <span style={S.lbl}>zoom</span>
                    {ZOOMS.map(z => (
                        <button key={z} onClick={() => setZoom(z)} style={{ ...S.chip, ...(zoom === z ? S.chipOn : {}) }}>
                            {Math.round(z * 100)}%
                        </button>
                    ))}
                </div>

                <div style={S.group}>
                    <button onClick={() => setShowSafe(v => !v)} style={{ ...S.chip, ...(showSafe ? S.chipOn : {}) }}>
                        safe areas
                    </button>
                    <button onClick={() => setReloadKey(k => k + 1)} style={S.chip}>reload</button>
                    <span style={S.lbl}>{shown.length} shown</span>
                </div>
            </div>

            <div style={S.note}>
                Layout only. Browser chrome isn&rsquo;t simulated, so <code style={S.code}>100dvh</code> reads the same as{' '}
                <code style={S.code}>100vh</code> in here, and <code style={S.code}>env(safe-area-inset-*)</code> is 0 inside an
                iframe — the red bands show where the notch and home indicator <em>would</em> sit, not the app&rsquo;s applied
                padding. Both still need a real phone. Click a device name to isolate it.
            </div>

            <div style={S.grid}>
                {shown.map(d => (
                    <div key={d.name} style={S.cell}>
                        <div style={S.cap}>
                            <button onClick={() => setOnly(only === d.name ? null : d.name)} style={S.capBtn}>
                                {d.name}
                            </button>
                            <span style={S.dims}>{d.w}×{d.h}</span>
                            {d.note && <span style={S.tag}>{d.note}</span>}
                        </div>

                        <div style={{ ...S.frame, width: d.w * zoom, height: d.h * zoom }}>
                            <div style={{ width: d.w, height: d.h, transform: `scale(${zoom})`, transformOrigin: 'top left', position: 'relative' }}>
                                <iframe
                                    key={`${d.name}-${src}-${reloadKey}`}
                                    src={src}
                                    title={`${d.name} — ${src}`}
                                    width={d.w}
                                    height={d.h}
                                    style={{ border: 0, display: 'block', background: '#000' }}
                                />
                                {showSafe && d.top > 0 && (
                                    <div style={{ ...S.safe, top: 0, height: d.top }}>
                                        <span style={S.safeTxt}>status / notch {d.top}px</span>
                                    </div>
                                )}
                                {showSafe && d.bottom > 0 && (
                                    <div style={{ ...S.safe, bottom: 0, height: d.bottom }}>
                                        <span style={S.safeTxt}>home indicator {d.bottom}px</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

const S: Record<string, React.CSSProperties> = {
    root: { direction: 'ltr', minHeight: '100dvh', background: '#111', color: '#eee', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '12px' },
    bar: { position: 'sticky', top: 0, zIndex: 10, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', padding: '12px 16px', background: '#0a0a0a', borderBottom: '1px solid #333' },
    title: { fontSize: '14px', fontWeight: 700, color: '#f0d060', marginInlineEnd: '4px' },
    group: { display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' },
    lbl: { color: '#777', marginInlineEnd: '2px' },
    chip: { padding: '5px 10px', borderRadius: '7px', cursor: 'pointer', background: '#1e1e1e', border: '1px solid #383838', color: '#ccc', fontSize: '12px', fontFamily: 'inherit' },
    chipOn: { background: '#3a3416', borderColor: '#c8a832', color: '#f0d060' },
    input: { flex: '1 1 200px', minWidth: '160px', padding: '6px 10px', borderRadius: '7px', background: '#1a1a1a', border: '1px solid #383838', color: '#eee', fontSize: '12px', fontFamily: 'inherit', direction: 'ltr' },
    note: { padding: '10px 16px', color: '#8a8a8a', lineHeight: 1.6, borderBottom: '1px solid #222', background: '#0d0d0d' },
    code: { background: '#222', padding: '1px 5px', borderRadius: '4px', color: '#d0b070' },
    grid: { display: 'flex', flexWrap: 'wrap', gap: '20px', padding: '18px 16px 60px', alignItems: 'flex-start' },
    cell: { display: 'flex', flexDirection: 'column', gap: '6px' },
    cap: { display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' },
    capBtn: { padding: 0, background: 'none', border: 0, color: '#eee', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline dotted' },
    dims: { color: '#777' },
    tag: { color: '#c8a832' },
    frame: { position: 'relative', overflow: 'hidden', borderRadius: '6px', border: '1px solid #333', background: '#000' },
    safe: { position: 'absolute', left: 0, right: 0, background: 'rgba(229,57,53,0.22)', borderBlock: '1px dashed rgba(229,57,53,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' },
    safeTxt: { fontSize: '11px', fontWeight: 700, color: '#ffb4b0', textShadow: '0 1px 3px rgba(0,0,0,0.9)' },
};
