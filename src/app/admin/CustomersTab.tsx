'use client';

import { useEffect, useMemo, useState } from 'react';
import { allDiscounts, type Discount } from '@/lib/discounts';

interface Customer { userId: string; orders: number; total: number; last: string; email: string | null; name: string | null; discountCode: string | null }
interface Data { customers: Customer[]; guests: { count: number; total: number } }

function discountLabel(d: Discount): string {
    const val = d.type === 'percent' ? `${d.value}%` : `₪${d.value}`;
    return `${d.note || d.code} · ${val}`;
}

export default function CustomersTab() {
    const [data, setData] = useState<Data | null>(null);
    const [err, setErr] = useState('');
    const [savingId, setSavingId] = useState<string | null>(null);
    const [tagErr, setTagErr] = useState('');

    // Active discount codes are the assignable "tags".
    const activeDiscounts = useMemo(() => allDiscounts().filter(d => d.active), []);

    useEffect(() => {
        let cancelled = false;
        fetch('/api/admin/customers')
            .then(async r => {
                if (r.ok) return r.json();
                const d = await r.json().catch(() => ({}));
                throw new Error(d.error || 'שגיאה');
            })
            .then(d => { if (!cancelled) setData(d as Data); })
            .catch(e => { if (!cancelled) setErr(e.message || 'שגיאה'); });
        return () => { cancelled = true; };
    }, []);

    async function saveTag(userId: string, code: string) {
        setSavingId(userId);
        setTagErr('');
        try {
            const res = await fetch('/api/admin/customer-tags', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, discountCode: code || null }),
            });
            const d = await res.json().catch(() => ({}));
            if (res.ok) {
                setData(prev => prev ? {
                    ...prev,
                    customers: prev.customers.map(c => c.userId === userId ? { ...c, discountCode: d.discountCode ?? null } : c),
                } : prev);
            } else {
                setTagErr(d.error || 'שמירת התגית נכשלה');
            }
        } catch {
            setTagErr('שמירת התגית נכשלה');
        }
        setSavingId(null);
    }

    if (err) return <div style={S.body}><div style={{ color: '#ff7575', fontWeight: 600 }}>{err}</div></div>;
    if (!data) return <div style={S.body}><div style={{ color: 'rgba(255,255,255,0.4)' }}>טוען…</div></div>;

    return (
        <div style={S.body}>
            <div style={S.summary}>
                <div><span style={S.big}>{data.customers.length}</span><span style={S.small}>לקוחות רשומים</span></div>
                <div><span style={S.big}>{data.guests.count}</span><span style={S.small}>הזמנות אורח</span></div>
                <div><span style={S.big}>₪{data.customers.reduce((s, c) => s + c.total, 0) + data.guests.total}</span><span style={S.small}>סה״כ מכירות</span></div>
            </div>

            <div style={S.note}>
                🏷️ תייג/י לקוח עם קוד הנחה — הוא יקבל אותו <b>אוטומטית בכל הזמנה</b> כשהוא מחובר לחשבון, בלי להקליד קוד.
                {activeDiscounts.length === 0 && <> <br />הגדר/י קודי הנחה בלשונית ״הנחות״ כדי שתוכל/י לתייג לקוחות.</>}
            </div>
            {tagErr && <div style={{ color: '#ff7575', fontSize: '12px', fontWeight: 600, marginBottom: '10px' }}>{tagErr}</div>}

            {data.customers.length === 0 && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', padding: '12px 0' }}>אין עדיין לקוחות רשומים.</div>}

            {data.customers.map(c => (
                <div key={c.userId} style={S.card}>
                    <div style={S.cardTop}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {c.name || c.email || 'משתמש'}
                            </div>
                            {c.email && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{c.email}</div>}
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                                הזמנה אחרונה: {new Date(c.last).toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })}
                            </div>
                        </div>
                        <div style={{ textAlign: 'left', flexShrink: 0 }}>
                            <div style={{ fontSize: '15px', fontWeight: 900, color: 'var(--color-gold-light)' }}>₪{c.total}</div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{c.orders} הזמנות</div>
                        </div>
                    </div>

                    {/* Standing-discount tag */}
                    <div style={S.tagRow}>
                        <span style={S.tagLabel}>🏷️ הטבה קבועה</span>
                        <select
                            value={c.discountCode ?? ''}
                            disabled={savingId === c.userId || activeDiscounts.length === 0}
                            onChange={e => saveTag(c.userId, e.target.value)}
                            style={{ ...S.select, ...(c.discountCode ? S.selectActive : {}) }}
                        >
                            <option value="">ללא הטבה</option>
                            {activeDiscounts.map(d => (
                                <option key={d.code} value={d.code}>{discountLabel(d)}</option>
                            ))}
                            {/* If the assigned code is no longer active, still show it so it isn't silently dropped. */}
                            {c.discountCode && !activeDiscounts.some(d => d.code === c.discountCode) && (
                                <option value={c.discountCode}>{c.discountCode} (לא פעיל)</option>
                            )}
                        </select>
                        {savingId === c.userId && <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>שומר…</span>}
                    </div>
                </div>
            ))}
        </div>
    );
}

const S: Record<string, React.CSSProperties> = {
    body: { maxWidth: '620px', margin: '0 auto', padding: '18px 16px 40px' },
    summary: { display: 'flex', gap: '10px', marginBottom: '14px' },
    big: { display: 'block', fontSize: '20px', fontWeight: 900, color: '#fff' },
    small: { display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontWeight: 600 },
    note: {
        fontSize: '12px', color: 'rgba(200,168,78,0.9)', fontWeight: 600, lineHeight: 1.6,
        background: 'rgba(200,168,78,0.08)', border: '1px solid rgba(200,168,78,0.2)',
        borderRadius: '10px', padding: '10px 12px', marginBottom: '12px',
    },
    card: {
        display: 'flex', flexDirection: 'column', gap: '10px',
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px', padding: '12px 14px', marginBottom: '8px',
    },
    cardTop: { display: 'flex', alignItems: 'center', gap: '12px' },
    tagRow: {
        display: 'flex', alignItems: 'center', gap: '8px',
        borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px',
    },
    tagLabel: { fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', flexShrink: 0 },
    select: {
        flex: 1, padding: '8px 10px', borderRadius: '8px',
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
        color: '#fff', fontSize: '13px', fontWeight: 700,
        fontFamily: 'var(--font-heebo), Heebo, sans-serif', outline: 'none', cursor: 'pointer',
    },
    selectActive: {
        background: 'rgba(125,211,125,0.12)', border: '1px solid rgba(125,211,125,0.4)', color: '#a5e8a5',
    },
};
