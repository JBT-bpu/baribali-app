'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PricesTab from './PricesTab';
import DiscountsTab from './DiscountsTab';
import CustomersTab from './CustomersTab';

type Tab = 'prices' | 'discounts' | 'customers';
const TABS: { id: Tab; label: string }[] = [
    { id: 'prices', label: 'מחירים' },
    { id: 'discounts', label: 'הנחות' },
    { id: 'customers', label: 'לקוחות' },
];

export default function AdminBoard() {
    const router = useRouter();
    const [tab, setTab] = useState<Tab>('prices');

    const logout = async () => {
        await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
        router.refresh();
    };

    return (
        <div style={S.root}>
            <div style={S.header}>
                <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--color-gold-light)' }}>🛠️ ניהול BariBali</div>
                <button type="button" onClick={logout} style={S.logout}>יציאה</button>
            </div>

            <div style={S.tabs}>
                {TABS.map(t => (
                    <button key={t.id} type="button" onClick={() => setTab(t.id)}
                        style={{ ...S.tab, ...(tab === t.id ? S.tabActive : {}) }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'prices' && <PricesTab />}
            {tab === 'discounts' && <DiscountsTab />}
            {tab === 'customers' && <CustomersTab />}
        </div>
    );
}

const S: Record<string, React.CSSProperties> = {
    root: {
        minHeight: '100vh', background: '#0a0a0a', color: '#fff',
        fontFamily: "var(--font-heebo), 'Heebo', sans-serif", direction: 'rtl',
    },
    header: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)',
        position: 'sticky', top: 0, background: 'rgba(10,10,10,0.96)', zIndex: 30,
    },
    logout: {
        fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.55)',
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
        padding: '5px 12px', borderRadius: '8px', cursor: 'pointer',
        fontFamily: "var(--font-heebo), 'Heebo', sans-serif",
    },
    tabs: {
        display: 'flex', gap: '4px', padding: '10px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky', top: '57px', background: 'rgba(10,10,10,0.96)', zIndex: 29,
    },
    tab: {
        flex: 1, padding: '9px 8px', borderRadius: '10px',
        background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
        color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontWeight: 800, cursor: 'pointer',
        fontFamily: "var(--font-heebo), 'Heebo', sans-serif",
    },
    tabActive: {
        background: 'rgba(200,168,78,0.16)', border: '1px solid rgba(200,168,78,0.5)',
        color: 'var(--color-gold-light)',
    },
};
