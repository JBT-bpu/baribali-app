'use client';

import { useState, useEffect } from 'react';
import OrderSealScreen from '../../../components/builder/ui/OrderSealScreen.jsx';
import OrderSeal from '../../../components/builder/ui/OrderSeal.jsx';
import BariPlaque from '../../../components/ui/bari/BariPlaque';
import { TIMED_STAGES, CONTENT_FLOOR, SEAL_FOOTPRINT } from '../../../components/builder/ui/sealTiming';

/**
 * Local-only preview for the post-order moment.
 *
 * This exists because the alternative is placing a real order every time you
 * want to look at it — and this machine's .env.local points at REAL Supabase,
 * so "just place one" would write to the live orders table and light up the
 * kitchen board.
 *
 * The screen is one component now, so what the lab varies is what the SERVER
 * does: how long the order takes to come back. That is the only thing the
 * sequence's length depends on.
 */

const STAGE_NAMES = ['gather', 'strike', 'face', 'waiting', 'revealed'] as const;

/** Simulated server latencies, in ms. */
const LATENCIES: { label: string; ms: number }[] = [
    { label: 'instant', ms: 0 },
    { label: 'fast 300ms', ms: 300 },
    { label: 'slow 3s', ms: 3000 },
    { label: 'crawling 8s', ms: 8000 },
];

const FAKE_ORDER = {
    total: 68, items: 8, pickupTime: '12:30',
    orderNum: 'BB-1042', orderId: null,
    paymentStatus: 'pay_at_pickup', badges: [],
};

export default function MixingLab() {
    const [mode, setMode] = useState<'play' | 'scrub'>('play');
    const [latency, setLatency] = useState(300);
    const [run, setRun] = useState(0);

    return (
        <div style={S.root}>
            <div style={S.bar}>
                <span style={S.title}>Seal lab</span>
                <button onClick={() => { setMode('play'); setRun(r => r + 1); }}
                    style={{ ...S.btn, ...(mode === 'play' ? S.on : null) }}>play</button>
                <button onClick={() => setMode('scrub')}
                    style={{ ...S.btn, ...(mode === 'scrub' ? S.on : null) }}>scrub</button>
                <span style={S.sep} />
                {LATENCIES.map(l => (
                    <button key={l.ms} onClick={() => { setLatency(l.ms); setMode('play'); setRun(r => r + 1); }}
                        style={{ ...S.btn, ...(l.ms === latency ? S.on : null) }}>{l.label}</button>
                ))}
                <button onClick={() => setRun(r => r + 1)} style={{ ...S.btn, marginInlineStart: '10px' }}>↻ replay</button>
            </div>
            <div style={S.readout}>
                {TIMED_STAGES.map(s => `${s.name} ${s.end}s`).join(' · ')} · then the order decides ·
                {' '}floor {CONTENT_FLOOR}s · server {latency}ms
                {' '}→ content at ~{(Math.max(CONTENT_FLOOR * 1000, latency) / 1000).toFixed(2)}s
            </div>

            {mode === 'play'
                ? <PlayHarness key={run} latency={latency} />
                : (
                    <div style={S.grid}>
                        {STAGE_NAMES.map(stage => (
                            // No title or body: production leaves the plaque's
                            // interior empty until the order lands, and a preview
                            // that faked content would hide the thing worth checking.
                            <div key={stage} style={S.cell}>
                                <div style={S.plaqueBox}>
                                    <BariPlaque
                                        pedestal={<div style={S.sealFont}><OrderSeal stage={stage} /></div>}
                                        pedestalWidth={SEAL_FOOTPRINT}
                                        frameStyle={{ opacity: stage === 'revealed' ? 1 : 0 }}
                                    />
                                </div>
                                <div style={S.cap}>{stage}</div>
                            </div>
                        ))}
                    </div>
                )}
        </div>
    );
}

/** Mirrors SummaryView's gate: the order arrives after `latency`, and nothing
 *  about it can render before that because there is no data to render. */
function PlayHarness({ latency }: { latency: number }) {
    const [order, setOrder] = useState<typeof FAKE_ORDER | null>(null);
    useEffect(() => {
        const t = setTimeout(() => setOrder(FAKE_ORDER), latency);
        return () => clearTimeout(t);
    }, [latency]);
    return <OrderSealScreen order={order} onNewOrder={() => { }} />;
}

const S: Record<string, React.CSSProperties> = {
    root: { minHeight: '100vh', background: '#0b0b0b', color: '#e8e8e8', fontFamily: 'ui-monospace, monospace' },
    bar: {
        position: 'fixed', top: 0, insetInline: 0, zIndex: 900,
        display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center',
        padding: '10px 14px', background: 'rgba(12,12,12,0.94)', borderBottom: '1px solid #262626',
    },
    title: { fontSize: '13px', fontWeight: 700, color: '#f0d060', marginInlineEnd: '8px' },
    sep: { width: '1px', height: '18px', background: '#333', margin: '0 4px' },
    btn: {
        minWidth: '30px', padding: '5px 9px', fontSize: '12px', cursor: 'pointer',
        color: '#ddd', background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px',
    },
    // Full shorthand, not borderColor: merging a longhand onto S.btn's `border`
    // shorthand makes React warn about conflicting style properties on rerender.
    on: { background: '#f0d060', border: '1px solid #f0d060', color: '#111', fontWeight: 700 },
    readout: {
        position: 'fixed', top: '46px', insetInline: 0, zIndex: 900,
        padding: '7px 14px', fontSize: '11.5px', color: '#9a9a9a',
        background: 'rgba(12,12,12,0.94)', borderBottom: '1px solid #262626',
    },
    grid: {
        display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'flex-start',
        padding: '92px 14px 40px', background: '#061206', minHeight: '100vh',
    },
    cell: { width: '210px' },
    plaqueBox: { width: '210px', direction: 'rtl' },
    // Mirrors OrderSealScreen's sizing at the lab's 210px plaque width.
    sealFont: { width: '100%', height: '100%', fontSize: `calc(210px * ${SEAL_FOOTPRINT} / 12)` },
    cap: { textAlign: 'center', fontSize: '11px', color: '#f0d060', marginTop: '4px' },
};
