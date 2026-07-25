'use client';

import { useEffect, useState } from 'react';

interface Customer { userId: string; orders: number; total: number; last: string; email: string | null; name: string | null }
interface Data { customers: Customer[]; guests: { count: number; total: number } }

export default function CustomersTab() {
    const [data, setData] = useState<Data | null>(null);
    const [err, setErr] = useState('');

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

    if (err) return <div style={S.body}><div style={{ color: '#ff7575', fontWeight: 600 }}>{err}</div></div>;
    if (!data) return <div style={S.body}><div style={{ color: 'rgba(255,255,255,0.4)' }}>טוען…</div></div>;

    return (
        <div style={S.body}>
            <div style={S.summary}>
                <div><span style={S.big}>{data.customers.length}</span><span style={S.small}>לקוחות רשומים</span></div>
                <div><span style={S.big}>{data.guests.count}</span><span style={S.small}>הזמנות אורח</span></div>
                <div><span style={S.big}>₪{data.customers.reduce((s, c) => s + c.total, 0) + data.guests.total}</span><span style={S.small}>סה״כ מכירות</span></div>
            </div>

            {data.customers.length === 0 && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', padding: '12px 0' }}>אין עדיין לקוחות רשומים.</div>}

            {data.customers.map(c => (
                <div key={c.userId} style={S.card}>
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
            ))}
        </div>
    );
}

const S: Record<string, React.CSSProperties> = {
    body: { maxWidth: '620px', margin: '0 auto', padding: '18px 16px 40px' },
    summary: { display: 'flex', gap: '10px', marginBottom: '16px' },
    big: { display: 'block', fontSize: '20px', fontWeight: 900, color: '#fff' },
    small: { display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontWeight: 600 },
    card: {
        display: 'flex', alignItems: 'center', gap: '12px',
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px', padding: '12px 14px', marginBottom: '8px',
    },
};
