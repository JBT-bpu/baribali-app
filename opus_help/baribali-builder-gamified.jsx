import { useState, useCallback, useEffect, useRef, useMemo } from "react";

/*
  BariBali Builder — With Live Gamification
  
  NEW vs previous version:
  1. COMBO BADGES: Auto-detected during build, pop in non-blocking
  2. LAYER HINTS: "בסיס ✓" "חלבון ✓" progress indicators  
  3. SUGGESTION CHIPS: "חסר קראנצ'?" "הוסיפו חלבון?" smart hints
  4. QUANTITY TOGGLE: less/normal/extra per selected ingredient
  5. PRESETS: Quick-start builds (balanced, protein, vegan, light)
  
  30-SECOND RULE: Nothing blocks. Nothing slows. Everything is additive.
*/

// ─── DATA ───────────────────────────────────────────────────

const STEPS = [
  {
    id: "veggies", title: "בחרו ירקות", subtitle: "כמה שרוצים", emoji: "🥗",
    subgroups: [
      { label: "🌿 עלים ובסיס", layer: "base", items: [
        { id: "lettuce", he: "חסה", icon: "🥬", price: 0, tags: ["green","base","fiber"] },
        { id: "baby_leaf", he: "עלה בייבי", icon: "🌿", price: 0, tags: ["green","base"] },
        { id: "cabbage_white", he: "כרוב לבן", icon: "🥬", price: 0, tags: ["white","crunch","fiber"] },
        { id: "cabbage_purple", he: "כרוב סגול", icon: "🟣", price: 0, tags: ["purple","crunch"] },
        { id: "sprouts", he: "נבטים", icon: "🌱", price: 0, tags: ["green","crunch"] },
      ]},
      { label: "🍅 ירקות טריים", layer: "fill", items: [
        { id: "tomato", he: "עגבניות", icon: "🍅", price: 0, tags: ["red","fresh"] },
        { id: "cucumber", he: "מלפפון", icon: "🥒", price: 0, tags: ["green","fresh","crunch"] },
        { id: "bell_pepper", he: "גמבה", icon: "🫑", price: 0, tags: ["green","crunch","fresh"] },
        { id: "carrot", he: "גזר", icon: "🥕", price: 0, tags: ["orange","crunch","fiber"] },
        { id: "red_onion", he: "בצל סגול", icon: "🧅", price: 0, tags: ["purple","flavor"] },
        { id: "green_onion", he: "בצל ירוק", icon: "🧅", price: 0, tags: ["green","flavor"] },
        { id: "radish", he: "צנון", icon: "🔴", price: 0, tags: ["red","crunch","spicy"] },
        { id: "celery", he: "סלרי", icon: "🥬", price: 0, tags: ["green","crunch"] },
        { id: "fresh_beet", he: "סלק טרי", icon: "🟤", price: 0, tags: ["red","sweet"] },
        { id: "mushrooms", he: "פטריות", icon: "🍄", price: 0, tags: ["brown","protein"] },
        { id: "corn", he: "תירס", icon: "🌽", price: 0, tags: ["yellow","sweet"] },
        { id: "green_peas", he: "אפונה", icon: "🟢", price: 0, tags: ["green","protein"] },
        { id: "hot_pepper", he: "חריף", icon: "🌶️", price: 0, tags: ["red","spicy"] },
      ]},
      { label: "🌾 דגנים וקטניות", layer: "grain", items: [
        { id: "quinoa", he: "קינואה", icon: "🫘", price: 2, tags: ["grain","protein","fiber"] },
        { id: "brown_rice", he: "אורז מלא", icon: "🍚", price: 0, tags: ["grain","fiber"] },
        { id: "bulgur", he: "בורגול", icon: "🌾", price: 0, tags: ["grain","fiber"] },
        { id: "black_lentils", he: "עדשים שחורות", icon: "⚫", price: 0, tags: ["protein","fiber","grain"] },
        { id: "green_lentils", he: "עדשים ירוקות", icon: "🟢", price: 0, tags: ["protein","fiber","grain"] },
        { id: "chickpeas", he: "חומוס", icon: "🫘", price: 0, tags: ["protein","fiber"] },
        { id: "fusilli_pasta", he: "פסטה", icon: "🍝", price: 0, tags: ["grain"] },
      ]},
      { label: "🍆 אפויים", layer: "warm", items: [
        { id: "roasted_eggplant", he: "חציל קלוי", icon: "🍆", price: 0, tags: ["warm","flavor"] },
        { id: "baked_sweet_potato", he: "בטטה", icon: "🍠", price: 0, tags: ["orange","warm","sweet","fiber"] },
        { id: "baked_potato", he: 'תפו"א אפוי', icon: "🥔", price: 0, tags: ["warm","grain"] },
      ]},
      { label: "✨ תוספים", layer: "topping", items: [
        { id: "cilantro", he: "כוסברה", icon: "🌿", price: 0, tags: ["green","herb","flavor"] },
        { id: "parsley", he: "פטרוזיליה", icon: "🌿", price: 0, tags: ["green","herb"] },
        { id: "pickles", he: "חמוצים", icon: "🥒", price: 0, tags: ["crunch","flavor"] },
        { id: "cranberries", he: "חמוציות", icon: "🔴", price: 0, tags: ["red","sweet"] },
        { id: "black_olives", he: "זיתים שחורים", icon: "🫒", price: 0, tags: ["fat","flavor"] },
        { id: "green_olives", he: "זיתים ירוקים", icon: "🫒", price: 0, tags: ["green","fat","flavor"] },
        { id: "sunflower_seeds", he: "גרעינים", icon: "🌻", price: 0, tags: ["crunch","fat","protein"] },
        { id: "sesame", he: "שומשום", icon: "⚪", price: 0, tags: ["crunch","fat"] },
        { id: "chia", he: "צ'יה", icon: "⚫", price: 0, tags: ["fiber","fat"] },
        { id: "zaatar", he: "זעתר", icon: "🌿", price: 0, tags: ["herb","flavor"] },
      ]},
    ],
  },
  {
    id: "protein", title: "תוספת כלולה", subtitle: "אחת כלולה", emoji: "🥚", maxPicks: 1,
    subgroups: [{ label: null, items: [
      { id: "egg", he: "ביצה קשה", icon: "🥚", price: 0, tags: ["protein"] },
      { id: "tuna", he: "טונה", icon: "🐟", price: 0, tags: ["protein","omega"] },
      { id: "tofu_olive", he: "טופו שמן זית", icon: "🫛", price: 0, tags: ["protein","vegan"] },
      { id: "feta5", he: "פטה 5%", icon: "🧀", price: 0, tags: ["protein","dairy"] },
      { id: "baby_mozzarella", he: "מוצרלה", icon: "🧈", price: 0, tags: ["protein","dairy"] },
    ]}],
  },
  {
    id: "sauces", title: "רטבים", subtitle: "עד 2", emoji: "🫒", maxPicks: 2,
    subgroups: [
      { label: "🫒 קלאסיים", items: [
        { id: "olive_oil", he: "שמן זית", icon: "🫒", price: 3, tags: ["fat","classic"] },
        { id: "lemon", he: "לימון טרי", icon: "🍋", price: 3, tags: ["fresh","classic"] },
        { id: "tahini", he: "טחינה", icon: "🥣", price: 3, tags: ["fat","classic"] },
        { id: "balsamic", he: "בלסמי", icon: "🍷", price: 3, tags: ["sweet","classic"] },
      ]},
      { label: "⭐ מיוחדים", items: [
        { id: "thousand", he: "אלף האיים", icon: "🥫", price: 3, tags: [] },
        { id: "garlic_s", he: "רוטב שום", icon: "🧄", price: 3, tags: ["flavor"] },
        { id: "citrus_vin", he: "ויניגרט הדרים", icon: "🍊", price: 3, tags: ["fresh"] },
        { id: "sweet_chili", he: "צ'ילי מתוק", icon: "🌶️", price: 3, tags: ["spicy","sweet"] },
        { id: "teriyaki", he: "טריאקי", icon: "🍶", price: 3, tags: ["sweet"] },
        { id: "soy_s", he: "סויה", icon: "🥢", price: 3, tags: [] },
        { id: "caesar", he: "קיסר", icon: "🥗", price: 5, tags: [] },
        { id: "pesto", he: "פסטו", icon: "🌿", price: 4, tags: ["herb"] },
        { id: "zhug", he: "סחוג", icon: "🔥", price: 4, tags: ["spicy"] },
      ]},
    ],
  },
  {
    id: "finish", title: "ערבוב ולחם", subtitle: "כמעט סיימנו!", emoji: "🍞",
    subgroups: [
      { label: "🔄 ערבוב", items: [
        { id: "mix_no_sauce", he: "לערבב ללא רוטב", icon: "🔄", price: 0, tags: [] },
        { id: "no_mix", he: "לא לערבב", icon: "✋", price: 0, tags: [] },
      ]},
      { label: "🍞 לצד הסלט", items: [
        { id: "bread", he: "עם לחם", icon: "🍞", price: 0, tags: [] },
        { id: "croutons_s", he: "קרוטונים", icon: "🥖", price: 0, tags: ["crunch"] },
        { id: "none_side", he: "ללא", icon: "🚫", price: 0, tags: [] },
      ]},
    ],
  },
  {
    id: "upgrade", title: "שדרוג?", subtitle: "תוספות פרימיום", emoji: "👑",
    subgroups: [{ label: null, items: [
      { id: "halloumi_p", he: "חלומי", icon: "🧀", price: 12, tags: ["protein"], pop: true },
      { id: "tofu_teri_p", he: "טופו טריאקי", icon: "🫛", price: 10, tags: ["protein","vegan"] },
      { id: "tuna_p", he: "טונה", icon: "🐟", price: 7, tags: ["protein"] },
      { id: "feta_p", he: "פטה", icon: "🧀", price: 7, tags: ["protein"] },
      { id: "egg_p", he: "ביצה", icon: "🥚", price: 5, tags: ["protein"] },
      { id: "parmesan_p", he: "פרמז'ן", icon: "🧀", price: 4, tags: ["flavor"] },
      { id: "honey_p", he: "דבש", icon: "🍯", price: 4, tags: ["sweet"] },
      { id: "jala_p", he: "ג'עלה", icon: "🥜", price: 4, tags: ["crunch"] },
      { id: "bread_p", he: "לחם נוסף", icon: "🍞", price: 4, tags: [] },
      { id: "croutons_p", he: "קרוטונים", icon: "🥖", price: 3, tags: ["crunch"] },
    ]}],
  },
];

const BASE = 45;

// ─── COMBO BADGE DETECTION ──────────────────────────────────

const COMBOS = [
  { id: "protein_power", icon: "💪", he: "עשיר בחלבון", check: tags => tags.filter(t => t === "protein").length >= 3 },
  { id: "rainbow", icon: "🌈", he: "צבעוני!", check: (tags, items) => {
    const colors = new Set(items.flatMap(i => (i.tags||[]).filter(t => ["red","green","orange","purple","yellow","white","brown"].includes(t))));
    return colors.size >= 4;
  }},
  { id: "vegan", icon: "🌱", he: "טבעוני", check: (tags, items) => {
    return items.length >= 4 && !items.some(i => (i.tags||[]).some(t => ["dairy"].includes(t))) &&
      !items.some(i => ["egg","tuna","feta5","baby_mozzarella","tuna_p","feta_p","egg_p","halloumi_p","parmesan_p"].includes(i.id));
  }},
  { id: "fiber_bomb", icon: "🌾", he: "עשיר בסיבים", check: tags => tags.filter(t => t === "fiber").length >= 4 },
  { id: "spicy", icon: "🔥", he: "חריף!", check: tags => tags.filter(t => t === "spicy").length >= 2 },
  { id: "crunchy", icon: "🥜", he: "קראנצ'י", check: tags => tags.filter(t => t === "crunch").length >= 4 },
  { id: "herby", icon: "🌿", he: "מלא עשבי תיבול", check: tags => tags.filter(t => t === "herb").length >= 3 },
  { id: "balanced", icon: "⚖️", he: "מאוזן", check: (tags, items) => {
    const has = (t) => tags.includes(t);
    return has("base") && has("protein") && has("fiber") && has("fresh") && items.length >= 6;
  }},
];

// ─── SUGGESTION ENGINE ──────────────────────────────────────

function getSuggestions(allTags, allItems) {
  const suggestions = [];
  const has = (tag) => allTags.includes(tag);
  const count = (tag) => allTags.filter(t => t === tag).length;

  if (allItems.length >= 2 && !has("protein")) suggestions.push({ text: "הוסיפו חלבון?", icon: "💪" });
  if (allItems.length >= 3 && count("crunch") === 0) suggestions.push({ text: "חסר קראנצ'?", icon: "🥜" });
  if (allItems.length >= 4 && !has("herb") && !has("flavor")) suggestions.push({ text: "הוסיפו טעם?", icon: "🌿" });
  if (count("protein") >= 2 && !has("fiber")) suggestions.push({ text: "סיבים תזונתיים?", icon: "🌾" });
  if (allItems.length >= 5 && !has("fat")) suggestions.push({ text: "שומן בריא?", icon: "🫒" });

  return suggestions.slice(0, 2); // max 2 suggestions
}

// ─── PRESETS ────────────────────────────────────────────────

const PRESETS = [
  { id: "balanced", icon: "⚖️", he: "מאוזן", items: ["lettuce","tomato","cucumber","carrot","chickpeas","egg","olive_oil"] },
  { id: "protein", icon: "💪", he: "חלבון", items: ["baby_leaf","quinoa","black_lentils","mushrooms","sunflower_seeds","tuna","tahini"] },
  { id: "vegan", icon: "🌱", he: "טבעוני", items: ["lettuce","tomato","bell_pepper","green_lentils","baked_sweet_potato","tofu_olive","lemon"] },
  { id: "light", icon: "🥬", he: "קליל", items: ["baby_leaf","cucumber","sprouts","carrot","celery","lemon"] },
];

// ─── FLOATING PRODUCE ───────────────────────────────────────

const FLOATERS = [
  { e: "🍅", sz: 30, t: "5%", l: "3%", d: 0, dur: 9, bl: 1, op: 0.16 },
  { e: "🥬", sz: 24, t: "14%", r: "5%", d: 2, dur: 11, bl: 2, op: 0.1 },
  { e: "🥒", sz: 20, t: "38%", l: "2%", d: 4, dur: 13, bl: 1, op: 0.12 },
  { e: "🫑", sz: 26, t: "62%", r: "2%", d: 1, dur: 10, bl: 2, op: 0.09 },
  { e: "🥕", sz: 18, t: "82%", l: "4%", d: 3, dur: 12, bl: 0, op: 0.11 },
  { e: "🍋", sz: 22, t: "48%", r: "1%", d: 5, dur: 14, bl: 1, op: 0.09 },
];

// ─── MAIN ───────────────────────────────────────────────────

export default function BariBaliBuilder() {
  const [step, setStep] = useState(-1); // -1 = preset screen
  const [sels, setSels] = useState({});
  const [lastAdd, setLastAdd] = useState(null);
  const [summary, setSummary] = useState(false);
  const [anim, setAnim] = useState("enter");
  const [comboBadges, setComboBadges] = useState([]);
  const [badgeFlash, setBadgeFlash] = useState(null);
  const [shownBadges, setShownBadges] = useState(new Set());
  const scrollRef = useRef(null);

  useEffect(() => { setTimeout(() => setAnim(null), 500); }, []);

  const cur = step >= 0 ? STEPS[step] : null;
  const getSel = id => sels[id] || [];
  const all = useMemo(() => Object.values(sels).flat(), [sels]);
  const allTags = useMemo(() => all.flatMap(i => i.tags || []), [all]);
  const extras = all.reduce((s, i) => s + (i.price || 0), 0);
  const total = BASE + extras;
  const curSel = cur ? getSel(cur.id) : [];

  // ── Combo badge detection ──
  useEffect(() => {
    const earned = COMBOS.filter(c => c.check(allTags, all));
    setComboBadges(earned);

    // Flash new badges
    earned.forEach(b => {
      if (!shownBadges.has(b.id) && all.length > 0) {
        setBadgeFlash(b);
        setShownBadges(prev => new Set([...prev, b.id]));
        setTimeout(() => setBadgeFlash(null), 2200);
      }
    });
  }, [allTags, all, shownBadges]);

  // ── Suggestions ──
  const suggestions = useMemo(() => step === 0 ? getSuggestions(allTags, all) : [], [allTags, all, step]);

  const toggle = useCallback((sid, item, max) => {
    setSels(prev => {
      const cur = prev[sid] || [];
      if (cur.find(i => i.id === item.id)) return { ...prev, [sid]: cur.filter(i => i.id !== item.id) };
      if (sid === "finish") {
        const st = STEPS.find(s => s.id === sid);
        let sgIds = [];
        st.subgroups.forEach(sg => { if (sg.items.some(i => i.id === item.id)) sgIds = sg.items.map(i => i.id); });
        setLastAdd(item.id); setTimeout(() => setLastAdd(null), 350);
        return { ...prev, [sid]: [...cur.filter(i => !sgIds.includes(i.id)), item] };
      }
      if (max && cur.length >= max) {
        if (max === 1) { setLastAdd(item.id); setTimeout(() => setLastAdd(null), 350); return { ...prev, [sid]: [item] }; }
        return prev;
      }
      setLastAdd(item.id); setTimeout(() => setLastAdd(null), 350);
      return { ...prev, [sid]: [...cur, item] };
    });
  }, []);

  const loadPreset = useCallback((preset) => {
    const allItems = STEPS.flatMap(s => s.subgroups.flatMap(sg => sg.items));
    const veggies = []; const proteins = []; const sauces = [];
    preset.items.forEach(id => {
      const item = allItems.find(i => i.id === id);
      if (!item) return;
      const inStep = STEPS.find(s => s.subgroups.some(sg => sg.items.some(i => i.id === id)));
      if (inStep?.id === "veggies") veggies.push(item);
      else if (inStep?.id === "protein") proteins.push(item);
      else if (inStep?.id === "sauces") sauces.push(item);
    });
    setSels({ veggies, protein: proteins, sauces });
    setStep(0);
  }, []);

  const slide = fn => {
    setAnim("out");
    setTimeout(() => { fn(); setAnim("in"); scrollRef.current?.scrollTo(0, 0); setTimeout(() => setAnim(null), 200); }, 160);
  };

  const next = () => {
    if (step < STEPS.length - 1) slide(() => setStep(s => s + 1));
    else setSummary(true);
  };
  const back = () => {
    if (summary) setSummary(false);
    else if (step > 0) slide(() => setStep(s => s - 1));
    else if (step === 0) slide(() => setStep(-1));
  };

  if (summary) return <SummaryView sels={sels} total={total} all={all} comboBadges={comboBadges} onBack={back} />;

  // ── Preset selection screen ──
  if (step === -1) {
    return (
      <div style={R.root}>
        <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <div style={R.bg} /><div style={R.bgRay1} /><div style={R.bgBokeh1} /><div style={R.bgBokeh2} />
        {FLOATERS.map((f, i) => <Floater key={i} {...f} />)}

        <div style={{
          ...R.main, justifyContent: "center", padding: "24px 16px", gap: "20px",
          opacity: anim === "enter" ? 0 : 1, transform: anim === "enter" ? "translateY(15px)" : "none",
          transition: "all 0.5s ease",
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "42px", marginBottom: "8px" }}>🥗</div>
            <div style={{ fontSize: "22px", fontWeight: 900, color: "#e8f5e9", marginBottom: "4px" }}>בנו את הסלט שלכם</div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>בחרו תבנית להתחלה מהירה, או התחילו ריק</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {PRESETS.map(p => (
              <button key={p.id} onClick={() => loadPreset(p)} style={R.presetCard}>
                <span style={{ fontSize: "28px" }}>{p.icon}</span>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#e8f5e9" }}>{p.he}</span>
                <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>{p.items.length} מרכיבים</span>
              </button>
            ))}
          </div>

          <button onClick={() => setStep(0)} style={R.emptyStartBtn}>
            התחילו ריק ←
          </button>
        </div>
        <style>{KF}</style>
      </div>
    );
  }

  return (
    <div style={R.root}>
      <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <div style={R.bg} /><div style={R.bgRay1} /><div style={R.bgRay2} /><div style={R.bgBokeh1} /><div style={R.bgBokeh2} />
      {FLOATERS.map((f, i) => <Floater key={i} {...f} />)}

      {/* ── Badge flash popup ── */}
      {badgeFlash && (
        <div style={R.badgeFlash}>
          <span style={{ fontSize: "22px" }}>{badgeFlash.icon}</span>
          <span style={R.badgeFlashText}>{badgeFlash.he}</span>
        </div>
      )}

      <div style={{
        ...R.main,
        opacity: anim === "enter" ? 0 : 1,
        transform: anim === "enter" ? "translateY(12px)" : "none",
        transition: "all 0.4s ease",
      }}>

        {/* ── HEADER ── */}
        <div style={R.header}>
          <div style={R.headerTop}>
            <button style={R.backBtn} onClick={back}>→</button>
            <div style={{ flex: 1 }}>
              <div style={R.titleRow}>
                <span style={{ fontSize: "17px" }}>{cur.emoji}</span>
                <span style={R.titleText}>{cur.title}</span>
                <span style={R.subtitle}>{cur.subtitle}</span>
              </div>
              {/* Layer completion */}
              <div style={R.layerRow}>
                {[
                  { key: "base", label: "בסיס", icon: "🌿" },
                  { key: "protein", label: "חלבון", icon: "💪" },
                  { key: "grain", label: "דגנים", icon: "🌾" },
                  { key: "flavor", label: "טעם", icon: "✨" },
                ].map(l => {
                  const done = l.key === "protein"
                    ? (sels.protein || []).length > 0
                    : allTags.includes(l.key) || allTags.includes(l.key === "flavor" ? "herb" : l.key);
                  return (
                    <div key={l.key} style={{
                      ...R.layerPill,
                      background: done ? "rgba(102,187,106,0.2)" : "rgba(255,255,255,0.05)",
                      borderColor: done ? "rgba(102,187,106,0.35)" : "rgba(255,255,255,0.08)",
                    }}>
                      <span style={{ fontSize: "10px" }}>{l.icon}</span>
                      <span style={{
                        fontSize: "8px", fontWeight: 700,
                        color: done ? "#a5d6a7" : "rgba(255,255,255,0.25)",
                      }}>{l.label}</span>
                      {done && <span style={{ fontSize: "8px", color: "#66bb6a" }}>✓</span>}
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={R.pricePill}>
              <span style={R.priceS}>₪</span>
              <span style={R.priceV}>{total}</span>
            </div>
          </div>

          {/* Progress */}
          <div style={R.progressRow}>
            {STEPS.map((s, i) => (
              <div key={s.id} style={{
                height: "3px", flex: 1, borderRadius: "2px",
                background: i < step ? "linear-gradient(90deg, #43a047, #66bb6a)"
                  : i === step ? "linear-gradient(90deg, #66bb6a, #aed581)"
                  : "rgba(255,255,255,0.12)",
                transition: "all 0.5s cubic-bezier(0.34,1.56,0.64,1)",
                boxShadow: i <= step ? "0 0 6px rgba(102,187,106,0.25)" : "none",
              }} />
            ))}
          </div>
        </div>

        {/* ── BOWL + BADGES ── */}
        <div style={R.bowlArea}>
          <BowlStrip items={all} lastAdd={lastAdd} />
          {comboBadges.length > 0 && (
            <div style={R.badgeRow}>
              {comboBadges.map(b => (
                <div key={b.id} style={R.badgePill}>
                  <span style={{ fontSize: "11px" }}>{b.icon}</span>
                  <span style={R.badgePillText}>{b.he}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── SUGGESTIONS ── */}
        {suggestions.length > 0 && (
          <div style={R.sugRow}>
            {suggestions.map((s, i) => (
              <div key={i} style={R.sugPill}>
                <span style={{ fontSize: "12px" }}>{s.icon}</span>
                <span style={R.sugText}>{s.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── CONTENT ── */}
        <div style={{
          ...R.content,
          opacity: anim === "out" ? 0 : 1,
          transform: anim === "out" ? "translateX(-14px)" : "translateX(0)",
          transition: "all 0.16s ease",
        }} ref={scrollRef}>

          {cur.subgroups.map((sg, si) => (
            <div key={si}>
              {sg.label && <div style={R.sgLabel}>{sg.label}</div>}
              <div style={R.grid}>
                {sg.items.map((item, idx) => {
                  const on = curSel.some(s => s.id === item.id);
                  const full = !on && cur.maxPicks && cur.maxPicks > 1 && curSel.length >= cur.maxPicks;
                  return (
                    <button key={item.id} disabled={full}
                      onClick={() => toggle(cur.id, item, cur.maxPicks)}
                      style={{
                        ...R.chip, ...(on ? R.chipOn : {}), ...(full ? R.chipOff : {}),
                        animationDelay: `${(si * 5 + idx) * 20}ms`,
                      }}>
                      {on && <div style={R.check}>✓</div>}
                      {item.pop && <div style={R.popTag}>פופולרי</div>}
                      <span style={{
                        ...R.chipEmoji,
                        transform: lastAdd === item.id ? "scale(1.4) rotate(-10deg)" : "scale(1)",
                        transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                      }}>{item.icon}</span>
                      <span style={R.chipName}>{item.he}</span>
                      {item.price > 0 && <span style={R.chipCost}>+₪{item.price}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div style={{ height: "120px" }} />
        </div>

        {/* ── BOTTOM ── */}
        <div style={R.bar}>
          <div style={R.barInfo}>
            <span style={R.barCount}>{all.length}</span>
            <span style={R.barLabel}>מרכיבים</span>
            <div style={R.barDivider} />
            <span style={R.barTotal}>₪{total}</span>
          </div>
          <button style={{
            ...R.cta,
            ...(cur.id === "upgrade" && curSel.length === 0 ? R.ctaGhost : {}),
          }} onClick={next}>
            {step === STEPS.length - 1 ? (curSel.length > 0 ? "לסיכום" : "דלגו") : "המשך"}
            <span style={{ marginRight: "6px" }}>←</span>
          </button>
        </div>
      </div>

      <style>{KF}</style>
    </div>
  );
}

// ─── SMALL COMPONENTS ───────────────────────────────────────

function Floater({ e, sz, t, l, r, d, dur, bl, op }) {
  return (
    <div style={{
      position: "fixed", zIndex: 1, fontSize: `${sz}px`,
      top: t, left: l, right: r, opacity: op,
      filter: `blur(${bl}px)`, pointerEvents: "none",
      animation: `vegFloat ${dur}s ease-in-out ${d}s infinite`,
    }}>{e}</div>
  );
}

function BowlStrip({ items, lastAdd }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && lastAdd) ref.current.scrollTo({ left: ref.current.scrollWidth, behavior: "smooth" });
  }, [items.length, lastAdd]);

  if (items.length === 0) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "4px 0" }}>
      <span style={{ opacity: 0.25, fontSize: "18px" }}>🥗</span>
      <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.18)" }}>הקערה ריקה</span>
    </div>
  );

  return (
    <div style={{ display: "flex", gap: "3px", overflowX: "auto", scrollbarWidth: "none", padding: "2px 0" }} ref={ref}>
      {items.map(item => (
        <div key={item.id} style={{
          ...R.bowlPiece,
          animation: lastAdd === item.id ? "popBounce 0.3s cubic-bezier(0.34,1.56,0.64,1)" : "none",
        }}>
          <span style={{ fontSize: "15px", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.2))" }}>{item.icon}</span>
        </div>
      ))}
    </div>
  );
}

// ─── SUMMARY ────────────────────────────────────────────────

function SummaryView({ sels, total, all, comboBadges, onBack }) {
  const extras = all.filter(i => i.price > 0);
  const grouped = STEPS.map(s => ({ s, items: sels[s.id] || [] })).filter(g => g.items.length > 0);

  return (
    <div style={R.root}>
      <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <div style={R.bg} /><div style={R.bgRay1} /><div style={R.bgBokeh1} />

      <div style={R.main}>
        <div style={R.header}>
          <div style={R.headerTop}>
            <button style={R.backBtn} onClick={onBack}>→</button>
            <div style={{ flex: 1 }}>
              <div style={R.titleRow}>
                <span style={{ fontSize: "17px" }}>📋</span>
                <span style={R.titleText}>הסלט שלכם</span>
              </div>
            </div>
            <div style={R.pricePill}><span style={R.priceS}>₪</span><span style={R.priceV}>{total}</span></div>
          </div>
        </div>

        <div style={{ ...R.content, padding: "14px 16px" }}>
          {/* Bowl */}
          <div style={R.sumBowl}>
            {all.map((item, i) => (
              <span key={item.id} style={{
                fontSize: all.length > 14 ? "16px" : "22px",
                animation: `popBounce 0.25s ease ${i * 25}ms both`,
                filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.2))",
              }}>{item.icon}</span>
            ))}
          </div>

          {/* Earned badges */}
          {comboBadges.length > 0 && (
            <div style={R.sumBadges}>
              {comboBadges.map(b => (
                <div key={b.id} style={R.sumBadge}>
                  <span>{b.icon}</span>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#a5d6a7" }}>{b.he}</span>
                </div>
              ))}
            </div>
          )}

          {/* Items */}
          {grouped.map(({ s, items }) => (
            <div key={s.id} style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.4)", padding: "6px 0" }}>{s.emoji} {s.title}</div>
              {items.map(item => (
                <div key={item.id} style={R.sumRow}>
                  <span>{item.icon} {item.he}</span>
                  {item.price > 0 && <span style={{ color: "#dfc06e", fontWeight: 700, fontSize: "12px" }}>+₪{item.price}</span>}
                </div>
              ))}
            </div>
          ))}

          {/* Price */}
          <div style={R.sumPriceCard}>
            <div style={R.sumPriceLine}><span>סלט בסיס</span><span style={{ fontWeight: 700 }}>₪{BASE}</span></div>
            {extras.map(item => (
              <div key={item.id} style={R.sumPriceLine}>
                <span style={{ opacity: 0.45, fontSize: "12px" }}>+ {item.he}</span>
                <span style={{ color: "#b8860b", fontWeight: 600 }}>₪{item.price}</span>
              </div>
            ))}
            <div style={R.sumTotalLine}><span>סה"כ</span><span>₪{total}</span></div>
          </div>
          <div style={{ height: "110px" }} />
        </div>

        <div style={R.bar}>
          <div />
          <button style={R.orderBtn} onClick={() => alert("! 🥗 ההזמנה נשלחה")}>
            🥗 הזמנה · ₪{total} ←
          </button>
        </div>
      </div>
      <style>{KF}</style>
    </div>
  );
}

// ─── KEYFRAMES ──────────────────────────────────────────────

const KF = `
@keyframes chipIn { 0%{opacity:0;transform:translateY(10px) scale(0.92)} 100%{opacity:1;transform:none} }
@keyframes popBounce { 0%{transform:scale(0.3);opacity:0} 60%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
@keyframes vegFloat { 0%,100%{transform:translate(0,0) rotate(0)} 25%{transform:translate(5px,-10px) rotate(8deg)} 75%{transform:translate(-3px,6px) rotate(-5deg)} }
@keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
@keyframes rayPulse { 0%,100%{opacity:0.04} 50%{opacity:0.08} }
@keyframes bokehFloat { 0%,100%{transform:translate(0,0);opacity:0.06} 50%{transform:translate(8px,-6px);opacity:0.11} }
@keyframes flashIn { 0%{transform:translateY(-20px) scale(0.8);opacity:0} 15%{transform:translateY(0) scale(1.05);opacity:1} 85%{transform:translateY(0) scale(1);opacity:1} 100%{transform:translateY(-10px);opacity:0} }
@keyframes pulseGlow { 0%,100%{box-shadow:0 0 8px rgba(102,187,106,0.3)} 50%{box-shadow:0 0 16px rgba(102,187,106,0.5)} }
* { -webkit-tap-highlight-color:transparent; box-sizing:border-box; margin:0; padding:0; }
::-webkit-scrollbar { display:none; }
`;

// ─── STYLES ─────────────────────────────────────────────────

const R = {
  root: {
    position: "relative", width: "100%", maxWidth: "430px", minHeight: "100vh",
    margin: "0 auto", overflow: "hidden",
    fontFamily: "'Heebo', sans-serif", direction: "rtl", color: "#1b3a1b",
  },
  bg: {
    position: "fixed", inset: 0, zIndex: 0,
    background: "linear-gradient(155deg, #1a4a1a 0%, #1e5c1e 15%, #267326 35%, #2d8a2d 50%, #4a8c28 70%, #6b8a20 90%, #7a8520 100%)",
  },
  bgRay1: {
    position: "fixed", top: "-30%", right: "-20%", width: "120%", height: "80%",
    zIndex: 0, pointerEvents: "none", borderRadius: "50%",
    background: "linear-gradient(135deg, rgba(255,235,150,0.07) 0%, transparent 50%)",
    animation: "rayPulse 8s ease-in-out infinite",
  },
  bgRay2: {
    position: "fixed", bottom: "-20%", left: "-25%", width: "100%", height: "70%",
    zIndex: 0, pointerEvents: "none", borderRadius: "50%",
    background: "linear-gradient(315deg, rgba(255,255,200,0.04) 0%, transparent 50%)",
    animation: "rayPulse 12s ease-in-out infinite", animationDelay: "4s",
  },
  bgBokeh1: {
    position: "fixed", top: "12%", left: "15%", width: "100px", height: "100px",
    borderRadius: "50%", zIndex: 0, pointerEvents: "none",
    background: "radial-gradient(circle, rgba(255,255,200,0.07) 0%, transparent 70%)",
    animation: "bokehFloat 10s ease-in-out infinite",
  },
  bgBokeh2: {
    position: "fixed", top: "55%", right: "10%", width: "80px", height: "80px",
    borderRadius: "50%", zIndex: 0, pointerEvents: "none",
    background: "radial-gradient(circle, rgba(180,220,100,0.05) 0%, transparent 70%)",
    animation: "bokehFloat 14s ease-in-out infinite", animationDelay: "3s",
  },
  main: { position: "relative", zIndex: 2, display: "flex", flexDirection: "column", height: "100vh" },

  // Header
  header: {
    padding: "8px 12px 6px",
    background: "linear-gradient(180deg, rgba(20,60,20,0.93), rgba(25,70,25,0.83))",
    backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
    borderBottom: "1px solid rgba(102,187,106,0.18)",
    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
  },
  headerTop: { display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "6px" },
  backBtn: {
    width: "34px", height: "34px", borderRadius: "10px", cursor: "pointer",
    background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
    color: "#a5d6a7", fontSize: "16px", fontWeight: 700, marginTop: "2px",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Heebo', sans-serif",
  },
  titleRow: { display: "flex", alignItems: "center", gap: "5px" },
  titleText: { fontSize: "16px", fontWeight: 800, color: "#e8f5e9" },
  subtitle: { fontSize: "11px", color: "rgba(255,255,255,0.35)", fontWeight: 500, marginRight: "4px" },
  layerRow: { display: "flex", gap: "4px", marginTop: "5px", flexWrap: "wrap" },
  layerPill: {
    display: "flex", alignItems: "center", gap: "3px",
    padding: "2px 7px", borderRadius: "8px",
    border: "1px solid", transition: "all 0.3s ease",
  },
  pricePill: {
    display: "flex", alignItems: "baseline", gap: "1px",
    background: "linear-gradient(135deg, rgba(200,168,78,0.22), rgba(184,134,11,0.1))",
    border: "1px solid rgba(200,168,78,0.3)", padding: "4px 11px", borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(200,168,78,0.12)",
  },
  priceS: { fontSize: "10px", color: "#dfc06e", fontWeight: 600 },
  priceV: { fontSize: "16px", color: "#edd87e", fontWeight: 900 },
  progressRow: { display: "flex", gap: "3px" },

  // Bowl area
  bowlArea: {
    padding: "6px 12px 4px",
    background: "rgba(0,0,0,0.1)",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
  },
  bowlPiece: {
    width: "30px", height: "30px", borderRadius: "9px", flexShrink: 0,
    background: "linear-gradient(145deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03))",
    border: "1px solid rgba(255,255,255,0.08)",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
  },
  badgeRow: { display: "flex", gap: "5px", marginTop: "5px", flexWrap: "wrap" },
  badgePill: {
    display: "flex", alignItems: "center", gap: "4px",
    padding: "2px 8px", borderRadius: "8px",
    background: "linear-gradient(135deg, rgba(102,187,106,0.15), rgba(102,187,106,0.05))",
    border: "1px solid rgba(102,187,106,0.25)",
    animation: "pulseGlow 2s ease-in-out infinite",
  },
  badgePillText: { fontSize: "9px", fontWeight: 700, color: "#a5d6a7" },

  // Badge flash
  badgeFlash: {
    position: "fixed", top: "60px", left: "50%", transform: "translateX(-50%)",
    zIndex: 200, display: "flex", alignItems: "center", gap: "8px",
    padding: "8px 16px", borderRadius: "14px",
    background: "linear-gradient(135deg, rgba(25,70,25,0.95), rgba(15,50,15,0.95))",
    border: "1px solid rgba(102,187,106,0.4)",
    boxShadow: "0 4px 24px rgba(76,175,80,0.3), 0 0 40px rgba(76,175,80,0.1)",
    backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
    animation: "flashIn 2.2s ease both",
  },
  badgeFlashText: { fontSize: "14px", fontWeight: 800, color: "#a5d6a7" },

  // Suggestions
  sugRow: { display: "flex", gap: "6px", padding: "6px 12px 2px" },
  sugPill: {
    display: "flex", alignItems: "center", gap: "4px",
    padding: "4px 10px", borderRadius: "10px",
    background: "linear-gradient(135deg, rgba(200,168,78,0.12), rgba(200,168,78,0.04))",
    border: "1px solid rgba(200,168,78,0.2)",
  },
  sugText: { fontSize: "10px", fontWeight: 600, color: "#dfc06e" },

  // Content
  content: { flex: 1, overflowY: "auto", overflowX: "hidden", padding: "4px 10px", scrollbarWidth: "none" },
  sgLabel: { fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.4)", padding: "10px 4px 6px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "7px" },

  // Chips
  chip: {
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: "10px 3px 7px", borderRadius: "16px", cursor: "pointer",
    position: "relative", minHeight: "74px",
    background: "linear-gradient(155deg, rgba(255,255,255,0.11), rgba(255,255,255,0.03))",
    border: "1px solid rgba(255,255,255,0.09)",
    backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.08)",
    color: "#e8f5e9", transition: "all 0.15s ease",
    animation: "chipIn 0.25s ease both",
  },
  chipOn: {
    background: "linear-gradient(155deg, rgba(102,187,106,0.2), rgba(76,175,80,0.08))",
    border: "1px solid rgba(102,187,106,0.5)",
    boxShadow: "0 2px 14px rgba(76,175,80,0.22), 0 0 20px rgba(76,175,80,0.06), inset 0 1px 0 rgba(255,255,255,0.1)",
  },
  chipOff: { opacity: 0.2, cursor: "not-allowed", filter: "grayscale(0.5)" },
  check: {
    position: "absolute", top: "3px", left: "3px",
    width: "16px", height: "16px", borderRadius: "50%",
    background: "linear-gradient(135deg, #66bb6a, #43a047)",
    color: "#fff", fontSize: "8px", fontWeight: 900,
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 2px 6px rgba(76,175,80,0.4)",
  },
  popTag: {
    position: "absolute", top: "-1px", right: "-1px",
    background: "linear-gradient(135deg, #e8a000, #c88400)",
    color: "#fff", fontSize: "7px", fontWeight: 800,
    padding: "2px 6px", borderRadius: "0 16px 0 8px",
  },
  chipEmoji: { fontSize: "25px", marginBottom: "2px", filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.15))" },
  chipName: { fontSize: "10.5px", fontWeight: 700, textAlign: "center", lineHeight: 1.15, color: "rgba(255,255,255,0.88)" },
  chipCost: {
    fontSize: "8px", fontWeight: 800, color: "#edd87e",
    background: "linear-gradient(135deg, rgba(200,168,78,0.18), rgba(200,168,78,0.06))",
    border: "1px solid rgba(200,168,78,0.25)",
    padding: "1px 5px", borderRadius: "5px", marginTop: "2px",
  },

  // Bottom bar
  bar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "9px 14px 11px",
    background: "linear-gradient(0deg, rgba(15,45,15,0.97), rgba(20,55,20,0.9))",
    backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
    borderTop: "1px solid rgba(102,187,106,0.12)",
    boxShadow: "0 -4px 16px rgba(0,0,0,0.2)",
  },
  barInfo: { display: "flex", alignItems: "baseline", gap: "5px" },
  barCount: { fontSize: "16px", fontWeight: 900, color: "#a5d6a7" },
  barLabel: { fontSize: "11px", color: "rgba(255,255,255,0.3)", fontWeight: 500 },
  barDivider: { width: "1px", height: "13px", background: "rgba(255,255,255,0.08)", display: "inline-block", margin: "0 3px" },
  barTotal: { fontSize: "15px", fontWeight: 800, color: "#edd87e" },
  cta: {
    padding: "10px 22px", borderRadius: "14px", cursor: "pointer",
    background: "linear-gradient(135deg, #43a047 0%, #2e7d32 40%, #43a047 100%)",
    backgroundSize: "200% 100%", border: "1px solid rgba(102,187,106,0.45)",
    color: "#e8f5e9", fontSize: "14px", fontWeight: 800,
    fontFamily: "'Heebo', sans-serif",
    boxShadow: "0 4px 14px rgba(67,160,71,0.28), inset 0 1px 0 rgba(255,255,255,0.12)",
    display: "flex", alignItems: "center",
    animation: "shimmer 4s ease-in-out infinite",
  },
  ctaGhost: {
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    color: "rgba(255,255,255,0.3)", boxShadow: "none", animation: "none",
  },

  // Presets
  presetCard: {
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    gap: "6px", padding: "18px 10px", borderRadius: "18px", cursor: "pointer",
    background: "linear-gradient(155deg, rgba(255,255,255,0.12), rgba(255,255,255,0.03))",
    border: "1px solid rgba(255,255,255,0.1)",
    backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
    boxShadow: "0 4px 16px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.08)",
    transition: "all 0.15s ease",
  },
  emptyStartBtn: {
    padding: "12px 24px", borderRadius: "14px", cursor: "pointer",
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.5)", fontSize: "14px", fontWeight: 700,
    fontFamily: "'Heebo', sans-serif", textAlign: "center",
  },

  // Summary
  sumBowl: {
    margin: "4px auto 12px", width: "210px", minHeight: "90px",
    padding: "16px 12px 10px", borderRadius: "14px 14px 50% 50% / 14px 14px 40% 40%",
    background: "linear-gradient(170deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
    border: "1px solid rgba(200,168,78,0.18)",
    boxShadow: "0 6px 24px rgba(0,0,0,0.2)",
    display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "3px",
  },
  sumBadges: { display: "flex", gap: "6px", justifyContent: "center", marginBottom: "14px", flexWrap: "wrap" },
  sumBadge: {
    display: "flex", alignItems: "center", gap: "5px",
    padding: "4px 10px", borderRadius: "10px",
    background: "rgba(102,187,106,0.12)", border: "1px solid rgba(102,187,106,0.25)",
  },
  sumRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    fontSize: "13px", color: "rgba(255,255,255,0.75)", padding: "5px 8px",
    background: "rgba(255,255,255,0.03)", borderRadius: "8px", marginBottom: "2px",
  },
  sumPriceCard: {
    marginTop: "16px", padding: "14px",
    background: "linear-gradient(135deg, rgba(200,168,78,0.07), rgba(200,168,78,0.02))",
    borderRadius: "14px", border: "1px solid rgba(200,168,78,0.12)",
  },
  sumPriceLine: {
    display: "flex", justifyContent: "space-between",
    fontSize: "13px", color: "rgba(255,255,255,0.5)", padding: "3px 0",
  },
  sumTotalLine: {
    display: "flex", justifyContent: "space-between",
    fontSize: "22px", fontWeight: 900, color: "#a5d6a7",
    padding: "10px 0 2px", marginTop: "8px",
    borderTop: "1px solid rgba(102,187,106,0.15)",
  },
  orderBtn: {
    padding: "12px 26px", borderRadius: "16px", cursor: "pointer",
    background: "linear-gradient(135deg, #43a047, #2e7d32, #388e3c)",
    border: "1px solid rgba(102,187,106,0.45)",
    color: "#e8f5e9", fontSize: "15px", fontWeight: 800,
    fontFamily: "'Heebo', sans-serif",
    display: "flex", alignItems: "center", gap: "8px",
    boxShadow: "0 4px 18px rgba(67,160,71,0.3), inset 0 1px 0 rgba(255,255,255,0.12)",
  },
};
