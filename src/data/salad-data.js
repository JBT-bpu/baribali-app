// ─── DATA ───────────────────────────────────────────────────

export const STEPS = [
    {
        id: "veggies", title: "בחרו ירקות", subtitle: "לבחירה", emoji: "🥗",
        intro: "בחרו את הבסיס והירקות לסלט.",
        subgroups: [
            {
                label: "עלים ובסיס", shortLabel: "עלים", layer: "base", items: [
                    { id: "lettuce", he: "חסה", icon: "/icons/lettuce_romaine.webp", price: 0, tags: ["green", "base", "fiber"], desc: "חסה ירוקה פריכה" },
                    { id: "baby_leaf", he: "עלה בייבי", icon: "/icons/spinach_baby.webp", price: 0, tags: ["green", "base"], desc: "תערובת עלים רכים" },
                    { id: "cabbage_white", he: "כרוב לבן", icon: "/icons/cabbage_green.webp", price: 0, tags: ["white", "crunch", "fiber"], desc: "כרוב חתוך דק" },
                    { id: "cabbage_purple", he: "כרוב סגול", icon: "/icons/cabbage_purple.webp", price: 0, tags: ["purple", "crunch"], desc: "כרוב סגול פריך" },
                    { id: "sprouts", he: "נבטים", icon: "/icons/sprouts.webp", price: 0, tags: ["green", "crunch"], desc: "נבטי חיטה טריים" },
                ]
            },
            {
                label: "ירקות טריים", shortLabel: "טריים", layer: "fill", items: [
                    { id: "tomato", he: "עגבניות", icon: "/icons/tomato.webp", price: 0, tags: ["red", "fresh"], desc: "עגבניות שרי חתוכות" },
                    { id: "cucumber", he: "מלפפון", icon: "/icons/cucumber.webp", price: 0, tags: ["green", "fresh", "crunch"], desc: "מלפפון חתוך קוביות" },
                    { id: "bell_pepper", he: "גמבה", icon: "/icons/bell_pepper.webp", price: 0, tags: ["green", "crunch", "fresh"], desc: "פלפל צבעוני חתוך" },
                    { id: "carrot", he: "גזר", icon: "/icons/carrot_cuts.webp", price: 0, tags: ["orange", "crunch", "fiber"], desc: "גזר מגורד טרי" },
                    { id: "red_onion", he: "בצל סגול", icon: "/icons/red_onion.webp", price: 0, tags: ["purple", "flavor"], desc: "טבעות בצל סגול" },
                    { id: "green_onion", he: "בצל ירוק", icon: "/icons/onion_green.webp", price: 0, tags: ["green", "flavor"], desc: "בצל ירוק קצוץ" },
                    { id: "radish", he: "צנון", icon: "/icons/radish.webp", price: 0, tags: ["red", "crunch", "spicy"], desc: "צנון חריף פרוס" },
                    { id: "celery", he: "סלרי", icon: "/icons/celery.webp", price: 0, tags: ["green", "crunch"], desc: "סלרי פריך חתוך" },
                    { id: "fresh_beet", he: "סלק טרי", icon: "/icons/beet.webp", price: 0, tags: ["red", "sweet"], desc: "סלק טרי מגורד" },
                    { id: "mushrooms", he: "פטריות", icon: "/icons/mushroom.webp", price: 0, tags: ["brown", "protein"], desc: "פטריות שמפיניון" },
                    { id: "corn", he: "תירס", icon: "/icons/corn.webp", price: 0, tags: ["yellow", "sweet"], desc: "גרגרי תירס מתוקים" },
                    { id: "green_peas", he: "אפונה", icon: "/icons/peas.webp", price: 0, tags: ["green", "protein"], desc: "אפונה ירוקה" },
                    { id: "hot_pepper", he: "חריף", icon: "/icons/hot_pepper.webp", price: 0, tags: ["red", "spicy"], desc: "פלפל חריף טרי 🔥" },
                ]
            },
            {
                label: "דגנים וקטניות", shortLabel: "דגנים", layer: "grain", items: [
                    { id: "quinoa", he: "קינואה", icon: "/icons/quinoa_white.webp", price: 2, tags: ["grain", "protein", "fiber"], desc: "קינואה מבושלת" },
                    { id: "brown_rice", he: "אורז מלא", icon: "/icons/rice_brown.webp", price: 0, tags: ["grain", "fiber"], desc: "אורז מלא מבושל" },
                    { id: "bulgur", he: "בורגול", icon: "/icons/couscous.webp", price: 0, tags: ["grain", "fiber"], desc: "בורגול עדין" },
                    { id: "black_lentils", he: "עדשים שחורות", icon: "/icons/beans_black.webp", price: 0, tags: ["protein", "fiber", "grain"], desc: "עדשים שחורות מבושלות" },
                    { id: "green_lentils", he: "עדשים ירוקות", icon: "/icons/lentils_green.webp", price: 0, tags: ["protein", "fiber", "grain"], desc: "עדשים ירוקות מבושלות" },
                    { id: "chickpeas", he: "חומוס", icon: "/icons/chickpeas.webp", price: 0, tags: ["protein", "fiber"], desc: "גרגירי חומוס שלמים" },
                    { id: "fusilli_pasta", he: "פסטה", icon: "/icons/pasta_fusilli.webp", price: 0, tags: ["grain"], desc: "פסטה מסולסלת מבושלת" },
                ]
            },
            {
                label: "אפויים", shortLabel: "אפויים", layer: "warm", items: [
                    { id: "roasted_eggplant", he: "חציל קלוי", icon: "/icons/eggplant_grilled.webp", price: 0, tags: ["warm", "flavor"], desc: "חציל קלוי בתנור" },
                    { id: "baked_sweet_potato", he: "בטטה", icon: "/icons/sweet_potato_roasted.webp", price: 0, tags: ["orange", "warm", "sweet", "fiber"], desc: "בטטה אפויה מתוקה" },
                    { id: "baked_potato", he: 'תפו"א אפוי', icon: "/icons/potato_baked.webp", price: 0, tags: ["warm", "grain"], desc: "תפוח אדמה אפוי" },
                ]
            },
            {
                label: "תוספים", shortLabel: "תוספים", layer: "topping", items: [
                    { id: "cilantro", he: "כוסברה", icon: "/icons/cilantro.webp", price: 0, tags: ["green", "herb", "flavor"], desc: "כוסברה טרייה קצוצה" },
                    { id: "parsley", he: "פטרוזיליה", icon: "/icons/parsley.webp", price: 0, tags: ["green", "herb"], desc: "פטרוזיליה טרייה" },
                    { id: "pickles", he: "חמוצים", icon: "/icons/pickles.webp", price: 0, tags: ["crunch", "flavor"], desc: "מלפפון חמוץ חתוך" },
                    { id: "cranberries", he: "חמוציות", icon: "/icons/cranberries_dried.webp", price: 0, tags: ["red", "sweet"], desc: "חמוציות מיובשות" },
                    { id: "black_olives", he: "זיתים שחורים", icon: "/icons/olives_black.webp", price: 0, tags: ["fat", "flavor"], desc: "זיתים שחורים פרוסים" },
                    { id: "green_olives", he: "זיתים ירוקים", icon: "/icons/olives_green.webp", price: 0, tags: ["green", "fat", "flavor"], desc: "זיתים ירוקים" },
                    { id: "sunflower_seeds", he: "גרעינים", icon: "/icons/seeds_sunflower.webp", price: 0, tags: ["crunch", "fat", "protein"], desc: "גרעיני חמנייה" },
                    { id: "sesame", he: "שומשום", icon: "/icons/sesame_black.webp", price: 0, tags: ["crunch", "fat"], desc: "שומשום גולמי" },
                    { id: "chia", he: "צ'יה", icon: "/icons/seeds_chia.webp", price: 0, tags: ["fiber", "fat"], desc: "זרעי צ'יה" },
                    { id: "zaatar", he: "זעתר", icon: "/icons/seasoning_mixed.webp", price: 0, tags: ["herb", "flavor"], desc: "תערובת זעתר" },
                ]
            },
        ],
    },
    {
        id: "protein", title: "תוספת כלולה", subtitle: "אחת כלולה", emoji: "🥚", maxPicks: 1,
        intro: "בחרו תוספת חלבון אחת — כלולה במחיר הסלט",
        subgroups: [{
            label: null, items: [
                { id: "egg", he: "ביצה קשה", icon: "/icons/egg_boiled_half.webp", price: 0, tags: ["protein"], desc: "ביצה קשה חתוכה" },
                { id: "tuna", he: "טונה", icon: "/icons/tuna_shredded.webp", price: 0, tags: ["protein", "omega"], desc: "טונה בשמן" },
                { id: "tofu_olive", he: "טופו שמן זית", icon: "/icons/tofu_cubes.webp", price: 0, tags: ["protein", "vegan"], desc: "טופו מוקפץ בשמן זית, מלח ופלפל" },
                { id: "feta5", he: "פטה 5%", icon: "/icons/cheese_feta.webp", price: 0, tags: ["protein", "dairy"], desc: "גבינת פטה 5% אחוז שומן" },
                { id: "baby_mozzarella", he: "מוצרלה", icon: "/icons/mozzarella_balls.webp", price: 0, tags: ["protein", "dairy"], desc: "כדורי בייבי מוצרלה" },
            ]
        }],
    },
    {
        id: "sauces", title: "רטבים", subtitle: "עד 2", emoji: "🥣", maxPicks: 2,
        intro: "הוסיפו עד 2 רטבים לסלט",
        subgroups: [
            {
                label: "קלאסיים", items: [
                    { id: "olive_oil", he: "שמן זית", icon: "/icons/olive_oil.webp", price: 3, tags: ["fat", "classic"], desc: "שמן זית כתית מעולה" },
                    { id: "lemon", he: "לימון טרי", icon: "/icons/lemon_wedge.webp", price: 3, tags: ["fresh", "classic"], desc: "מיץ לימון סחוט טרי" },
                    { id: "tahini", he: "טחינה", icon: "/icons/sauce_tahini.webp", price: 3, tags: ["fat", "classic"], desc: "טחינה גולמית" },
                    { id: "balsamic", he: "בלסמי", icon: "/icons/balsamic_glaze.webp", price: 3, tags: ["sweet", "classic"], desc: "חומץ בלסמי" },
                ]
            },
            {
                label: "מיוחדים", items: [
                    { id: "thousand", he: "אלף האיים", icon: "/icons/dressing_pink.webp", price: 3, tags: [], desc: "רוטב אלף האיים קרמי" },
                    { id: "garlic_s", he: "רוטב שום", icon: "/icons/garlic_aioli.webp", price: 3, tags: ["flavor"], desc: "רוטב שום קרמי" },
                    { id: "citrus_vin", he: "ויניגרט הדרים", icon: "/icons/vinaigrette_lemon.webp", price: 3, tags: ["fresh"], desc: "ויניגרט עם הדרים טריים" },
                    { id: "sweet_chili", he: "צ'ילי מתוק", icon: "/icons/sriracha.webp", price: 3, tags: ["spicy", "sweet"], desc: "רוטב צ'ילי מתוק תאילנדי" },
                    { id: "teriyaki", he: "טריאקי", icon: "/icons/sauce_dark.webp", price: 3, tags: ["sweet"], desc: "רוטב טריאקי יפני" },
                    { id: "soy_s", he: "סויה", icon: "/icons/soy_sauce.webp", price: 3, tags: [], desc: "רוטב סויה סיני" },
                    { id: "caesar", he: "קיסר", icon: "/icons/dressing_caesar.webp", price: 5, tags: [], desc: "רוטב קיסר קלאסי" },
                    { id: "pesto", he: "פסטו", icon: "/icons/pesto_basil.webp", price: 4, tags: ["herb"], desc: "פסטו בזיליקום" },
                    { id: "zhug", he: "סחוג", icon: "/icons/jalapeno_sliced.webp", price: 4, tags: ["spicy"], desc: "סחוג תימני חריף 🔥" },
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
                    { id: "mix_no_sauce", he: "לערבב ללא רוטב", icon: "/icons/icon_toss_salad.webp", price: 0, tags: [], desc: "נערבב את הסלט, הרוטב בצד" },
                    { id: "no_mix", he: "לא לערבב", icon: "/icons/icon_no_dressing.webp", price: 0, tags: [], desc: "המרכיבים מסודרים בנפרד" },
                ]
            },
            {
                label: "לצד הסלט", items: [
                    { id: "bread", he: "עם לחם", icon: "/icons/baguette_sliced.webp", price: 0, tags: [], desc: "פרוסת לחם טרי" },
                    { id: "croutons_s", he: "קרוטונים", icon: "/icons/croutons.webp", price: 0, tags: ["crunch"], desc: "קרוטונים פריכים" },
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
                { id: "halloumi_p", he: "חלומי", icon: "/icons/halloumi_grilled.webp", price: 12, tags: ["protein"], pop: true, desc: "גבינת חלומי צלויה" },
                { id: "tofu_teri_p", he: "טופו טריאקי", icon: "/icons/tofu_smoked.webp", price: 10, tags: ["protein", "vegan"], desc: "טופו מוקפץ ברוטב טריאקי" },
                { id: "tuna_p", he: "טונה", icon: "/icons/tuna_shredded.webp", price: 7, tags: ["protein"], desc: "מנת טונה נוספת" },
                { id: "feta_p", he: "פטה", icon: "/icons/cheese_feta.webp", price: 7, tags: ["protein"], desc: "גבינת פטה נוספת" },
                { id: "egg_p", he: "ביצה", icon: "/icons/egg_boiled_slices.webp", price: 5, tags: ["protein"], desc: "ביצה קשה נוספת" },
                { id: "parmesan_p", he: "פרמז'ן", icon: "/icons/parmesan_shaved.webp", price: 4, tags: ["flavor"], desc: "שבבי פרמז'ן" },
                { id: "honey_p", he: "דבש", icon: "/icons/honey.webp", price: 4, tags: ["sweet"], desc: "דבש טבעי" },
                { id: "jala_p", he: "ג'עלה", icon: "/icons/spices_mixed.webp", price: 4, tags: ["crunch"], desc: "ג'עלה פריכה" },
                { id: "bread_p", he: "לחם נוסף", icon: "/icons/baguette_sliced.webp", price: 4, tags: [], desc: "פרוסת לחם נוספת" },
                { id: "croutons_p", he: "קרוטונים", icon: "/icons/croutons.webp", price: 3, tags: ["crunch"], desc: "מנת קרוטונים נוספת" },
            ]
        }],
    },
];

export const BASE = 54;

// ─── SIZE CONFIG ─────────────────────────────────────────────
export const SIZE_CONFIG = {
    750:  { ml: 750,  label: '750 מ"ל',  price: 54, desc: "סלט אישי" },
    1000: { ml: 1000, label: '1000 מ"ל', price: 59, desc: "סלט רגיל" },
    1500: { ml: 1500, label: '1500 מ"ל', price: 72, desc: "סלט גדול" },
};

// ─── TORTILLA BUILDER ───────────────────────────────────────

export const TORTILLA_BASE = 42;

export const TORTILLA_STEPS = [
    {
        id: "wrap", title: "בחרו טורטייה", subtitle: "כלולה במחיר", emoji: "🌯", maxPicks: 1,
        intro: "בחרו את סוג הטורטייה שלכם",
        subgroups: [{
            label: null, items: [
                { id: "wrap_flour",  he: "קמח לבן",    icon: "/icons/wrap_flour.webp",   price: 0, tags: ["wrap"],           desc: "טורטייה קמח לבן קלאסית" },
                { id: "wrap_wheat",  he: "קמח מלא",    icon: "/icons/wrap_wheat.webp",   price: 0, tags: ["wrap", "fiber"],   desc: "טורטייה חיטה מלאה" },
                { id: "wrap_spinach",he: "תרד",         icon: "/icons/wrap_spinach.webp", price: 0, tags: ["wrap", "green"],   desc: "טורטייה תרד ירוקה" },
                { id: "wrap_corn",   he: "תירס",        icon: "/icons/wrap_tomato.webp",  price: 0, tags: ["wrap"],            desc: "טורטייה קמח תירס" },
                { id: "wrap_gf",     he: "טורטייה מיוחדת", icon: "/icons/wrap_turmeric.webp", price: 3, tags: ["wrap"], desc: "טורטייה מיוחדת" },
            ]
        }],
    },
    {
        id: "t_fillings", title: "מילויים", subtitle: "לבחירה", emoji: "🥗",
        intro: "בחרו ירקות ומילויים לטורטייה",
        subgroups: [
            {
                label: "ירקות", shortLabel: "ירקות", items: [
                    { id: "t_lettuce",     he: "חסה",       icon: "/icons/lettuce_romaine.webp", price: 0, tags: ["green"] },
                    { id: "t_cab_purple",  he: "כרוב סגול", icon: "/icons/cabbage_purple.webp",  price: 0, tags: ["crunch"] },
                    { id: "t_tomato",      he: "עגבניות",   icon: "/icons/tomato.webp",           price: 0, tags: ["fresh"] },
                    { id: "t_cucumber",    he: "מלפפון",    icon: "/icons/cucumber.webp",         price: 0, tags: ["crunch"] },
                    { id: "t_bell_pepper", he: "גמבה",      icon: "/icons/bell_pepper.webp",      price: 0, tags: ["crunch"] },
                    { id: "t_carrot",      he: "גזר",       icon: "/icons/carrot_cuts.webp",      price: 0, tags: ["crunch"] },
                    { id: "t_red_onion",   he: "בצל סגול",  icon: "/icons/red_onion.webp",        price: 0, tags: ["flavor"] },
                    { id: "t_corn",        he: "תירס",      icon: "/icons/corn.webp",             price: 0, tags: ["sweet"] },
                    { id: "t_mushrooms",   he: "פטריות",    icon: "/icons/mushroom.webp",         price: 0, tags: [] },
                ]
            },
            {
                label: "תוספים", shortLabel: "תוספים", items: [
                    { id: "t_pickles",     he: "חמוצים",    icon: "/icons/pickles.webp",       price: 0, tags: ["crunch"] },
                    { id: "t_cilantro",    he: "כוסברה",    icon: "/icons/cilantro.webp",      price: 0, tags: ["herb"] },
                    { id: "t_hot_pepper",  he: "חריף",      icon: "/icons/hot_pepper.webp",    price: 0, tags: ["spicy"] },
                    { id: "t_olives",      he: "זיתים",     icon: "/icons/olives_black.webp",  price: 0, tags: ["fat"] },
                    { id: "t_sesame",      he: "שומשום",    icon: "/icons/sesame_black.webp",  price: 0, tags: ["crunch"] },
                ]
            },
        ],
    },
    {
        id: "t_protein", title: "תוספת כלולה", subtitle: "אחת כלולה", emoji: "🥚", maxPicks: 1,
        intro: "בחרו תוספת חלבון אחת — כלולה במחיר",
        subgroups: [{
            label: null, items: [
                { id: "t_egg",        he: "ביצה קשה",       icon: "/icons/egg_boiled_half.webp",  price: 0, tags: ["protein"] },
                { id: "t_tuna",       he: "טונה",            icon: "/icons/tuna_shredded.webp",    price: 0, tags: ["protein"] },
                { id: "t_tofu_olive", he: "טופו שמן זית",   icon: "/icons/tofu_cubes.webp",       price: 0, tags: ["protein", "vegan"] },
                { id: "t_feta5",      he: "פטה 5%",          icon: "/icons/cheese_feta.webp",      price: 0, tags: ["protein"] },
                { id: "t_mozz",       he: "מוצרלה",         icon: "/icons/mozzarella_balls.webp", price: 0, tags: ["protein"] },
            ]
        }],
    },
    {
        id: "t_sauces", title: "רטבים", subtitle: "עד 2", emoji: "🥣", maxPicks: 2,
        intro: "הוסיפו עד 2 רטבים לטורטייה",
        subgroups: [
            {
                label: "קלאסיים", items: [
                    { id: "t_olive_oil",  he: "שמן זית",      icon: "/icons/olive_oil.webp",        price: 3, tags: [] },
                    { id: "t_lemon",      he: "לימון טרי",     icon: "/icons/lemon_wedge.webp",      price: 3, tags: [] },
                    { id: "t_tahini",     he: "טחינה",         icon: "/icons/sauce_tahini.webp",     price: 3, tags: [] },
                    { id: "t_balsamic",   he: "בלסמי",         icon: "/icons/balsamic_glaze.webp",   price: 3, tags: [] },
                ]
            },
            {
                label: "מיוחדים", items: [
                    { id: "t_garlic_s",   he: "רוטב שום",     icon: "/icons/garlic_aioli.webp",     price: 3, tags: [] },
                    { id: "t_sweet_chili",he: "צ'ילי מתוק",   icon: "/icons/sriracha.webp",          price: 3, tags: ["spicy"] },
                    { id: "t_caesar",     he: "קיסר",         icon: "/icons/dressing_caesar.webp",  price: 5, tags: [] },
                    { id: "t_zhug",       he: "סחוג",         icon: "/icons/jalapeno_sliced.webp",   price: 4, tags: ["spicy"] },
                ]
            },
        ],
    },
    {
        id: "t_upgrade", title: "שדרוג?", subtitle: "תוספות פרימיום", emoji: "👑",
        intro: "אפשר לדלג — או לשדרג",
        subgroups: [{
            label: null, items: [
                { id: "t_halloumi_p",  he: "חלומי",    icon: "/icons/halloumi_grilled.webp", price: 12, tags: ["protein"], pop: true },
                { id: "t_tuna_p",      he: "טונה",     icon: "/icons/tuna_shredded.webp",    price: 7,  tags: ["protein"] },
                { id: "t_feta_p",      he: "פטה",      icon: "/icons/cheese_feta.webp",      price: 7,  tags: ["protein"] },
                { id: "t_egg_p",       he: "ביצה",     icon: "/icons/egg_boiled_slices.webp",price: 5,  tags: ["protein"] },
                { id: "t_parmesan_p",  he: "פרמז'ן",  icon: "/icons/parmesan_shaved.webp",  price: 4,  tags: ["flavor"] },
            ]
        }],
    },
];

// ─── COMBO BADGES ───────────────────────────────────────────

/*
  Each badge carries two pieces of art:

  - `emblem` — the full ornate crest, WITH its Hebrew title baked into the
    artwork. Used where there is room to read it (the summary panel at ~104px
    and the earn-flash at 56px). Because the title is part of the image, `he`
    is not rendered as text alongside it — it becomes the `alt` instead.
  - `icon` — a small stripped glyph for the 10-22px inline spots. Still emoji
    until that set is drawn; `Icon` (BariBaliBuilder.jsx / SummaryView.jsx)
    renders a path when it starts with "/" and an emoji otherwise, so these can
    be swapped one at a time with nothing breaking in between.

  `he` matches the wording baked into each emblem, so the alt text and the
  visible art never disagree.
*/
const art = id => `/icons/badges/emblem/${id}.webp`;

/** Item ids belonging to a catalog step, both salad and tortilla variants. */
const stepItemIds = stepId => new Set(
    [...STEPS, ...TORTILLA_STEPS]
        .filter(s => s.id === stepId)
        .flatMap(s => s.subgroups.flatMap(g => g.items.map(i => i.id)))
);

const cnt = (tags, t) => tags.filter(x => x === t).length;

export const COMBOS = [
    {
        id: "rainbow", icon: "🌈", emblem: art("rainbow"), he: "צבעוני", check: (_, items) => {
            const c = new Set(items.flatMap(i => (i.tags || []).filter(t => ["red", "green", "orange", "purple", "yellow", "white", "brown"].includes(t))));
            return c.size >= 4;
        }
    },
    { id: "spicy", icon: "🔥", emblem: art("spicy"), he: "חריף",
      check: tags => cnt(tags, "spicy") >= 2 },
    { id: "crunchy", icon: "🥜", emblem: art("crunchy"), he: "קראנצ'י",
      check: tags => cnt(tags, "crunch") >= 4 },
    // Nutrient and dietary badges stay disabled until weighed recipes and
    // ingredient-level dietary metadata are verified. Tag counts alone cannot
    // substantiate "high protein/fibre", "balanced" or "vegan" claims.
    // Only 5 items in the whole catalog carry "herb", so 2 is already deliberate.
    { id: "herb", icon: "🌿", emblem: art("herb"), he: "עשבי תיבול",
      check: tags => cnt(tags, "herb") >= 2 },
    {
        id: "mediterranean", icon: "🫒", emblem: art("mediterranean"), he: "ים תיכוני", check: (_, items) => {
            const has = ids => items.some(i => ids.includes(i.id));
            return has(["feta5", "feta_p"]) && has(["black_olives", "green_olives"]);
        }
    },
    { id: "loaded", icon: "🥗", emblem: art("loaded"), he: "גדוש",
      check: (_, items) => items.length >= 12 },
    { id: "all_green", icon: "🥬", emblem: art("all_green"), he: "ירוק לגמרי",
      check: tags => cnt(tags, "green") >= 6 },
    {
        id: "sauce_lover", icon: "🫗", emblem: art("sauce_lover"), he: "אוהב רטבים", check: (_, items) => {
            // Sauces are a catalog STEP, not a tag, so the id set is derived.
            const sauces = stepItemIds("sauces");
            const tSauces = stepItemIds("t_sauces");
            return items.filter(i => sauces.has(i.id) || tSauces.has(i.id)).length >= 3;
        }
    },
    { id: "flavor_blast", icon: "💥", emblem: art("flavor_blast"), he: "פיצוץ טעמים",
      check: tags => cnt(tags, "flavor") >= 4 },
    {
        id: "signature", icon: "🏅", emblem: art("signature"), he: "חתימת הבית", check: (_, items) => {
            // PRESETS is declared below; this only runs at call time, long after
            // module init, so the forward reference is safe.
            const sig = PRESETS.find(p => p.id === "signature");
            if (!sig) return false;
            const have = new Set(items.map(i => i.id));
            return sig.items.every(id => have.has(id));
        }
    },
];

/**
 * Badges that exist as art and as a goal, but are not earned from the contents
 * of a single bowl.
 *
 * `legendary` is awarded by the builder once enough COMBOS have been earned —
 * it is a badge about badges, so it cannot be a COMBOS entry without recursing.
 * `explorer` and `regular` need order history, which is only available for
 * signed-in customers; ordering here is guest-first, so they stay unearned
 * until that is wired deliberately rather than being half-implemented now.
 */
export const LEGENDARY_AT = 5;

export const BADGE_ART = {
    legendary: { emblem: art("legendary"), he: "אגדי",      icon: "👑" },
    explorer:  { emblem: art("explorer"),  he: "הרפתקן",    icon: "🧭" },
    regular:   { emblem: art("regular"),   he: "לקוח קבוע", icon: "🔄" },
};

export function getSuggestions(allTags, all) {
    const s = [], has = t => allTags.includes(t), cnt = t => allTags.filter(x => x === t).length;
    if (all.length >= 2 && !has("protein")) s.push({ text: "הוסיפו חלבון?", icon: "💪" });
    if (all.length >= 3 && cnt("crunch") === 0) s.push({ text: "חסר קראנצ'?", icon: "🥜" });
    if (all.length >= 4 && !has("herb") && !has("flavor")) s.push({ text: "הוסיפו טעם?", icon: "🌿" });
    if (all.length >= 5 && !has("fat")) s.push({ text: "בא לכם עוד עומק?", icon: "🌿" });
    return s.slice(0, 2);
}

export const PRESETS = [
    {
        id: "signature", icon: "⭐", he: "חתימת הבית",
        desc: "המתכון שהתחיל הכל — קינואה, בטטה אפויה וחומוס על מיטת עלי בייבי, עם ויניגרט טחינה ולימון שחיבר את הכל.",
        items: ["baby_leaf", "tomato", "cucumber", "quinoa", "chickpeas", "baked_sweet_potato", "red_onion", "sunflower_seeds", "tahini", "lemon"],
    },
    {
        id: "mediterranean", icon: "🫒", he: "ים תיכוני",
        desc: "גבינת פטה מתפוררת, זיתים שחורים וירוקים, ירקות טריים ובלסמי עדין. חופשה ים-תיכונית בצלחת, בלי כרטיס טיסה.",
        items: ["baby_leaf", "tomato", "cucumber", "bell_pepper", "red_onion", "black_olives", "green_olives", "feta5", "balsamic"],
    },
    {
        id: "asian_fusion", icon: "🥢", he: "פיוז'ן אסייתי",
        desc: "כרוב סגול פריך, גזר, תירס וטופו בציפוי טריאקי עם שומשום קלוי. מזרח רחוק בקערה — מתוק, מלוח ומסעיר.",
        items: ["cabbage_purple", "baby_leaf", "carrot", "cucumber", "corn", "green_onion", "tofu_olive", "sesame", "teriyaki"],
    },
    {
        id: "protein_beast", icon: "💪", he: "קערת הכוח",
        desc: "עדשים שחורות, קינואה, חומוס, פטריות וביצה קשה — שילוב נדיב של קטניות, דגנים ומרקמים.",
        items: ["lettuce", "mushrooms", "quinoa", "black_lentils", "chickpeas", "egg", "sunflower_seeds", "tahini"],
    },
    {
        id: "rainbow", icon: "🌈", he: "קשת צבעונית",
        desc: "שבעה צבעים בקערה אחת — עגבניה, גזר, סלק, גמבה, תירס, כרוב סגול ואפונה. חגיגה צבעונית בכל ביס.",
        items: ["baby_leaf", "tomato", "carrot", "bell_pepper", "fresh_beet", "corn", "cabbage_purple", "green_peas", "citrus_vin"],
    },
    {
        id: "fire_spice", icon: "🔥", he: "חריף ומסעיר",
        desc: "לנועזים בלבד. פלפל חריף, צנון, חמוצים וסחוג תימני אותנטי על בסיס ירקות וחומוס. חריף, אמיתי — לא לכולם.",
        items: ["lettuce", "tomato", "radish", "hot_pepper", "pickles", "red_onion", "chickpeas", "tofu_olive", "zhug"],
    },
    {
        id: "warm_earth", icon: "🍠", he: "חום וחמים",
        desc: "חציל קלוי בתנור, בטטה אפויה, ביצה קשה וזעתר — עומק, חמימות וריח של מזרח-תיכוני אמיתי. מנחם ומלא טעם.",
        items: ["lettuce", "roasted_eggplant", "baked_sweet_potato", "chickpeas", "red_onion", "parsley", "zaatar", "egg", "tahini"],
    },
    {
        id: "garden_fresh", icon: "🌿", he: "גן ירוק",
        desc: "נבטים, כוסברה, פטרוזיליה, בצל ירוק וסלרי עם לימון סחוט טרי — ירוק, פריך ומרענן.",
        items: ["baby_leaf", "sprouts", "cucumber", "celery", "green_onion", "tomato", "cilantro", "parsley", "lemon"],
    },
    {
        id: "pasta_garden", icon: "🍝", he: "פסטה גרדן",
        desc: "פסטה פוזילי, גבינת פטה, זיתים שחורים ובלסמי איכותי — פשוטה, מהירה ומספקת. הקלאסיק הים-תיכוני שתמיד עובד.",
        items: ["baby_leaf", "fusilli_pasta", "tomato", "cucumber", "bell_pepper", "black_olives", "parsley", "balsamic", "feta5"],
    },
    {
        id: "detox_bowl", icon: "🥦", he: "בול ירוק",
        desc: "נבטים, סלק טרי, גזר, אפונה ירוקה וזרעי צ'יה עם לימון סחוט טרי — צבעוני, פריך ומלא אופי.",
        items: ["baby_leaf", "sprouts", "fresh_beet", "carrot", "celery", "chia", "green_peas", "lemon", "green_onion"],
    },
    {
        id: "crunchy_master", icon: "🥜", he: "מלך הקראנץ'",
        desc: "כרוב לבן וסגול, גזר מגורד, צנון, חמוצים, גרעיני חמנייה ושומשום עם ויניגרט הדרים. פריך ומרענן, ביס אחרי ביס.",
        items: ["cabbage_white", "cabbage_purple", "carrot", "celery", "radish", "pickles", "sunflower_seeds", "sesame", "citrus_vin"],
    },
    {
        id: "eastern_night", icon: "🌙", he: "לילה מזרחי",
        desc: "בורגול עדין, חציל קלוי, חומוס, כוסברה ופטרוזיליה עם טחינה ולימון. טעם שוק מחנה יהודה — כל נגיסה מספרת סיפור.",
        items: ["baby_leaf", "bulgur", "roasted_eggplant", "chickpeas", "tomato", "parsley", "cilantro", "red_onion", "tahini", "lemon"],
    },
];
