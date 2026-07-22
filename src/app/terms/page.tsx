import type { Metadata } from 'next';
import LegalPage, { Section } from '@/components/legal/LegalPage';

export const metadata: Metadata = {
    title: 'תנאי שימוש · BariBali',
    description: 'תנאי השימוש בשירות ההזמנות של BariBali.',
};

// NOTE: [bracketed] tokens are business-specific blanks — fill them in before
// relying on this page (business name, cancellation/refund policy, allergens,
// jurisdiction, contact).
export default function TermsPage() {
    return (
        <LegalPage title="תנאי שימוש" lastUpdated="[תאריך]">
            <p>
                תנאים אלו חלים על השימוש באפליקציית BariBali להזמנת אוכל לאיסוף עצמי, המופעלת על ידי
                <strong> [שם העסק המלא]</strong>. השימוש בשירות מהווה הסכמה לתנאים אלו.
            </p>

            <Section heading="1. השירות">
                <p>האפליקציה מאפשרת לבנות ולהזמין מנה לאיסוף עצמי בבית העסק. ניתן להזמין כאורח או באמצעות חשבון; חשבון נועד לשמירת היסטוריית הזמנות ואינו תנאי לביצוע הזמנה.</p>
            </Section>

            <Section heading="2. הזמנות">
                <p>עליך לספק פרטים נכונים ומדויקים (לרבות מספר טלפון תקין) לצורך ביצוע ההזמנה. הזמנה נחשבת כמאושרת לאחר קבלת אישור במערכת.</p>
            </Section>

            <Section heading="3. מחירים ותשלום">
                <p>המחירים נקובים בשקלים חדשים <strong>[כולל/לא כולל]</strong> מע&quot;מ. התשלום מתבצע דרך ספק סליקה חיצוני מאובטח (<strong>[Hyp / שם הספק]</strong>), או במזומן/כרטיס בעת האיסוף, בהתאם לאפשרות שנבחרה.</p>
            </Section>

            <Section heading="4. איסוף">
                <p>ההזמנה מיועדת לאיסוף עצמי בכתובת <strong>[כתובת בית העסק]</strong> בזמן האיסוף שנבחר. זמני האיסוף הם הערכה; ייתכנו עיכובים בשעות עומס.</p>
            </Section>

            <Section heading="5. ביטולים והחזרים">
                <p><strong>[יש למלא מדיניות ביטול והחזר בהתאם לחוק הגנת הצרכן — למשל: ניתן לבטל הזמנה עד X דקות לפני זמן האיסוף בפנייה לטלפון של בית העסק; החזר יינתן באופן Y.]</strong></p>
            </Section>

            <Section heading="6. תפריט וזמינות">
                <p>הפריטים, המרכיבים והמחירים עשויים להשתנות מעת לעת. ייתכן שפריט מסוים לא יהיה זמין; במקרה כזה ניצור עמך קשר.</p>
            </Section>

            <Section heading="7. אלרגנים ומידע תזונתי">
                <p><strong>[יש למלא הצהרת אלרגנים — למשל: המנות מוכנות במטבח שבו מעובדים אגוזים, גלוטן, שומשום, ביצים ומוצרי חלב; ייתכן מגע צולב. באחריות הלקוח לוודא התאמה לרגישויות/אלרגיות.]</strong> המידע התזונתי המוצג הוא הערכה בלבד.</p>
            </Section>

            <Section heading="8. הגבלת אחריות">
                <p>השירות ניתן כמות שהוא (&quot;AS IS&quot;). במידה המרבית המותרת בחוק, לא נישא באחריות לנזק עקיף או תוצאתי הנובע מהשימוש בשירות, מלבד האחריות המוטלת עלינו לפי דין.</p>
            </Section>

            <Section heading="9. קניין רוחני">
                <p>כל התכנים, העיצובים והסימנים המסחריים באפליקציה הם קניינם של <strong>[שם העסק]</strong> ואין לעשות בהם שימוש ללא רשות.</p>
            </Section>

            <Section heading="10. שינויים בתנאים">
                <p>אנו רשאים לעדכן תנאים אלו מעת לעת. הגרסה המעודכנת תפורסם בעמוד זה עם תאריך העדכון.</p>
            </Section>

            <Section heading="11. דין וסמכות שיפוט">
                <p>על תנאים אלו יחולו דיני מדינת ישראל, וסמכות השיפוט הבלעדית תהיה לבתי המשפט המוסמכים ב<strong>[עיר]</strong>.</p>
            </Section>

            <Section heading="12. יצירת קשר">
                <p><strong>[שם העסק]</strong> · <strong>[אימייל]</strong> · <strong>[טלפון]</strong></p>
            </Section>
        </LegalPage>
    );
}
