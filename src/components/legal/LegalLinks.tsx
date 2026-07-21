import Link from 'next/link';

/** Discreet privacy/terms link row, shown at auth touchpoints where data
 *  collection is introduced (login page, welcome step). */
export default function LegalLinks() {
    const style = { color: 'rgba(255,255,255,0.4)', textDecoration: 'underline', textUnderlineOffset: '2px' } as const;
    return (
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', marginTop: '6px' }}>
            <Link href="/privacy" style={style}>מדיניות פרטיות</Link>
            {' · '}
            <Link href="/terms" style={style}>תנאי שימוש</Link>
        </div>
    );
}
