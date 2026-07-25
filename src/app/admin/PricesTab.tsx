'use client';

import { useMemo, useState } from 'react';
import { STEPS, TORTILLA_STEPS } from '@/data/salad-data.js';
import { fullEffectivePriceMap } from '@/lib/menuConfig';
import BariButton from '@/components/ui/bari/BariButton';

interface CatItem { id: string; he: string; icon: string; price: number }
interface CatSub { items: CatItem[] }
interface CatStep { title?: string; subgroups: CatSub[] }

const BASE_FIELDS: { key: string; label: string }[] = [
    { key: '__base_salad', label: 'בסיס סלט' },
    { key: '__base_tortilla', label: 'בסיס טורטיה' },
    { key: '__size_750', label: 'גודל 750 מ״ל' },
    { key: '__size_1000', label: 'גודל 1000 מ״ל' },
    { key: '__size_1500', label: 'גודל 1500 מ״ל' },
];

// Only items that actually carry a price — free "included" veggies aren't
// pricing variables and don't belong in the editor.
function itemSections(): { title: string; items: CatItem[] }[] {
    const mk = (prefix: string, steps: CatStep[]) =>
        steps
            .map(s => ({
                title: `${prefix} · ${s.title ?? ''}`,
                items: s.subgroups.flatMap(sg => sg.items).filter(it => it.price > 0),
            }))
            .filter(sec => sec.items.length > 0);
    return [...mk('סלט', STEPS as CatStep[]), ...mk('טורטיה', TORTILLA_STEPS as CatStep[])];
}

export default function PricesTab() {
    const sections = useMemo(() => itemSections(), []);
    const [prices, setPrices] = useState<Record<string, string>>(() => {
        const full = fullEffectivePriceMap();
        const m: Record<string, string> = {};
        for (const f of BASE_FIELDS) m[f.key] = String(full[f.key] ?? 0);
        for (const sec of itemSections()) for (const it of sec.items) m[it.id] = String(full[it.id] ?? 0);
        return m;
    });
    const [status, setStatus] = useState('');
    const [busy, setBusy] = useState(false);

    const set = (key: string, val: string) => setPrices(p => ({ ...p, [key]: val }));

    const save = async () => {
        setBusy(true);
        setStatus('');
        const numeric: Record<string, number> = {};
        for (const [k, v] of Object.entries(prices)) {
            const n = Number(v);
            if (Number.isFinite(n) && n >= 0) numeric[k] = Math.round(n);
        }
        try {
            const res = await fetch('/api/admin/menu-prices', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(numeric),
            });
            const data = await res.json().catch(() => ({}));
            setStatus(res.ok ? 'נשמר ✓ — בצע deploy כדי לפרסם' : (data.error || 'השמירה נכשלה'));
        } catch {
            setStatus('שגיאת רשת');
        }
        setBusy(false);
    };

    return (
        <div style={S.body}>
            <div style={S.note}>עריכה נשמרת לקובץ מקומי ונכנסת לאתר <strong>רק לאחר deploy</strong>.</div>

            <div style={S.sectionTitle}>בסיס וגדלים</div>
            <div style={S.grid}>
                {BASE_FIELDS.map(f => (
                    <label key={f.key} style={S.cell}>
                        <span style={S.baseLabel}>{f.label}</span>
                        <PriceInput value={prices[f.key] ?? ''} onChange={v => set(f.key, v)} />
                    </label>
                ))}
            </div>

            {sections.map(sec => (
                <div key={sec.title}>
                    <div style={S.sectionTitle}>{sec.title}</div>
                    <div style={S.grid}>
                        {sec.items.map(it => (
                            <label key={it.id} style={S.cell}>
                                <div style={S.itemTop}>
                                    {it.icon && it.icon.startsWith('/')
                                        ? <img src={it.icon} alt="" style={{ width: '26px', height: '26px', objectFit: 'contain' }} />
                                        : <span style={{ fontSize: '20px' }}>{it.icon}</span>}
                                    <span style={S.itemName}>{it.he}</span>
                                </div>
                                <PriceInput value={prices[it.id] ?? ''} onChange={v => set(it.id, v)} />
                            </label>
                        ))}
                    </div>
                </div>
            ))}

            <div style={S.saveBar}>
                {status && <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{status}</span>}
                <BariButton variant="primary" onClick={save} disabled={busy}
                    style={{ fontFamily: "var(--font-heebo), 'Heebo', sans-serif", marginInlineStart: 'auto' }}>
                    {busy ? 'שומר…' : 'שמור מחירים'}
                </BariButton>
            </div>
        </div>
    );
}

function PriceInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontWeight: 800 }}>₪</span>
            <input type="number" inputMode="numeric" min={0} value={value} onChange={e => onChange(e.target.value)}
                style={{
                    width: '64px', padding: '6px 8px', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff', fontSize: '15px', fontWeight: 700, textAlign: 'center',
                    fontFamily: "var(--font-heebo), 'Heebo', sans-serif", outline: 'none',
                }} />
        </div>
    );
}

const S: Record<string, React.CSSProperties> = {
    body: { maxWidth: '760px', margin: '0 auto', padding: '18px 16px 100px' },
    note: {
        fontSize: '12px', color: 'rgba(255,200,100,0.85)', fontWeight: 600, lineHeight: 1.6,
        background: 'rgba(255,200,100,0.08)', border: '1px solid rgba(255,200,100,0.2)',
        borderRadius: '10px', padding: '10px 12px', marginBottom: '14px',
    },
    sectionTitle: { fontSize: '14px', fontWeight: 800, color: 'var(--color-gold-light)', margin: '16px 0 8px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px' },
    cell: {
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '10px', padding: '10px', cursor: 'text',
    },
    itemTop: { display: 'flex', alignItems: 'center', gap: '8px', width: '100%' },
    itemName: { fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    baseLabel: { fontSize: '13px', fontWeight: 800, color: '#fff' },
    saveBar: {
        position: 'fixed', bottom: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 20px max(12px, env(safe-area-inset-bottom))',
        background: 'rgba(10,10,10,0.96)', borderTop: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(10px)', zIndex: 20,
    },
};
