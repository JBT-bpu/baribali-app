// ─── DATA ───────────────────────────────────────────────────

export const STEPS = [
    {
        id: "veggies", title: "בחרו ירקות", subtitle: "כמה שרוצים", emoji: "🥗",
        intro: "בחרו את הבסיס והירקות לסלט — אין הגבלה!",
        subgroups: [
            {
                label: "עלים ובסיס", shortLabel: "עלים", layer: "base", items: [
                    { id: "lettuce", he: "חסה", icon: "🥬", price: 0, tags: ["green", "base", "fiber"], desc: "חסה ירוקה פריכה" },
                    { id: "baby_leaf", he: "עלה בייבי", icon: "🌿", price: 0, tags: ["green", "base"], desc: "תערובת עלים רכים" },
                    { id: "cabbage_white", he: "כרוב לבן", icon: "🥬", price: 0, tags: ["white", "crunch", "fiber"], desc: "כרוב חתוך דק" },
                    { id: "cabbage_purple", he: "כרוב סגול", icon: "🟣", price: 0, tags: ["purple", "crunch"], desc: "כרוב סגול פריך" },
                    { id: "sprouts", he: "נבטים", icon: "🌱", price: 0, tags: ["green", "crunch"], desc: "נבטי חיטה טריים" },
                ]
            },
            {
                label: "ירקות טריים", shortLabel: "טריים", layer: "fill", items: [
                    { id: "tomato", he: "עגבניות", icon: "🍅", price: 0, tags: ["red", "fresh"], desc: "עגבניות שרי חתוכות" },
                    { id: "cucumber", he: "מלפפון", icon: "🥒", price: 0, tags: ["green", "fresh", "crunch"], desc: "מלפפון חתוך קוביות" },
                    { id: "bell_pepper", he: "גמבה", icon: "🌶️", price: 0, tags: ["green", "crunch", "fresh"], desc: "פלפל צבעוני חתוך" },
                    { id: "carrot", he: "גזר", icon: "🥕", price: 0, tags: ["orange", "crunch", "fiber"], desc: "גזר מגורד טרי" },
                    { id: "red_onion", he: "בצל סגול", icon: "🧅", price: 0, tags: ["purple", "flavor"], desc: "טבעות בצל סגול" },
                    { id: "green_onion", he: "בצל ירוק", icon: "🧅", price: 0, tags: ["green", "flavor"], desc: "בצל ירוק קצוץ" },
                    { id: "radish", he: "צנון", icon: "🔴", price: 0, tags: ["red", "crunch", "spicy"], desc: "צנון חריף פרוס" },
                    { id: "celery", he: "סלרי", icon: "🥬", price: 0, tags: ["green", "crunch"], desc: "סלרי פריך חתוך" },
                    { id: "fresh_beet", he: "סלק טרי", icon: "🟤", price: 0, tags: ["red", "sweet"], desc: "סלק טרי מגורד" },
                    { id: "mushrooms", he: "פטריות", icon: "🍄", price: 0, tags: ["brown", "protein"], desc: "פטריות שמפיניון" },
                    { id: "corn", he: "תירס", icon: "🌽", price: 0, tags: ["yellow", "sweet"], desc: "גרגרי תירס מתוקים" },
                    { id: "green_peas", he: "אפונה", icon: "🟢", price: 0, tags: ["green", "protein"], desc: "אפונה ירוקה" },
                    { id: "hot_pepper", he: "חריף", icon: "🌶️", price: 0, tags: ["red", "spicy"], desc: "פלפל חריף טרי 🔥" },
                ]
            },
            {
                label: "דגנים וקטניות", shortLabel: "דגנים", layer: "grain", items: [
                    { id: "quinoa", he: "קינואה", icon: "🌾", price: 2, tags: ["grain", "protein", "fiber"], desc: "קינואה מבושלת +₪2" },
                    { id: "brown_rice", he: "אורז מלא", icon: "🍚", price: 0, tags: ["grain", "fiber"], desc: "אורז מלא מבושל" },
                    { id: "bulgur", he: "בורגול", icon: "🌾", price: 0, tags: ["grain", "fiber"], desc: "בורגול עדין" },
                    { id: "black_lentils", he: "עדשים שחורות", icon: "⚫", price: 0, tags: ["protein", "fiber", "grain"], desc: "עדשים שחורות מבושלות" },
                    { id: "green_lentils", he: "עדשים ירוקות", icon: "🟢", price: 0, tags: ["protein", "fiber", "grain"], desc: "עדשים ירוקות מבושלות" },
                    { id: "chickpeas", he: "חומוס", icon: "🥜", price: 0, tags: ["protein", "fiber"], desc: "גרגירי חומוס שלמים" },
                    { id: "fusilli_pasta", he: "פסטה", icon: "🍝", price: 0, tags: ["grain"], desc: "פסטה מסולסלת מבושלת" },
                ]
            },
            {
                label: "אפויים", shortLabel: "אפויים", layer: "warm", items: [
                    { id: "roasted_eggplant", he: "חציל קלוי", icon: "🍆", price: 0, tags: ["warm", "flavor"], desc: "חציל קלוי בתנור" },
                    { id: "baked_sweet_potato", he: "בטטה", icon: "🍠", price: 0, tags: ["orange", "warm", "sweet", "fiber"], desc: "בטטה אפויה מתוקה" },
                    { id: "baked_potato", he: 'תפו"א אפוי', icon: "🥔", price: 0, tags: ["warm", "grain"], desc: "תפוח אדמה אפוי" },
                ]
            },
            {
                label: "תוספים", shortLabel: "תוספים", layer: "topping", items: [
                    { id: "cilantro", he: "כוסברה", icon: "🌿", price: 0, tags: ["green", "herb", "flavor"], desc: "כוסברה טרייה קצוצה" },
                    { id: "parsley", he: "פטרוזיליה", icon: "🌿", price: 0, tags: ["green", "herb"], desc: "פטרוזיליה טרייה" },
                    { id: "pickles", he: "חמוצים", icon: "🥒", price: 0, tags: ["crunch", "flavor"], desc: "מלפפון חמוץ חתוך" },
                    { id: "cranberries", he: "חמוציות", icon: "🔴", price: 0, tags: ["red", "sweet"], desc: "חמוציות מיובשות" },
                    { id: "black_olives", he: "זיתים שחורים", icon: "⚫", price: 0, tags: ["fat", "flavor"], desc: "זיתים שחורים פרוסים" },
                    { id: "green_olives", he: "זיתים ירוקים", icon: "🍃", price: 0, tags: ["green", "fat", "flavor"], desc: "זיתים ירוקים" },
                    { id: "sunflower_seeds", he: "גרעינים", icon: "🌻", price: 0, tags: ["crunch", "fat", "protein"], desc: "גרעיני חמנייה" },
                    { id: "sesame", he: "שומשום", icon: "⚪", price: 0, tags: ["crunch", "fat"], desc: "שומשום גולמי" },
                    { id: "chia", he: "צ'יה", icon: "⚫", price: 0, tags: ["fiber", "fat"], desc: "זרעי צ'יה" },
                    { id: "zaatar", he: "זעתר", icon: "🌿", price: 0, tags: ["herb", "flavor"], desc: "תערובת זעתר" },
                ]
            },
        ],
    },
    {
        id: "protein", title: "תוספת כלולה", subtitle: "אחת כלולה", emoji: "🥚", maxPicks: 1,
        intro: "בחרו תוספת חלבון אחת — כלולה במחיר הסלט",
        subgroups: [{
            label: null, items: [
                { id: "egg", he: "ביצה קשה", icon: "🥚", price: 0, tags: ["protein"], desc: "ביצה קשה חתוכה" },
                { id: "tuna", he: "טונה", icon: "🐟", price: 0, tags: ["protein", "omega"], desc: "טונה בשמן" },
                { id: "tofu_olive", he: "טופו שמן זית", icon: "🥦", price: 0, tags: ["protein", "vegan"], desc: "טופו מוקפץ בשמן זית, מלח ופלפל" },
                { id: "feta5", he: "פטה 5%", icon: "🧀", price: 0, tags: ["protein", "dairy"], desc: "גבינת פטה 5% אחוז שומן" },
                { id: "baby_mozzarella", he: "מוצרלה", icon: "🧈", price: 0, tags: ["protein", "dairy"], desc: "כדורי בייבי מוצרלה" },
            ]
        }],
    },
    {
        id: "sauces", title: "רטבים", subtitle: "עד 2", emoji: "🥣", maxPicks: 2,
        intro: "הוסיפו עד 2 רטבים לסלט",
        subgroups: [
            {
                label: "קלאסיים", items: [
                    { id: "olive_oil", he: "שמן זית", icon: "🌿", price: 3, tags: ["fat", "classic"], desc: "שמן זית כתית מעולה" },
                    { id: "lemon", he: "לימון טרי", icon: "🍋", price: 3, tags: ["fresh", "classic"], desc: "מיץ לימון סחוט טרי" },
                    { id: "tahini", he: "טחינה", icon: "🥣", price: 3, tags: ["fat", "classic"], desc: "טחינה גולמית" },
                    { id: "balsamic", he: "בלסמי", icon: "🍷", price: 3, tags: ["sweet", "classic"], desc: "חומץ בלסמי" },
                ]
            },
            {
                label: "מיוחדים", items: [
                    { id: "thousand", he: "אלף האיים", icon: "🥫", price: 3, tags: [], desc: "רוטב אלף האיים קרמי" },
                    { id: "garlic_s", he: "רוטב שום", icon: "🧄", price: 3, tags: ["flavor"], desc: "רוטב שום קרמי" },
                    { id: "citrus_vin", he: "ויניגרט הדרים", icon: "🍊", price: 3, tags: ["fresh"], desc: "ויניגרט עם הדרים טריים" },
                    { id: "sweet_chili", he: "צ'ילי מתוק", icon: "🌶️", price: 3, tags: ["spicy", "sweet"], desc: "רוטב צ'ילי מתוק תאילנדי" },
                    { id: "teriyaki", he: "טריאקי", icon: "🍶", price: 3, tags: ["sweet"], desc: "רוטב טריאקי יפני" },
                    { id: "soy_s", he: "סויה", icon: "🥢", price: 3, tags: [], desc: "רוטב סויה סיני" },
                    { id: "caesar", he: "קיסר", icon: "🥗", price: 5, tags: [], desc: "רוטב קיסר קלאסי ₪5" },
                    { id: "pesto", he: "פסטו", icon: "🌿", price: 4, tags: ["herb"], desc: "פסטו בזיליקום ₪4" },
                    { id: "zhug", he: "סחוג", icon: "🔥", price: 4, tags: ["spicy"], desc: "סחוג תימני חריף 🔥 ₪4" },
                ]
            },
        ],
    },
    {
        id: "finish", title: "ערבוב ולחם", subtitle: "כמעט סיימנו!", emoji: "🍞",
        intro: "איך תרצו את הסלט?",
        subgroups: [
            {
                label: "ערבוב", items: [
                    { id: "mix_no_sauce", he: "לערבב ללא רוטב", icon: "🔄", price: 0, tags: [], desc: "נערבב את הסלט, הרוטב בצד" },
                    { id: "no_mix", he: "לא לערבב", icon: "✋", price: 0, tags: [], desc: "המרכיבים מסודרים בנפרד" },
                ]
            },
            {
                label: "לצד הסלט", items: [
                    { id: "bread", he: "עם לחם", icon: "🍞", price: 0, tags: [], desc: "פרוסת לחם טרי" },
                    { id: "croutons_s", he: "קרוטונים", icon: "🥖", price: 0, tags: ["crunch"], desc: "קרוטונים פריכים" },
                    { id: "none_side", he: "ללא", icon: "🚫", price: 0, tags: [], desc: "בלי תוספת צד" },
                ]
            },
        ],
    },
    {
        id: "upgrade", title: "שדרוג?", subtitle: "תוספות פרימיום", emoji: "👑",
        intro: "אפשר לדלג — או לשדרג עם תוספות מיוחדות",
        subgroups: [{
            label: null, items: [
                { id: "halloumi_p", he: "חלומי", icon: "🧀", price: 12, tags: ["protein"], pop: true, desc: "גבינת חלומי צלויה" },
                { id: "tofu_teri_p", he: "טופו טריאקי", icon: "🥦", price: 10, tags: ["protein", "vegan"], desc: "טופו מוקפץ ברוטב טריאקי" },
                { id: "tuna_p", he: "טונה", icon: "🐟", price: 7, tags: ["protein"], desc: "מנת טונה נוספת" },
                { id: "feta_p", he: "פטה", icon: "🧀", price: 7, tags: ["protein"], desc: "גבינת פטה נוספת" },
                { id: "egg_p", he: "ביצה", icon: "🥚", price: 5, tags: ["protein"], desc: "ביצה קשה נוספת" },
                { id: "parmesan_p", he: "פרמז'ן", icon: "🧀", price: 4, tags: ["flavor"], desc: "שבבי פרמז'ן" },
                { id: "honey_p", he: "דבש", icon: "🍯", price: 4, tags: ["sweet"], desc: "דבש טבעי" },
                { id: "jala_p", he: "ג'עלה", icon: "🥜", price: 4, tags: ["crunch"], desc: "ג'עלה פריכה" },
                { id: "bread_p", he: "לחם נוסף", icon: "🍞", price: 4, tags: [], desc: "פרוסת לחם נוספת" },
                { id: "croutons_p", he: "קרוטונים", icon: "🥖", price: 3, tags: ["crunch"], desc: "מנת קרוטונים נוספת" },
            ]
        }],
    },
];

export const BASE = 54;

// ─── NUTRITION DATABASE ─────────────────────────────────────
// Real values per typical salad portion (~40-80g depending on item)
// kcal, protein(g), carbs(g), fat(g), fiber(g), plus a fun fact
export const NUTRI = {
    // ── Leaves & base ──
    lettuce: { kcal: 8, p: 0.6, c: 1.5, f: 0.1, fb: 0.6, fact: "החסה היא מהירקות הראשונים שאנשים גידלו — כבר לפני 4,500 שנה במצרים העתיקה" },
    baby_leaf: { kcal: 12, p: 1.0, c: 1.8, f: 0.2, fb: 0.9, fact: "עלי בייבי נקטפים תוך 21 יום בלבד מהשתילה — הם הירק הצעיר ביותר בצלחת" },
    cabbage_white: { kcal: 18, p: 1.0, c: 4.0, f: 0.1, fb: 1.8, fact: "ברוסיה, כרוב כבוש הוא המרכיב הלאומי — הם צורכים כ-20 קילו לאדם בשנה" },
    cabbage_purple: { kcal: 22, p: 1.1, c: 5.0, f: 0.2, fb: 1.6, fact: "הצבע הסגול מגיע מאנתוציאנינים — אותם נוגדי חמצון שנמצאים גם ביין אדום" },
    sprouts: { kcal: 15, p: 1.8, c: 1.5, f: 0.1, fb: 0.8, fact: "נבטים מכילים פי 100 יותר אנזימים מירקות בוגרים — הם מפעל תזונה זעיר" },
    // ── Fresh veggies ──
    tomato: { kcal: 14, p: 0.7, c: 3.0, f: 0.2, fb: 0.9, fact: "עד המאה ה-18, אירופאים חשבו שעגבניות רעילות וגידלו אותן רק לנוי" },
    cucumber: { kcal: 8, p: 0.4, c: 1.8, f: 0.1, fb: 0.3, fact: "מלפפון מכיל 96% מים — מרטיב יותר מכוס מים כי מכיל גם אלקטרוליטים" },
    bell_pepper: { kcal: 20, p: 0.7, c: 4.5, f: 0.2, fb: 1.3, fact: "גמבה אדומה מכילה פי 3 יותר ויטמין C מתפוז — היא אלופת הויטמינים" },
    carrot: { kcal: 25, p: 0.6, c: 5.8, f: 0.1, fb: 1.7, fact: "גזרים היו במקור סגולים — הגזר הכתום פותח בהולנד לכבוד בית המלוכה" },
    red_onion: { kcal: 16, p: 0.4, c: 3.6, f: 0.1, fb: 0.6, fact: "בצל סגול מכיל כמות כפולה של נוגדי חמצון בהשוואה לבצל לבן" },
    green_onion: { kcal: 5, p: 0.3, c: 1.0, f: 0.1, fb: 0.4, fact: "בצל ירוק הוא הירק הוותיק ביותר בסין — מגדלים אותו שם כבר 5,000 שנה" },
    radish: { kcal: 10, p: 0.4, c: 2.0, f: 0.1, fb: 1.0, fact: "הצנון שייך למשפחת הכרוביים — הוא קרוב משפחה של ברוקולי וכרובית" },
    celery: { kcal: 6, p: 0.3, c: 1.2, f: 0.1, fb: 0.8, fact: "ללעוס סלרי שורף יותר קלוריות מאשר הסלרי עצמו מכיל — הוא מזון עם קלוריות שליליות" },
    fresh_beet: { kcal: 28, p: 0.8, c: 6.0, f: 0.1, fb: 1.4, fact: "סלק מכיל ניטראטים טבעיים שמגבירים זרימת דם — ספורטאים שותים מיץ סלק לפני תחרויות" },
    mushrooms: { kcal: 15, p: 2.2, c: 1.5, f: 0.2, fb: 0.7, fact: "פטריות הן לא צמחים ולא בעלי חיים — הן ממלכה ביולוגית נפרדת לגמרי" },
    corn: { kcal: 55, p: 2.0, c: 12, f: 0.7, fb: 1.2, fact: "לכל קלח תירס יש תמיד מספר זוגי של שורות גרגרים — בדרך כלל 16" },
    green_peas: { kcal: 45, p: 3.0, c: 8.0, f: 0.2, fb: 2.5, fact: "גרגור מנדל גילה את חוקי התורשה הגנטית בזכות ניסויים באפונה ב-1866" },
    hot_pepper: { kcal: 6, p: 0.3, c: 1.2, f: 0.1, fb: 0.4, fact: "קפסאיצין, החומר החריף, גורם למוח לשחרר אנדורפינים — לכן חריף ממכר" },
    // ── Grains & legumes ──
    quinoa: { kcal: 90, p: 3.5, c: 16, f: 1.5, fb: 2.2, fact: "קינואה היא לא דגן אלא זרע — קרובת משפחה של תרד ומנגולד" },
    brown_rice: { kcal: 82, p: 1.8, c: 17, f: 0.7, fb: 1.4, fact: "אורז מלא שומר על קליפת הסובין שמכילה 60% מהמינרלים שבגרגר" },
    bulgur: { kcal: 76, p: 2.8, c: 15, f: 0.2, fb: 3.2, fact: "בורגול הוא מהמזונות המעובדים הוותיקים בעולם — כבר לפני 4,000 שנה" },
    black_lentils: { kcal: 80, p: 6.5, c: 12, f: 0.3, fb: 4.0, fact: "עדשים שחורות נקראות גם בלוגה בגלל דמיונן לקוויאר — מכילות הכי הרבה ברזל" },
    green_lentils: { kcal: 75, p: 6.0, c: 12, f: 0.3, fb: 3.8, fact: "עדשים הן הקטנייה הכי מהירה לבישול — לא דורשות השרייה ומוכנות ב-20 דקות" },
    chickpeas: { kcal: 95, p: 5.5, c: 15, f: 1.8, fb: 4.5, fact: "חומוס מגדלים ביותר מ-50 מדינות — הודו מייצרת 70% מהחומוס בעולם" },
    fusilli_pasta: { kcal: 95, p: 3.5, c: 19, f: 0.5, fb: 1.0, fact: "הצורה המסולסלת של פוזילי תוכננה כדי ללכוד רוטב בתוך הספירלות" },
    // ── Baked ──
    roasted_eggplant: { kcal: 35, p: 0.8, c: 5.0, f: 1.5, fb: 2.0, fact: "חציל הוא בוטנית פרי ולא ירק — הוא שייך למשפחת הסולניים כמו עגבנייה" },
    baked_sweet_potato: { kcal: 65, p: 1.0, c: 15, f: 0.1, fb: 2.5, fact: "בטטה כתומה מכילה בטא-קרוטן שהגוף הופך לויטמין A — מספיק מנה אחת ליום" },
    baked_potato: { kcal: 70, p: 1.5, c: 16, f: 0.1, fb: 1.5, fact: "תפוח אדמה היה הירק הראשון שגדל בחלל — על מעבורת קולומביה ב-1995" },
    // ── Toppings ──
    cilantro: { kcal: 2, p: 0.2, c: 0.3, f: 0.0, fb: 0.2, fact: "ל-14% מהאוכלוסייה יש גן שגורם לכוסברה להרגיש כמו סבון — זה גנטי לגמרי" },
    parsley: { kcal: 4, p: 0.3, c: 0.6, f: 0.1, fb: 0.3, fact: "פטרוזיליה מכילה יותר ויטמין C מלימון — כפית אחת נותנת 5% מהצריכה היומית" },
    pickles: { kcal: 8, p: 0.3, c: 1.5, f: 0.1, fb: 0.5, fact: "קליאופטרה האמינה שמלפפונים חמוצים שומרים על יופי — והפכה אותם לחלק מתפריטה" },
    cranberries: { kcal: 45, p: 0.1, c: 11, f: 0.2, fb: 0.8, fact: "חמוציות צפות על פני המים — לכן קוטפים אותן על ידי הצפת השדות" },
    black_olives: { kcal: 36, p: 0.3, c: 1.5, f: 3.2, fb: 0.8, fact: "עצי זית יכולים לחיות אלפי שנים — יש עצים ביוון שגילם מעל 3,000 שנה" },
    green_olives: { kcal: 30, p: 0.3, c: 1.0, f: 2.8, fb: 0.9, fact: "זית ירוק וזית שחור הם אותו פרי בדיוק — ההבדל הוא רק מועד הקטיף" },
    sunflower_seeds: { kcal: 90, p: 3.2, c: 3.0, f: 7.5, fb: 1.3, fact: "חמניות עוקבות אחרי השמש במהלך היום — תופעה שנקראת הליוטרופיזם" },
    sesame: { kcal: 85, p: 2.5, c: 3.5, f: 7.0, fb: 1.7, fact: "שומשום הוא אחד הגידולים הוותיקים בעולם — מוזכר בפפירוסים מצריים מלפני 3,500 שנה" },
    chia: { kcal: 70, p: 2.5, c: 6.0, f: 4.5, fb: 5.0, fact: "זרעי צ'יה סופחים פי 12 מנפחם מים — רצים אצטקים אכלו אותם למרחקים ארוכים" },
    zaatar: { kcal: 10, p: 0.5, c: 1.5, f: 0.5, fb: 0.8, fact: "זעתר הוא עשב קדוש בתרבות הערבית — אמהות היו מורחות אותו על ראש תינוקות לברכה" },
    // ── Proteins ──
    egg: { kcal: 78, p: 6.3, c: 0.6, f: 5.3, fb: 0, fact: "ביצה קשה מכילה את כל 9 חומצות האמינו החיוניות — היא חלבון מושלם מהטבע" },
    tuna: { kcal: 90, p: 20, c: 0, f: 1.0, fb: 0, fact: "טונה יכולה לשחות במהירות של 75 קמ\"ש — היא אחד הדגים המהירים באוקיינוס" },
    tofu_olive: { kcal: 85, p: 8.0, c: 2.0, f: 5.0, fb: 0.3, fact: "טופו הומצא בסין לפני 2,000 שנה — לפי האגדה, בטעות כשחלב סויה התקרש" },
    feta5: { kcal: 55, p: 7.0, c: 1.0, f: 2.5, fb: 0, fact: "פטה 5% פותחה בישראל — ברוב העולם פטה מכילה 20-25% שומן" },
    baby_mozzarella: { kcal: 70, p: 6.0, c: 0.5, f: 5.0, fb: 0, fact: "מוצרלה אמיתית מיוצרת מחלב תאואים — גבינת בופלה קמפנית שמוגנת באיטליה" },
    // ── Sauces (per tablespoon ~15ml) ──
    olive_oil: { kcal: 120, p: 0, c: 0, f: 14, fb: 0, fact: "שמן זית כתית מעולה מכיל אולאוקנתל — חומר אנטי דלקתי שפועל כמו איבופרופן" },
    lemon: { kcal: 4, p: 0.1, c: 1.3, f: 0, fb: 0, fact: "לימון נקי שומנים ושיט — מלחים בריטים אכלו אותו למניעת צפדינה ולכן נקראו לימיז" },
    tahini: { kcal: 90, p: 2.6, c: 3.0, f: 8.0, fb: 0.7, fact: "טחינה היא המזון עם הכי הרבה סידן מהצומח — יותר מחלב ביחס למשקל" },
    balsamic: { kcal: 14, p: 0.1, c: 2.7, f: 0, fb: 0, fact: "בלסמי מסורתי ממודנה מיושן 12-25 שנה בחביות — בקבוק יכול לעלות מאות יורו" },
    thousand: { kcal: 60, p: 0.2, c: 4.0, f: 5.0, fb: 0, fact: "אלף האיים נקרא כך על שם איי Thousand Islands בגבול ארה\"ב-קנדה" },
    garlic_s: { kcal: 55, p: 0.3, c: 2.0, f: 5.0, fb: 0, fact: "שום הוא קרוב משפחה של שושן — הפרח שלו יפהפה ולבן" },
    citrus_vin: { kcal: 45, p: 0.1, c: 3.0, f: 3.5, fb: 0, fact: "ויניגרט הוא הרוטב הצרפתי הקלאסי ביותר — השם מגיע מ-vinaigre (חומץ)" },
    sweet_chili: { kcal: 40, p: 0.2, c: 9.0, f: 0.1, fb: 0.1, fact: "רוטב צ'ילי מתוק מקורו בתאילנד — שם הוא נקרא נאם צ'ים גאי ומגישים אותו עם כל דבר" },
    teriyaki: { kcal: 35, p: 0.5, c: 7.0, f: 0, fb: 0, fact: "טריאקי בעברית ביפנית פירושו ברק — מתאר את הזיגוג המבריק שהרוטב יוצר" },
    soy_s: { kcal: 8, p: 1.0, c: 1.0, f: 0, fb: 0, fact: "רוטב סויה הומצא בסין לפני 2,200 שנה — הוא אחד התבלינים הנפוצים ביותר בעולם" },
    caesar: { kcal: 80, p: 0.5, c: 0.5, f: 8.5, fb: 0, fact: "רוטב קיסר הומצא ב-1924 בטיחואנה, מקסיקו — על ידי שף איטלקי-אמריקאי, לא ברומא" },
    pesto: { kcal: 75, p: 1.5, c: 1.0, f: 7.0, fb: 0.3, fact: "פסטו מקורי מג'נובה מכיל בזיליקום, צנובר, שום, פרמז'ן ושמן זית — בלי שום דבר אחר" },
    zhug: { kcal: 15, p: 0.3, c: 1.5, f: 1.0, fb: 0.5, fact: "סחוג הוא תימני — עולי תימן הביאו אותו לישראל והוא הפך למוצר ישראלי קלאסי" },
    // ── Finish ──
    mix_no_sauce: { kcal: 0, p: 0, c: 0, f: 0, fb: 0, fact: "ערבוב סלט מפזר את הרוטב באופן שווה ומפחית צורך בכמות רוטב גדולה" },
    no_mix: { kcal: 0, p: 0, c: 0, f: 0, fb: 0, fact: "סלט לא מעורבב נשמר פריך יותר זמן — הרוטב לא מרכך את העלים" },
    bread: { kcal: 70, p: 2.5, c: 13, f: 0.8, fb: 0.7, fact: "לחם הוא מהמזונות הוותיקים ביותר — מצאו שרידי לחם בן 14,000 שנה בירדן" },
    croutons_s: { kcal: 55, p: 1.0, c: 8.0, f: 2.5, fb: 0.3, fact: "קרוטונים הומצאו כדי למנוע בזבוז לחם ישן — מילה צרפתית שמשמעה פריך" },
    none_side: { kcal: 0, p: 0, c: 0, f: 0, fb: 0, fact: "" },
    // ── Premium upgrades ──
    halloumi_p: { kcal: 110, p: 7.0, c: 1.0, f: 9.0, fb: 0, fact: "חלומי מקורו בקפריסין ומוגן כ-PDO באיחוד האירופי — רק שם מותר לייצר חלומי אמיתי" },
    tofu_teri_p: { kcal: 95, p: 8.0, c: 4.0, f: 5.0, fb: 0.3, fact: "טופו סופח טעמים כמו ספונג — לכן הוא מושלם לצליה עם רטבים חזקים כמו טריאקי" },
    tuna_p: { kcal: 90, p: 20, c: 0, f: 1.0, fb: 0, fact: "טונה צהובת סנפיר יכולה לגדול עד 2.5 מטר ולשקול 200 קילו" },
    feta_p: { kcal: 55, p: 7.0, c: 1.0, f: 2.5, fb: 0, fact: "גבינת פטה מוזכרת באודיסאה של הומרוס — הקיקלופ פוליפמוס ייצר אותה" },
    egg_p: { kcal: 78, p: 6.3, c: 0.6, f: 5.3, fb: 0, fact: "תרנגולת מטילה כ-300 ביצים בשנה — כמעט ביצה אחת כל יום" },
    parmesan_p: { kcal: 55, p: 5.0, c: 0.5, f: 3.8, fb: 0, fact: "פרמז'ן מיושן לפחות 12 חודשים — גלגל שלם שוקל כ-40 קילו ושווה אלפי יורו" },
    honey_p: { kcal: 45, p: 0, c: 12, f: 0, fb: 0, fact: "דבש הוא המזון היחיד שלא מתקלקל לעולם — מצאו דבש בן 3,000 שנה בפירמידות" },
    jala_p: { kcal: 85, p: 2.0, c: 6.0, f: 6.0, fb: 0.8, fact: "ג'עלה היא חטיף ערבי עתיק מבצק פילו ופיסטוק — השם מגיע מהטורקית" },
    bread_p: { kcal: 70, p: 2.5, c: 13, f: 0.8, fb: 0.7, fact: "ישראל היא מהמדינות עם הצריכה הגבוהה ביותר של לחם לנפש בעולם" },
    croutons_p: { kcal: 55, p: 1.0, c: 8.0, f: 2.5, fb: 0.3, fact: "קרוטונים פופולריים בצרפת מהמאה ה-17 — במקור נקראו croûte (קרום)" },
};

// ─── COMBO BADGES ───────────────────────────────────────────

export const COMBOS = [
    { id: "protein_power", icon: "💪", he: "עשיר בחלבון", check: tags => tags.filter(t => t === "protein").length >= 3 },
    {
        id: "rainbow", icon: "🌈", he: "צבעוני!", check: (_, items) => {
            const c = new Set(items.flatMap(i => (i.tags || []).filter(t => ["red", "green", "orange", "purple", "yellow", "white", "brown"].includes(t))));
            return c.size >= 4;
        }
    },
    {
        id: "vegan", icon: "🌱", he: "טבעוני", check: (_, items) => {
            const noAnimal = !items.some(i => ["egg", "tuna", "feta5", "baby_mozzarella", "tuna_p", "feta_p", "egg_p", "halloumi_p", "parmesan_p"].includes(i.id));
            return items.length >= 4 && noAnimal && !items.some(i => (i.tags || []).includes("dairy"));
        }
    },
    { id: "fiber_bomb", icon: "🌾", he: "סיבים!", check: tags => tags.filter(t => t === "fiber").length >= 4 },
    { id: "spicy", icon: "🔥", he: "חריף!", check: tags => tags.filter(t => t === "spicy").length >= 2 },
    { id: "crunchy", icon: "🥜", he: "קראנצ'י", check: tags => tags.filter(t => t === "crunch").length >= 4 },
    {
        id: "balanced", icon: "⚖️", he: "מאוזן", check: (tags, items) => {
            return ["base", "protein", "fiber", "fresh"].every(t => tags.includes(t)) && items.length >= 6;
        }
    },
];

export function getSuggestions(allTags, all) {
    const s = [], has = t => allTags.includes(t), cnt = t => allTags.filter(x => x === t).length;
    if (all.length >= 2 && !has("protein")) s.push({ text: "הוסיפו חלבון?", icon: "💪" });
    if (all.length >= 3 && cnt("crunch") === 0) s.push({ text: "חסר קראנצ'?", icon: "🥜" });
    if (all.length >= 4 && !has("herb") && !has("flavor")) s.push({ text: "הוסיפו טעם?", icon: "🌿" });
    if (all.length >= 5 && !has("fat")) s.push({ text: "שומן בריא?", icon: "🌿" });
    return s.slice(0, 2);
}

export const PRESETS = [
    { id: "balanced", icon: "⚖️", he: "מאוזן", items: ["lettuce", "tomato", "cucumber", "carrot", "chickpeas", "egg", "olive_oil"] },
    { id: "protein", icon: "💪", he: "חלבון", items: ["baby_leaf", "quinoa", "black_lentils", "mushrooms", "sunflower_seeds", "tuna", "tahini"] },
    { id: "vegan", icon: "🌱", he: "טבעוני", items: ["lettuce", "tomato", "bell_pepper", "green_lentils", "baked_sweet_potato", "tofu_olive", "lemon"] },
    { id: "light", icon: "🥬", he: "קליל", items: ["baby_leaf", "cucumber", "sprouts", "carrot", "celery", "lemon"] },
];
