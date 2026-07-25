import type { Metadata } from 'next';
import LegalPage, { Section } from '@/components/legal/LegalPage';

export const metadata: Metadata = {
    title: 'הצהרת נגישות · BariBali',
    description: 'הצהרת הנגישות של אפליקציית BariBali.',
};

// [להשלים] = accessibility coordinator details + confirmed audit date.
export default function AccessibilityPage() {
    return (
        <LegalPage title="נגישות" lastUpdated="25.7.2026">
            <p>
                בריאבלי (BariBali) רואה חשיבות רבה במתן שירות שוויוני ונגיש לכלל הלקוחות, לרבות אנשים עם מוגבלות.
                אנו פועלים להנגיש את האפליקציה בהתאם לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות)
                ולתקן הישראלי ת״י 5568, המבוסס על הנחיות WCAG ברמת AA.
            </p>

            <Section heading="מה הונגש">
                <p>• מבנה סמנטי, ניווט וטקסט חלופי לתמונות משמעותיות.</p>
                <p>• תמיכה בניווט מקלדת ובחיווי מיקוד (focus) גלוי.</p>
                <p>• ניגודיות צבעים מספקת וטקסט קריא.</p>
                <p>• כיבוד העדפת ״הפחתת תנועה״ (reduced motion) של המכשיר.</p>
                <p>• הודעות שגיאה בטפסים באופן נגיש.</p>
            </Section>

            <Section heading="הסתייגות">
                <p>
                    אנו משקיעים מאמץ מתמשך לשיפור הנגישות. ייתכן שחלקים מסוימים טרם הונגשו במלואם. אם נתקלת בקושי,
                    נשמח לסייע ולתקן.
                </p>
            </Section>

            <Section heading="רכז/ת נגישות ופניות">
                <p>לפניות בנושא נגישות ניתן לפנות אל: <strong>[שם רכז/ת הנגישות — להשלים]</strong>, טלפון 03-6557355, דוא״ל alonka382m@gmail.com. נטפל בפנייתך בהקדם.</p>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}><strong>[להשלים:]</strong> תאריך בדיקת הנגישות בפועל ופרטי בעל המקצוע שביצע אותה.</p>
            </Section>
        </LegalPage>
    );
}
