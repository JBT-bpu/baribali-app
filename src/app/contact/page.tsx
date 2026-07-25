import type { Metadata } from 'next';
import LegalPage, { Section } from '@/components/legal/LegalPage';

export const metadata: Metadata = {
    title: 'יצירת קשר · BariBali',
    description: 'פרטי יצירת קשר עם בריאבלי (BariBali).',
};

export default function ContactPage() {
    return (
        <LegalPage title="יצירת קשר" lastUpdated="25.7.2026">
            <Section heading="בריאבלי (BariBali)">
                <p>עוסק מורשה מס׳ <strong>[מספר עוסק מורשה — להשלים]</strong></p>
                <p>כתובת: אבן גבירול 61, תל אביב–יפו</p>
                <p>טלפון: <a href="tel:03-6557355" style={{ color: 'var(--color-gold-light)' }}>03-6557355</a></p>
                <p>דוא״ל: <a href="mailto:alonka382m@gmail.com" style={{ color: 'var(--color-gold-light)' }}>alonka382m@gmail.com</a></p>
            </Section>

            <Section heading="פניות">
                <p>לפניות בנושא הזמנה, ביטול, פרטיות או נגישות — ניתן ליצור קשר בטלפון או בדוא״ל שלמעלה. נשמח לעזור.</p>
            </Section>
        </LegalPage>
    );
}
