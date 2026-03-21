// Hotspot Calibrator - Dev tool for adjusting hotspot positions
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface Hotspot {
    id: string;
    type: 'card' | 'nav';
    label: string;
    color: string;
    top: number;
    left: number;
    w: number;
    h: number;
}

const DEFAULT_HOTSPOTS: Hotspot[] = [
    { id: 'card-build', type: 'card', label: 'בנה סלט כפר', color: '#4caf50', top: 52, left: 3, w: 30, h: 26 },
    { id: 'card-recommended', type: 'card', label: 'המומלצים שלו', color: '#8bc34a', top: 52, left: 35, w: 30, h: 26 },
    { id: 'card-login', type: 'card', label: 'התחברות משתמש', color: '#ff9800', top: 52, left: 67, w: 30, h: 26 },
    { id: 'nav-home', type: 'nav', label: 'בית', color: '#2196f3', top: 90, left: 8, w: 14, h: 7 },
    { id: 'nav-fresh', type: 'nav', label: 'טרי', color: '#2196f3', top: 90, left: 24, w: 14, h: 7 },
    { id: 'nav-star', type: 'nav', label: 'מועדפים', color: '#2196f3', top: 90, left: 40, w: 14, h: 7 },
    { id: 'nav-top', type: 'nav', label: 'מובילים', color: '#2196f3', top: 90, left: 56, w: 14, h: 7 },
    { id: 'nav-profile', type: 'nav', label: 'פרופיל', color: '#2196f3', top: 90, left: 72, w: 14, h: 7 },
];

const SNAP_THRESHOLD = 1; // % snap distance

export default function HotspotCalibrator() {
    const [bgImage, setBgImage] = useState<string | null>(null);
    const [bgName, setBgName] = useState('');
    const [hotspots, setHotspots] = useState<Hotspot[]>(DEFAULT_HOTSPOTS);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [dragging, setDragging] = useState<{
        id: string;
        mode: 'move' | 'resize';
        startX: number;
        startY: number;
        startRect: Hotspot;
    } | null>(null);
    const [showLabels, setShowLabels] = useState(true);
    const [showFill, setShowFill] = useState(true);
    const [opacity, setOpacity] = useState(0.3);
    const [zoom, setZoom] = useState(1);
    const [copied, setCopied] = useState(false);
    const [gridOn, setGridOn] = useState(false);
    const [snapOn, setSnapOn] = useState(true);
    const canvasRef = useRef<HTMLDivElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    // Image loading
    const handleImageDrop = useCallback((e: React.DragEvent | React.ChangeEvent<HTMLInputElement>) => {
        const files = 'dataTransfer' in e ? e.dataTransfer?.files : e.target?.files;
        const file = files?.[0];
        if (!file || !file.type.startsWith('image/')) return;
        setBgName(file.name);
        const reader = new FileReader();
        reader.onload = (ev) => setBgImage(ev.target?.result as string);
        reader.readAsDataURL(file);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }, []);

    // Snap to grid / other hotspots
    const snapValue = useCallback((val: number, axis: 'x' | 'y', excludeId: string) => {
        if (!snapOn) return val;
        // Snap to grid lines (every 5%)
        const gridSnap = Math.round(val / 5) * 5;
        if (Math.abs(val - gridSnap) < SNAP_THRESHOLD) return gridSnap;
        // Snap to other hotspot edges
        for (const hs of hotspots) {
            if (hs.id === excludeId) continue;
            const edges = axis === 'x' ? [hs.left, hs.left + hs.w] : [hs.top, hs.top + hs.h];
            for (const edge of edges) {
                if (Math.abs(val - edge) < SNAP_THRESHOLD) return edge;
            }
        }
        return val;
    }, [hotspots, snapOn]);

    // Mouse handling
    const getRelativePos = useCallback((e: React.MouseEvent | React.PointerEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return { px: 0, py: 0 };
        return {
            px: ((e.clientX - rect.left) / rect.width) * 100,
            py: ((e.clientY - rect.top) / rect.height) * 100,
        };
    }, []);

    const handlePointerDown = useCallback((e: React.PointerEvent, id: string, mode: 'move' | 'resize') => {
        e.stopPropagation();
        e.preventDefault();
        const { px, py } = getRelativePos(e);
        const hs = hotspots.find((h) => h.id === id);
        if (!hs) return;
        setSelectedId(id);
        setDragging({
            id,
            mode,
            startX: px,
            startY: py,
            startRect: { ...hs },
        });
    }, [hotspots, getRelativePos]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!dragging) return;
        e.preventDefault();
        const { px, py } = getRelativePos(e);
        const dx = px - dragging.startX;
        const dy = py - dragging.startY;

        setHotspots((prev) =>
            prev.map((hs) => {
                if (hs.id !== dragging.id) return hs;
                if (dragging.mode === 'move') {
                    return {
                        ...hs,
                        left: snapValue(dragging.startRect.left + dx, 'x', hs.id),
                        top: snapValue(dragging.startRect.top + dy, 'y', hs.id),
                    };
                } else {
                    return {
                        ...hs,
                        w: Math.max(5, snapValue(dragging.startRect.w + dx, 'x', hs.id)),
                        h: Math.max(3, snapValue(dragging.startRect.h + dy, 'y', hs.id)),
                    };
                }
            })
        );
    }, [dragging, getRelativePos, snapValue]);

    const handlePointerUp = useCallback(() => {
        setDragging(null);
    }, []);

    // Keyboard handling
    useEffect(() => {
        if (!selectedId) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            const hs = hotspots.find((h) => h.id === selectedId);
            if (!hs) return;

            const step = e.shiftKey ? 0.5 : 0.1;
            const isResize = e.altKey;

            setHotspots((prev) =>
                prev.map((h) => {
                    if (h.id !== selectedId) return h;
                    if (isResize) {
                        if (e.key === 'ArrowRight') return { ...h, w: Math.max(5, h.w + step) };
                        if (e.key === 'ArrowLeft') return { ...h, w: Math.max(5, h.w - step) };
                        if (e.key === 'ArrowDown') return { ...h, h: Math.max(3, h.h + step) };
                        if (e.key === 'ArrowUp') return { ...h, h: Math.max(3, h.h - step) };
                    } else {
                        if (e.key === 'ArrowRight') return { ...h, left: snapValue(h.left + step, 'x', h.id) };
                        if (e.key === 'ArrowLeft') return { ...h, left: snapValue(h.left - step, 'x', h.id) };
                        if (e.key === 'ArrowDown') return { ...h, top: snapValue(h.top + step, 'y', h.id) };
                        if (e.key === 'ArrowUp') return { ...h, top: snapValue(h.top - step, 'y', h.id) };
                    }
                    return h;
                })
            );
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedId, hotspots, snapValue]);

    // Export config
    const exportConfig = useCallback(() => {
        const cards = hotspots.filter((h) => h.type === 'card').map((h) => ({
            id: h.id.replace('card-', ''),
            label: h.label,
            dest: `/${h.id.replace('card-', '')}`,
            top: Math.round(h.top * 10) / 10,
            left: Math.round(h.left * 10) / 10,
            width: Math.round(h.w * 10) / 10,
            height: Math.round(h.h * 10) / 10,
        }));

        const nav = hotspots.filter((h) => h.type === 'nav').map((h) => ({
            id: h.id.replace('nav-', ''),
            label: h.label,
            dest: `/${h.id.replace('nav-', '')}`,
            left: Math.round(h.left * 10) / 10,
            width: Math.round(h.w * 10) / 10,
        }));

        const navBottom = Math.round(hotspots.find((h) => h.type === 'nav')?.top || 90 * 10) / 10;
        const navHeight = Math.round(hotspots.find((h) => h.type === 'nav')?.h || 7 * 10) / 10;

        const config = `export const HOTSPOT_CONFIG: HotspotConfig = {
  cards: ${JSON.stringify(cards, null, 2)},
  nav: ${JSON.stringify(nav, null, 2)},
  navBottom: ${navBottom},
  navHeight: ${navHeight},
};`;

        navigator.clipboard.writeText(config);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [hotspots]);

    return (
        <div style={{ fontFamily: 'system-ui, sans-serif', padding: '20px', direction: 'rtl' }}>
            <h1 style={{ marginBottom: '20px' }}>🎯 Hotspot Calibrator</h1>

            {/* Controls */}
            <div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                <button
                    onClick={() => fileRef.current?.click()}
                    style={{ padding: '8px 16px', cursor: 'pointer', background: '#4caf50', color: 'white', border: 'none', borderRadius: '4px' }}
                >
                    📁 Load Image
                </button>
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageDrop}
                    style={{ display: 'none' }}
                />
                <button
                    onClick={exportConfig}
                    style={{ padding: '8px 16px', cursor: 'pointer', background: '#2196f3', color: 'white', border: 'none', borderRadius: '4px' }}
                >
                    {copied ? '✓ Copied!' : '📋 Export Config'}
                </button>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} />
                    Labels
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input type="checkbox" checked={showFill} onChange={(e) => setShowFill(e.target.checked)} />
                    Fill
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input type="checkbox" checked={gridOn} onChange={(e) => setGridOn(e.target.checked)} />
                    Grid
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input type="checkbox" checked={snapOn} onChange={(e) => setSnapOn(e.target.checked)} />
                    Snap
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    Opacity:
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={opacity}
                        onChange={(e) => setOpacity(parseFloat(e.target.value))}
                    />
                    {opacity}
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    Zoom:
                    <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                    />
                    {zoom}x
                </label>
            </div>

            {/* Canvas */}
            <div
                ref={canvasRef}
                onDrop={handleImageDrop}
                onDragOver={handleDragOver}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '420px',
                    aspectRatio: '9/16',
                    margin: '0 auto',
                    backgroundColor: '#1a1a1a',
                    border: '2px solid #333',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top center',
                }}
            >
                {/* Background Image */}
                {bgImage ? (
                    <img
                        src={bgImage}
                        alt="Background"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            color: '#666',
                            fontSize: '14px',
                        }}
                    >
                        Drop screenshot here or click "Load Image"
                    </div>
                )}

                {/* Grid Overlay */}
                {gridOn && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundImage: `
                linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
              `,
                            backgroundSize: '5% 5%',
                            pointerEvents: 'none',
                        }}
                    >
                        {Array.from({ length: 20 }).map((_, i) => (
                            <div
                                key={`grid-x-${i}`}
                                style={{
                                    position: 'absolute',
                                    left: `${i * 5}%`,
                                    top: 0,
                                    bottom: 0,
                                    width: '1px',
                                    background: 'rgba(255,255,255,0.2)',
                                }}
                            >
                                <span
                                    style={{
                                        position: 'absolute',
                                        top: '2px',
                                        left: '2px',
                                        fontSize: '8px',
                                        color: 'rgba(255,255,255,0.5)',
                                    }}
                                >
                                    {i * 5}%
                                </span>
                            </div>
                        ))}
                        {Array.from({ length: 20 }).map((_, i) => (
                            <div
                                key={`grid-y-${i}`}
                                style={{
                                    position: 'absolute',
                                    top: `${i * 5}%`,
                                    left: 0,
                                    right: 0,
                                    height: '1px',
                                    background: 'rgba(255,255,255,0.2)',
                                }}
                            >
                                <span
                                    style={{
                                        position: 'absolute',
                                        top: '-10px',
                                        left: '2px',
                                        fontSize: '8px',
                                        color: 'rgba(255,255,255,0.5)',
                                    }}
                                >
                                    {i * 5}%
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Hotspots */}
                {hotspots.map((hs) => (
                    <div
                        key={hs.id}
                        onPointerDown={(e) => handlePointerDown(e, hs.id, 'move')}
                        style={{
                            position: 'absolute',
                            top: `${hs.top}%`,
                            left: `${hs.left}%`,
                            width: `${hs.w}%`,
                            height: `${hs.h}%`,
                            border: `2px solid ${hs.color}`,
                            background: showFill ? `${hs.color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}` : 'transparent',
                            cursor: dragging?.id === hs.id ? 'grabbing' : 'grab',
                            zIndex: selectedId === hs.id ? 10 : 1,
                        }}
                    >
                        {selectedId === hs.id && (
                            <>
                                {/* Resize handle */}
                                <div
                                    onPointerDown={(e) => {
                                        e.stopPropagation();
                                        handlePointerDown(e, hs.id, 'resize');
                                    }}
                                    style={{
                                        position: 'absolute',
                                        bottom: '-6px',
                                        right: '-6px',
                                        width: '12px',
                                        height: '12px',
                                        background: hs.color,
                                        borderRadius: '50%',
                                        cursor: 'nwse-resize',
                                    }}
                                />
                            </>
                        )}
                        {showLabels && (
                            <span
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    fontSize: '10px',
                                    color: 'white',
                                    textShadow: '0 0 2px black',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {hs.label}
                            </span>
                        )}
                        {selectedId === hs.id && (
                            <span
                                style={{
                                    position: 'absolute',
                                    top: '-18px',
                                    left: 0,
                                    fontSize: '8px',
                                    color: hs.color,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {hs.top.toFixed(1)}%, {hs.left.toFixed(1)}% · {hs.w.toFixed(1)}×{hs.h.toFixed(1)}
                            </span>
                        )}
                    </div>
                ))}
            </div>

            {/* Instructions */}
            <div style={{ marginTop: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
                <h3 style={{ marginTop: 0 }}>Instructions:</h3>
                <ol style={{ marginBottom: 0 }}>
                    <li>Take a screenshot of your loop video frame</li>
                    <li>Drop it here or click "Load Image"</li>
                    <li>Drag hotspots to match your cards/nav</li>
                    <li>Use arrow keys for precision (0.1%), shift+arrows (0.5%), alt+arrows (resize)</li>
                    <li>Enable grid and snap for alignment</li>
                    <li>Click "Export Config" and paste into hotspot-config.ts</li>
                </ol>
            </div>
        </div>
    );
}
