'use client';

import { useState } from 'react';
import discountsJson from '@/data/discounts.json';
import BariButton from '@/components/ui/bari/BariButton';

interface Row { code: string; type: 'percent' | 'amount'; value: string; active: boolean; note: string }

function seed(): Row[] {
    return (discountsJson as Record<string, unknown>[]).map(d => ({
        code: String(d.code ?? ''),
        type: d.type === 'amount' ? 'amount' : 'percent',
        value: String(d.value ?? 0),
        active: !!d.active,
        note: String(d.note ?? ''),
    }));
}

export default function DiscountsTab() {
    const [rows, setRows] = useState<Row[]>(seed);
    const [status, setStatus] = useState('');
    const [busy, setBusy] = useState(false);

    const update = (i: number, patch: Partial<Row>) => setRows(rs => rs.map((r, idx) => idx === i ? { ...r, ...patch } : r));
    const add = () => setRows(rs => [...rs, { code: '', type: 'percent', value: '10', active: true, note: '' }]);
    const remove = (i: number) => setRows(rs => rs.filter((_, idx) => idx !== i));

    const save = async () => {
        const payload = rows
            .filter(r => r.code.trim())
            .map(r => ({ code: r.code.trim().toUpperCase(), type: r.type, value: Math.round(Number(r.value) || 0), active: r.active, note: r.note }));

        // "50" meant as ₪50 but left on "אחוז" gives half the menu away. The
        // server caps a discount at the order total, so this can't go negative —
        // but it can very easily make orders free by accident.
        const steep = payload.filter(d => d.active && d.type === 'percent' && d.value >= 50);
        if (steep.length > 0 &&
            !window.confirm(
                `שימו לב — הקודים הבאים נותנים הנחה גדולה מאוד:\n` +
                steep.map(d => `${d.code} — ${d.value}%${d.value >= 100 ? ' (הזמנה חינם)' : ''}`).join('\n') +
                `\n\nאם התכוונתם לסכום בשקלים, שנו את הסוג ל״₪״.\n\nלהמשיך ולשמור?`)) {
            return;
        }

        setBusy(true);
        setStatus('');
        try {
            const res = await fetch('/api/admin/discounts', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
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
            <div style={S.note}>
                קוד הנחה חל על סכום ההזמנה בקופה. שינויים נכנסים לאתר <strong>רק לאחר deploy</strong>.
                (ללא מגבלת שימושים — לקוד חד־פעמי נדרש שלב עתידי.)
            </div>

            {rows.length === 0 && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', padding: '12px 0' }}>אין קודים עדיין.</div>}

            {rows.map((r, i) => (
                <div key={i} style={S.card}>
                    <div style={S.rowTop}>
                        <input value={r.code} onChange={e => update(i, { code: e.target.value })} placeholder="CODE"
                            style={{ ...S.input, flex: 1, letterSpacing: '0.08em', textTransform: 'uppercase' }} />
                        <select value={r.type} onChange={e => update(i, { type: e.target.value as Row['type'] })} style={S.input}>
                            <option value="percent">%</option>
                            <option value="amount">₪</option>
                        </select>
                        <input type="number" min={0} value={r.value} onChange={e => update(i, { value: e.target.value })}
                            style={{ ...S.input, width: '70px', textAlign: 'center' }} />
                    </div>
                    <input value={r.note} onChange={e => update(i, { note: e.target.value })} placeholder="הערה (למשל: עובדי עירייה)"
                        style={{ ...S.input, width: '100%', marginTop: '8px', fontSize: '13px' }} />
                    <div style={S.rowBottom}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'rgba(255,255,255,0.75)', cursor: 'pointer' }}>
                            <input type="checkbox" checked={r.active} onChange={e => update(i, { active: e.target.checked })} />
                            פעיל
                        </label>
                        <button type="button" onClick={() => remove(i)} style={S.del}>מחק</button>
                    </div>
                </div>
            ))}

            <button type="button" onClick={add} style={S.add}>+ הוסף קוד</button>

            <div style={S.saveBar}>
                {status && <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{status}</span>}
                <BariButton variant="primary" onClick={save} disabled={busy}
                    style={{ fontFamily: "var(--font-heebo), 'Heebo', sans-serif", marginInlineStart: 'auto' }}>
                    {busy ? 'שומר…' : 'שמור קודים'}
                </BariButton>
            </div>
        </div>
    );
}

const S: Record<string, React.CSSProperties> = {
    body: { maxWidth: '620px', margin: '0 auto', padding: '18px 16px 100px' },
    note: {
        fontSize: '12px', color: 'rgba(255,200,100,0.85)', fontWeight: 600, lineHeight: 1.6,
        background: 'rgba(255,200,100,0.08)', border: '1px solid rgba(255,200,100,0.2)',
        borderRadius: '10px', padding: '10px 12px', marginBottom: '14px',
    },
    card: {
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px', padding: '12px', marginBottom: '10px',
    },
    rowTop: { display: 'flex', gap: '8px', alignItems: 'center' },
    rowBottom: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' },
    input: {
        padding: '8px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '14px', fontWeight: 700,
        fontFamily: "var(--font-heebo), 'Heebo', sans-serif", outline: 'none',
    },
    del: { fontSize: '12px', fontWeight: 700, color: '#ff7575', background: 'none', border: 'none', cursor: 'pointer' },
    add: {
        width: '100%', padding: '11px', borderRadius: '10px', marginTop: '4px',
        background: 'rgba(200,168,78,0.12)', border: '1px dashed rgba(200,168,78,0.4)',
        color: '#f0d060', fontSize: '14px', fontWeight: 800, cursor: 'pointer',
        fontFamily: "var(--font-heebo), 'Heebo', sans-serif",
    },
    saveBar: {
        position: 'fixed', bottom: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 20px max(12px, env(safe-area-inset-bottom))',
        background: 'rgba(10,10,10,0.96)', borderTop: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(10px)', zIndex: 20,
    },
};
