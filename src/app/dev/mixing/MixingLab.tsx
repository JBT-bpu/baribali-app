'use client';

import { useState, useCallback } from 'react';
import MixingAnimation from '../../../components/builder/ui/MixingAnimation.jsx';
import { OrderedScreen } from '../../../components/builder/SummaryView.jsx';
import OrderSeal from '../../../components/builder/ui/OrderSeal.jsx';
import BariPlaque from '../../../components/ui/bari/BariPlaque';
import { PLAQUE } from '../../../components/ui/bari/plaqueGeometry';
import { STAGES, DONE_AT } from '../../../components/builder/ui/sealTiming';

/**
 * Local-only preview for the post-order moment.
 *
 * This exists because the alternative is placing a real order every time you
 * want to look at a three-second animation — and this machine's .env.local
 * points at REAL Supabase, so "just place one" would write to the live orders
 * table and light up the kitchen board.
 *
 * Three modes. "Play" runs the real component end to end. "Scrub" freezes each
 * stage side by side, which is the only way to actually judge a 200ms strike.
 * "Handoff" runs the real gate through to the real confirmation screen — the
 * seal must not move by a pixel when it flips.
 */

const STAGE_NAMES = ['gather', 'strike', 'face', 'sheen', 'settle'] as const;

export default function MixingLab() {
    const [mode, setMode] = useState<'play' | 'scrub' | 'handoff'>('play');
    const [count, setCount] = useState(8);
    const [sending, setSending] = useState(false);
    const [run, setRun] = useState(0);
    // Mirrors SummaryView's gate: MixingAnimation calls onComplete, the
    // confirmation replaces it. The point of the handoff mode is that you should
    // not be able to see the moment this flips.
    const [handedOff, setHandedOff] = useState(false);
    const onComplete = useCallback(() => setHandedOff(true), []);

    const items = Array.from({ length: count }, (_, i) => ({ id: 'i' + i, icon: '🥬' }));
    // Mirrors MixingAnimation's SEAL_FOOTPRINT at the lab's 210px plaque width.
    const SEAL_FOOTPRINT = 0.5;
    const sealFont: React.CSSProperties = {
        width: '100%', height: '100%',
        fontSize: `calc(210px * ${SEAL_FOOTPRINT} / 12)`,
    };

    return (
        <div style={S.root}>
            <div style={S.bar}>
                <span style={S.title}>Seal lab</span>
                <button onClick={() => { setMode('play'); setRun(r => r + 1); }}
                    style={{ ...S.btn, ...(mode === 'play' ? S.on : null) }}>play</button>
                <button onClick={() => setMode('scrub')}
                    style={{ ...S.btn, ...(mode === 'scrub' ? S.on : null) }}>scrub</button>
                <button onClick={() => { setMode('handoff'); setHandedOff(false); setRun(r => r + 1); }}
                    style={{ ...S.btn, ...(mode === 'handoff' ? S.on : null) }}>handoff</button>
                <span style={S.sep} />
                {[0, 3, 8, 14].map(n => (
                    <button key={n} onClick={() => { setCount(n); setRun(r => r + 1); }}
                        style={{ ...S.btn, ...(n === count ? S.on : null) }}>{n}</button>
                ))}
                <button onClick={() => { setSending(s => !s); setRun(r => r + 1); }}
                    style={{ ...S.btn, ...(sending ? S.on : null) }}>slow network</button>
                <button onClick={() => setRun(r => r + 1)} style={{ ...S.btn, marginInlineStart: '10px' }}>↻ replay</button>
            </div>
            <div style={S.readout}>
                {STAGES.map(s => `${s.name} ${s.end}s`).join(' · ')} · handoff {DONE_AT}s
                {mode === 'scrub' ? ' — frozen stages, sized at half scale' : ''}
            </div>

            {mode === 'handoff' ? (
                handedOff
                    ? <OrderedScreen total={68} all={items} pickupTime="12:30" orderNum="BB-1042"
                        orderId={null} paymentStatus="pending" badges={[]} onNewOrder={() => { }} />
                    : <MixingAnimation key={run} onComplete={onComplete} stillSending={sending} />
            ) : mode === 'play' ? (
                // Keyed on `run` so each click is a genuine remount — every timer
                // in the sequence is scheduled from mount.
                <MixingAnimation key={run} onComplete={onComplete} stillSending={sending} />
            ) : (
                <div style={S.grid}>
                    {STAGE_NAMES.map(stage => {
                        const formed = stage === 'sheen' || stage === 'settle';
                        return (
                            // No title, no body — production leaves the plaque's
                            // interior empty right up to the handoff, and a
                            // preview that fakes content there would hide the
                            // one thing worth checking.
                            <div key={stage} style={S.cell}>
                                <div style={S.plaqueBox}>
                                    <BariPlaque
                                        pedestal={<div style={sealFont}><OrderSeal stage={stage} /></div>}
                                        pedestalWidth={SEAL_FOOTPRINT}
                                        frameStyle={{ opacity: formed ? 1 : 0 }}
                                    />
                                </div>
                                <div style={S.cap}>{stage}</div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
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
    cap: { textAlign: 'center', fontSize: '11px', color: '#f0d060', marginTop: '4px' },
};
