'use client';
import { useState, useCallback, useEffect, useRef, useMemo } from "react";

const bgImage = "/builder-assets/BG/bg-gradient-base-mobile.png";
const headerImage = "/builder-assets/header-brand.png";
const footerImage = "/builder-assets/footer-brand.png";

import { STEPS, BASE, COMBOS, PRESETS, getSuggestions } from "../../data/salad-data.js";
import MagicBackground from "./background/MagicBackground.jsx";
import DetailSheet from "./ui/DetailSheet.jsx";
import SummaryView from "./SummaryView.jsx";
import SplashScreen from "./ui/SplashScreen.jsx";

/*
  BariBali Builder — COMPLETE v3

  ALL 12 IMPROVEMENTS INTEGRATED:
  ✅ 1.  Bowl tap-to-remove (tap any bowl item to delete it)
  ✅ 2.  Step jump (tap progress dots to navigate)
  ✅ 3.  Long-press detail + quantity toggle
  ✅ 4.  Swipe between steps
  ✅ 5.  Smart empty states per step
  ✅ 6.  Haptic feedback everywhere
  ✅ 7.  Subgroup anchor tabs (veggies step)
  ✅ 8.  Price animation (bounce + flash)
  ✅ 9.  Layered bowl on summary
  ✅ 10. Better step transitions (directional)
  ✅ 11. Order notes on summary
  ✅ 12. Sound design (Web Audio micro-sounds)

  PLUS all previous features:
  - Combo badges (live detection)
  - Layer completion hints
  - Suggestion chips
  - Presets
  - Floating produce ambient
*/

// ─── HAPTICS ────────────────────────────────────────────────

function haptic(type) {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    const p = { tap: 10, remove: [10, 30, 10], step: 20, badge: [10, 50, 10, 50, 10], order: [20, 80, 20] };
    navigator.vibrate(p[type] || 10);
  } catch (e) { }
}

// ─── MICRO-SOUNDS ────────────────────────────────────────

let audioCtx = null;
function playSound(type) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    const t = audioCtx.currentTime;
    if (type === "add") {
      osc.frequency.setValueAtTime(600, t); osc.frequency.linearRampToValueAtTime(900, t + 0.06);
      gain.gain.setValueAtTime(0.08, t); gain.gain.linearRampToValueAtTime(0, t + 0.08);
      osc.start(t); osc.stop(t + 0.08);
    } else if (type === "remove") {
      osc.frequency.setValueAtTime(500, t); osc.frequency.linearRampToValueAtTime(300, t + 0.06);
      gain.gain.setValueAtTime(0.06, t); gain.gain.linearRampToValueAtTime(0, t + 0.07);
      osc.start(t); osc.stop(t + 0.07);
    } else if (type === "step") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(400, t); osc.frequency.linearRampToValueAtTime(700, t + 0.1);
      gain.gain.setValueAtTime(0.04, t); gain.gain.linearRampToValueAtTime(0, t + 0.12);
      osc.start(t); osc.stop(t + 0.12);
    } else if (type === "badge") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(523, t); osc.frequency.setValueAtTime(659, t + 0.08); osc.frequency.setValueAtTime(784, t + 0.16);
      gain.gain.setValueAtTime(0.07, t); gain.gain.linearRampToValueAtTime(0, t + 0.3);
      osc.start(t); osc.stop(t + 0.3);
    }
  } catch (e) { }
}

// ─── STEP COLOR SYSTEM ──────────────────────────────────────

const STEP_COLORS = {
  veggies: {
    bg: "linear-gradient(145deg, rgba(56,142,60,0.18), rgba(46,125,50,0.12))",
    border: "rgba(76,175,80,0.45)",
    text: "#81c784",
    glow: "rgba(76,175,80,0.35)"
  },
  protein: {
    bg: "linear-gradient(145deg, rgba(66,165,245,0.18), rgba(30,136,229,0.12))",
    border: "rgba(66,165,245,0.45)",
    text: "#64b5f6",
    glow: "rgba(66,165,245,0.35)"
  },
  sauces: {
    bg: "linear-gradient(145deg, rgba(255,167,38,0.18), rgba(251,140,0,0.12))",
    border: "rgba(255,167,38,0.45)",
    text: "#ffb74d",
    glow: "rgba(255,167,38,0.35)"
  },
  finish: {
    bg: "linear-gradient(145deg, rgba(171,71,188,0.18), rgba(142,36,170,0.12))",
    border: "rgba(171,71,188,0.45)",
    text: "#ba68c8",
    glow: "rgba(171,71,188,0.35)"
  },
  upgrade: {
    bg: "linear-gradient(145deg, rgba(236,64,122,0.18), rgba(216,27,96,0.12))",
    border: "rgba(236,64,122,0.45)",
    text: "#f06292",
    glow: "rgba(236,64,122,0.35)"
  }
};

function getStepColor(stepId) {
  return STEP_COLORS[stepId] || STEP_COLORS.veggies;
}

// ─── PRESET COLOR SYSTEM ─────────────────────────────────────

const PRESET_COLORS = {
  // fallback
  balanced: {
    bg: "linear-gradient(145deg, rgba(200,168,78,0.22), rgba(184,134,11,0.14))",
    border: "rgba(200,168,78,0.5)",
    glow: "0 0 18px rgba(200,168,78,0.25), 0 4px 20px rgba(0,0,0,0.35)",
    text: "#edd87e",
    dot: "rgba(200,168,78,0.7)"
  },
  signature: {
    bg: "linear-gradient(145deg, rgba(240,190,60,0.26), rgba(180,130,10,0.16))",
    border: "rgba(240,190,60,0.55)",
    glow: "0 0 20px rgba(240,190,60,0.3), 0 4px 20px rgba(0,0,0,0.35)",
    text: "#fad65a",
    dot: "rgba(240,190,60,0.75)"
  },
  mediterranean: {
    bg: "linear-gradient(145deg, rgba(77,182,172,0.24), rgba(38,166,154,0.14))",
    border: "rgba(77,182,172,0.52)",
    glow: "0 0 18px rgba(77,182,172,0.28), 0 4px 20px rgba(0,0,0,0.35)",
    text: "#80cbc4",
    dot: "rgba(77,182,172,0.72)"
  },
  asian_fusion: {
    bg: "linear-gradient(145deg, rgba(149,117,205,0.26), rgba(103,58,183,0.16))",
    border: "rgba(149,117,205,0.52)",
    glow: "0 0 18px rgba(149,117,205,0.28), 0 4px 20px rgba(0,0,0,0.35)",
    text: "#ce93d8",
    dot: "rgba(149,117,205,0.72)"
  },
  protein_beast: {
    bg: "linear-gradient(145deg, rgba(66,165,245,0.24), rgba(30,136,229,0.14))",
    border: "rgba(66,165,245,0.52)",
    glow: "0 0 18px rgba(66,165,245,0.28), 0 4px 20px rgba(0,0,0,0.35)",
    text: "#64b5f6",
    dot: "rgba(66,165,245,0.72)"
  },
  rainbow: {
    bg: "linear-gradient(145deg, rgba(255,138,101,0.24), rgba(239,83,80,0.14))",
    border: "rgba(255,138,101,0.52)",
    glow: "0 0 18px rgba(255,138,101,0.28), 0 4px 20px rgba(0,0,0,0.35)",
    text: "#ffab91",
    dot: "rgba(255,138,101,0.72)"
  },
  fire_spice: {
    bg: "linear-gradient(145deg, rgba(239,83,80,0.26), rgba(183,28,28,0.16))",
    border: "rgba(239,83,80,0.55)",
    glow: "0 0 20px rgba(239,83,80,0.32), 0 4px 20px rgba(0,0,0,0.35)",
    text: "#ef9a9a",
    dot: "rgba(239,83,80,0.75)"
  },
  warm_earth: {
    bg: "linear-gradient(145deg, rgba(188,143,80,0.26), rgba(141,94,30,0.16))",
    border: "rgba(188,143,80,0.52)",
    glow: "0 0 18px rgba(188,143,80,0.28), 0 4px 20px rgba(0,0,0,0.35)",
    text: "#d4a96a",
    dot: "rgba(188,143,80,0.72)"
  },
  garden_fresh: {
    bg: "linear-gradient(145deg, rgba(102,187,106,0.26), rgba(56,142,60,0.16))",
    border: "rgba(102,187,106,0.55)",
    glow: "0 0 18px rgba(102,187,106,0.3), 0 4px 20px rgba(0,0,0,0.35)",
    text: "#a5d6a7",
    dot: "rgba(102,187,106,0.72)"
  },
  pasta_garden: {
    bg: "linear-gradient(145deg, rgba(255,167,38,0.22), rgba(230,81,0,0.14))",
    border: "rgba(255,167,38,0.5)",
    glow: "0 0 18px rgba(255,167,38,0.25), 0 4px 20px rgba(0,0,0,0.35)",
    text: "#ffcc80",
    dot: "rgba(255,167,38,0.7)"
  },
  detox_bowl: {
    bg: "linear-gradient(145deg, rgba(38,198,218,0.22), rgba(0,172,193,0.14))",
    border: "rgba(38,198,218,0.5)",
    glow: "0 0 18px rgba(38,198,218,0.25), 0 4px 20px rgba(0,0,0,0.35)",
    text: "#80deea",
    dot: "rgba(38,198,218,0.7)"
  },
  crunchy_master: {
    bg: "linear-gradient(145deg, rgba(212,200,160,0.2), rgba(175,165,125,0.12))",
    border: "rgba(212,200,160,0.45)",
    glow: "0 0 16px rgba(212,200,160,0.2), 0 4px 20px rgba(0,0,0,0.35)",
    text: "#e8dfc0",
    dot: "rgba(212,200,160,0.65)"
  },
  eastern_night: {
    bg: "linear-gradient(145deg, rgba(92,107,192,0.24), rgba(57,73,171,0.15))",
    border: "rgba(92,107,192,0.52)",
    glow: "0 0 18px rgba(92,107,192,0.28), 0 4px 20px rgba(0,0,0,0.35)",
    text: "#9fa8da",
    dot: "rgba(92,107,192,0.72)"
  },
};

// ─── SIZE CONFIG ─────────────────────────────────────────────
const SIZE_CONFIG = {
  750:  { ml: 750,  label: '750 מ"ל',  price: 54, desc: "סלט אישי" },
  1000: { ml: 1000, label: '1000 מ"ל', price: 59, desc: "סלט רגיל" },
  1500: { ml: 1500, label: '1500 מ"ל', price: 72, desc: "סלט גדול" },
};
function parseSizeParam(raw) {
  try {
    if (!raw) return null;
    const MAP = { S: 750, M: 1000, L: 1500 };
    const v = MAP[raw.toUpperCase()] ?? parseInt(raw);
    return SIZE_CONFIG[v] ? v : null;
  } catch(e) { return null; }
}

// ─── BUILDER PARTICLES ──────────────────────────────────────
function BuilderParticles() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d');
    const resize = () => { c.width = c.offsetWidth; c.height = c.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);

    const sparkCols = ['#f0c832','#ffe066','#f0a820','#c8d830','#fffacc'];
    const bokehCols = ['#c8a832','#f0d060','#ffe066','#d4a820'];

    const sparks = Array.from({ length: 70 }, () => ({
      x: Math.random() * c.width, y: Math.random() * c.height,
      r: Math.random() * 2.5 + 0.4, s: Math.random() * 0.45 + 0.1,
      o: Math.random() * 0.3 + 0.06, col: sparkCols[Math.floor(Math.random() * sparkCols.length)],
      d: (Math.random() - 0.5) * 0.22, ph: Math.random() * Math.PI * 2,
    }));
    const bokeh = Array.from({ length: 18 }, () => ({
      x: Math.random() * c.width, y: Math.random() * c.height,
      r: Math.random() * 52 + 16, s: Math.random() * 0.07 + 0.02,
      o: Math.random() * 0.05 + 0.015, col: bokehCols[Math.floor(Math.random() * bokehCols.length)],
      ph: Math.random() * Math.PI * 2,
    }));

    let raf, t = 0;
    const draw = () => {
      t += 0.012; ctx.clearRect(0, 0, c.width, c.height);
      for (const b of bokeh) {
        b.y -= b.s; b.x += Math.sin(t * 0.4 + b.ph) * 0.16;
        b.o = 0.015 + Math.sin(t * 0.5 + b.ph) * 0.035 + 0.02;
        if (b.y < -b.r * 2) { b.y = c.height + b.r; b.x = Math.random() * c.width; }
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, b.col); g.addColorStop(1, 'transparent');
        ctx.save(); ctx.globalAlpha = Math.min(0.1, Math.max(0, b.o));
        ctx.fillStyle = g; ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      for (const p of sparks) {
        p.y -= p.s; p.x += p.d + Math.sin(t + p.ph) * 0.11;
        p.o = 0.05 + Math.sin(t * 0.9 + p.ph) * 0.2 + 0.08;
        if (p.y < -6) { p.y = c.height + 6; p.x = Math.random() * c.width; }
        if (p.x < 0) p.x = c.width; if (p.x > c.width) p.x = 0;
        ctx.save(); ctx.globalAlpha = Math.min(0.6, Math.max(0, p.o));
        ctx.shadowBlur = p.r * 6; ctx.shadowColor = p.col;
        ctx.fillStyle = p.col; ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }} />;
}

// ─── MAIN ───────────────────────────────────────────────────

/** @param {{ sizeParam?: string | null }} props */
export default function BariBaliBuilder({ sizeParam = null }) {
  const [splash, setSplash] = useState(true);
  const [step, setStep] = useState(-1);
  const [selectedSize, setSelectedSize] = useState(() => parseSizeParam(sizeParam));
  const [sels, setSels] = useState({});
  const [lastAdd, setLastAdd] = useState(null);
  const [lastRemove, setLastRemove] = useState(null);
  const [summary, setSummary] = useState(false);
  const [anim, setAnim] = useState("enter");
  const [slideDir, setSlideDir] = useState(1);
  const [comboBadges, setComboBadges] = useState([]);
  const [badgeFlash, setBadgeFlash] = useState(null);
  const [shownBadges, setShownBadges] = useState(new Set());
  const [detailCtx, setDetailCtx] = useState(null); // { item, stepId, maxPicks }
  const [showLongPressHint, setShowLongPressHint] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowLongPressHint(false), 15000);
    return () => clearTimeout(t);
  }, []);
  const [priceFlash, setPriceFlash] = useState(null);
  const activeBase = selectedSize ? SIZE_CONFIG[selectedSize].price : BASE;
  const [prevPrice, setPrevPrice] = useState(activeBase);
  const [activeAnchor, setActiveAnchor] = useState(0);
  const [notes, setNotes] = useState("");
  const [expandedPreset, setExpandedPreset] = useState(null);
  const [isTransforming, setIsTransforming] = useState(false);
  const scrollRef = useRef(null);
  const touchRef = useRef({ x: 0, y: 0, t: 0 });
  const longPressRef = useRef(null);
  const sgRefs = useRef([]);

  useEffect(() => { setTimeout(() => setAnim(null), 500); }, []);
  useEffect(() => {
    if (step !== 0) return;
    setShowLongPressHint(true);
    const t = setTimeout(() => setShowLongPressHint(false), 15000);
    return () => clearTimeout(t);
  }, [step]);

  // ─── Load draft from localStorage ───
  useEffect(() => {
    try {
      const draft = localStorage.getItem("baribali-draft");
      if (draft) {
        const parsed = JSON.parse(draft);

        // Migrate old drafts without metadata
        const migratedSels = {};
        Object.entries(parsed.sels || {}).forEach(([stepId, items]) => {
          migratedSels[stepId] = items.map(item => {
            if (!item._meta) {
              return { ...item, _meta: { stepId } };
            }
            return item;
          });
        });

        setSels(migratedSels);
        setNotes(parsed.notes || "");
      }
    } catch (e) { }
  }, []);

  // ─── Save draft to localStorage ───
  useEffect(() => {
    try {
      if (Object.keys(sels).length > 0 || notes) {
        localStorage.setItem("baribali-draft", JSON.stringify({ sels, notes }));
      }
    } catch (e) { }
  }, [sels, notes]);

  const cur = step >= 0 ? STEPS[step] : null;
  const getSel = id => sels[id] || [];
  const all = useMemo(() => Object.values(sels).flat(), [sels]);
  const allTags = useMemo(() => all.flatMap(i => i.tags || []), [all]);
  const extras = all.reduce((s, i) => s + (i.price || 0), 0);
  const total = activeBase + extras;
  const curSel = cur ? getSel(cur.id) : [];

  // ─── Price animation ───
  useEffect(() => {
    if (total !== prevPrice) {
      setPriceFlash(total > prevPrice ? "up" : "down");
      setTimeout(() => setPriceFlash(null), 400);
      setPrevPrice(total);
    }
  }, [total, prevPrice]);

  // ─── Combo detection ───
  useEffect(() => {
    const earned = COMBOS.filter(c => c.check(allTags, all));
    setComboBadges(earned);
    earned.forEach(b => {
      if (!shownBadges.has(b.id) && all.length > 0) {
        setBadgeFlash(b); haptic("badge"); playSound("badge");
        setShownBadges(prev => new Set([...prev, b.id]));
        setTimeout(() => setBadgeFlash(null), 2200);
      }
    });
  }, [allTags, all, shownBadges]);

  const suggestions = useMemo(() => step === 0 ? getSuggestions(allTags, all) : [], [allTags, all, step]);

  // ─── Core toggle (add/remove ingredient) ───
  const toggle = useCallback((sid, item, max) => {
    setSels(prev => {
      const cur = prev[sid] || [];
      const exists = cur.find(i => i.id === item.id);
      if (exists) {
        haptic("remove"); playSound("remove");
        setLastRemove(item.id); setTimeout(() => setLastRemove(null), 300);
        return { ...prev, [sid]: cur.filter(i => i.id !== item.id) };
      }

      // Add metadata to item
      const itemWithMeta = { ...item, _meta: { stepId: sid } };

      if (sid === "finish") {
        const st = STEPS.find(s => s.id === sid);
        let sgIds = [];
        st.subgroups.forEach(sg => { if (sg.items.some(i => i.id === item.id)) sgIds = sg.items.map(i => i.id); });
        haptic("tap"); playSound("add");
        setLastAdd(item.id); setTimeout(() => setLastAdd(null), 350);
        return { ...prev, [sid]: [...cur.filter(i => !sgIds.includes(i.id)), itemWithMeta] };
      }
      if (max && cur.length >= max) {
        if (max === 1) { haptic("tap"); playSound("add"); setLastAdd(item.id); setTimeout(() => setLastAdd(null), 350); return { ...prev, [sid]: [itemWithMeta] }; }
        return prev;
      }
      haptic("tap"); playSound("add");
      setLastAdd(item.id); setTimeout(() => setLastAdd(null), 350);
      return { ...prev, [sid]: [...cur, itemWithMeta] };
    });
  }, []);

  // ─── Remove from bowl strip ───
  const removeFromBowl = useCallback((itemId) => {
    haptic("remove"); playSound("remove");
    setLastRemove(itemId); setTimeout(() => setLastRemove(null), 300);
    setSels(prev => {
      const next = {};
      Object.entries(prev).forEach(([k, v]) => { next[k] = v.filter(i => i.id !== itemId); });
      return next;
    });
  }, []);

  // ─── Presets ───
  const loadPreset = useCallback((preset) => {
    const allItems = STEPS.flatMap(s => s.subgroups.flatMap(sg => sg.items));
    const v = [], p = [], sc = [];
    preset.items.forEach(id => {
      const item = allItems.find(i => i.id === id);
      if (!item) return;
      const inStep = STEPS.find(s => s.subgroups.some(sg => sg.items.some(i => i.id === id)));

      // Add metadata to preset items
      const itemWithMeta = { ...item, _meta: { stepId: inStep?.id } };

      if (inStep?.id === "veggies") v.push(itemWithMeta);
      else if (inStep?.id === "protein") p.push(itemWithMeta);
      else if (inStep?.id === "sauces") sc.push(itemWithMeta);
    });
    setSels({ veggies: v, protein: p, sauces: sc });
    haptic("step"); playSound("step");

    // Trigger background transformation
    setIsTransforming(true);
    setTimeout(() => setIsTransforming(false), 500);

    setStep(0);
  }, []);

  // ─── Clear draft ───
  const clearDraft = useCallback(() => {
    if (window.confirm("למחוק את הטיוטה הנוכחית?")) {
      localStorage.removeItem("baribali-draft");
      setSels({});
      setNotes("");
      setStep(-1);
      haptic("remove");
    }
  }, []);

  // ─── Directional transitions ───
  const goTo = useCallback((target) => {
    if (target === step) return;
    const dir = target > step ? 1 : -1;
    setSlideDir(dir); setAnim("out");
    haptic("step"); playSound("step");

    // Trigger background transformation
    setIsTransforming(true);
    setTimeout(() => setIsTransforming(false), 500);

    setTimeout(() => {
      setStep(target); setAnim("in"); setActiveAnchor(0);
      scrollRef.current?.scrollTo(0, 0);
      setTimeout(() => setAnim(null), 220);
    }, 160);
  }, [step]);

  const next = () => step < STEPS.length - 1 ? goTo(step + 1) : setSummary(true);
  const back = () => {
    if (summary) setSummary(false);
    else if (step > 0) goTo(step - 1);
    else if (step === 0) goTo(-1);
  };
  const resetAll = () => {
    setSels({});
    setNotes("");
    setComboBadges([]);
    setShownBadges(new Set());
    setSummary(false);
    setSelectedSize(sizeParam ? parseSizeParam(sizeParam) : null);
    setStep(-1);
    localStorage.removeItem("baribali-draft");
    haptic("step");
  };

  // ─── Swipe detection ───
  const onTouchStart = useCallback((e) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
  }, []);
  const onTouchEnd = useCallback((e) => {
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    const dt = Date.now() - touchRef.current.t;
    if (dt > 500 || Math.abs(dy) > 40 || Math.abs(dx) < 60) return;
    // RTL: swipe right = next, swipe left = back
    if (dx > 60) next();
    else if (dx < -60) back();
  }, [step, summary]);

  // ─── Long-press for detail ───
  const onChipTouchStart = (item) => {
    setShowLongPressHint(false);
    longPressRef.current = setTimeout(() => {
      setDetailCtx({ item, stepId: cur?.id, maxPicks: cur?.maxPicks }); haptic("tap");
    }, 500);
  };
  const onChipTouchEnd = () => { clearTimeout(longPressRef.current); };

  // ─── Anchor tab scroll ───
  const scrollToSg = (idx) => {
    setActiveAnchor(idx);
    sgRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ─── Preset screen ───
  if (step === -1 && !summary) {
    const hasDraft = Object.keys(sels).length > 0 || notes;

    // ── Size picker (shown when no size selected) ──
    if (!selectedSize) {
      return (
        <div style={S.root}>
          {splash && <SplashScreen onDone={() => setSplash(false)} />}
          <div style={S.bg} /><div style={S.bgRay} />
          <MagicBackground isTransforming={isTransforming} />
          <BuilderParticles />
          <div style={{ ...S.main, padding: "0 0 40px", opacity: anim === "enter" ? 0 : 1, transition: "all 0.5s" }}>
            <img src={headerImage} alt="" aria-hidden="true" style={{ width: "100%", display: "block", height: "80px", objectFit: "cover", objectPosition: "center top", flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1, padding: "24px 16px 0" }}>
              <div style={{ textAlign: "center", marginBottom: "8px" }}>
                <div style={{ fontSize: "20px", fontWeight: 900, color: "#f0d060", textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>בחרו גודל סלט</div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", marginTop: "4px", fontWeight: 500 }}>המחיר משתנה בהתאם לגודל</div>
              </div>
              {Object.values(SIZE_CONFIG).map(sc => (
                <button key={sc.ml} onClick={() => { setSelectedSize(sc.ml); haptic("step"); }}
                  style={S.sizeCard}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <span style={{ fontSize: "32px" }}>🥗</span>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "20px", fontWeight: 900, color: "#ffffff", textShadow: "0 2px 6px rgba(0,0,0,0.6)" }}>{sc.label}</div>
                        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", fontWeight: 500, marginTop: "2px" }}>{sc.desc}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: "11px", color: "rgba(200,168,78,0.6)", fontWeight: 600 }}>החל מ</div>
                      <div style={{ fontSize: "24px", fontWeight: 900, color: "#f0d060", textShadow: "0 2px 8px rgba(200,168,78,0.4)", lineHeight: 1 }}>₪{sc.price}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <style>{KF}</style>
        </div>
      );
    }

    const sc = SIZE_CONFIG[selectedSize];
    return (
      <div style={S.root}>
        {splash && <SplashScreen onDone={() => setSplash(false)} />}
        <div style={S.bg} /><div style={S.bgRay} />
        <MagicBackground isTransforming={isTransforming} />
        <BuilderParticles />
        <div style={{
          ...S.main, justifyContent: "space-between", padding: "0 0 90px",
          opacity: anim === "enter" ? 0 : 1, transform: anim === "enter" ? "translateY(12px)" : "none", transition: "all 0.5s"
        }}>
          {/* Brand header banner */}
          <img src={headerImage} alt="" aria-hidden="true" style={{ width: "100%", display: "block", height: "80px", objectFit: "cover", objectPosition: "center top", flexShrink: 0 }} />

          <div style={{ display: "flex", flexDirection: "column", gap: "24px", flex: 1, padding: "20px 16px 24px", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>

            {/* Size badge + change */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 14px", borderRadius: "12px", background: "linear-gradient(135deg, rgba(200,168,78,0.2), rgba(200,168,78,0.08))", border: "1.5px solid rgba(200,168,78,0.45)" }}>
                <span style={{ fontSize: "16px" }}>🥗</span>
                <span style={{ fontSize: "15px", fontWeight: 900, color: "#f0d060" }}>{sc.label}</span>
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>{sc.desc}</span>
              </div>
              <button onClick={() => setSelectedSize(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "11px", color: "rgba(255,255,255,0.35)", fontFamily: "'Heebo',sans-serif", fontWeight: 600, padding: "4px 8px" }}>שנה גודל</button>
            </div>

            {/* HERO - Start Empty Button (Glassy) */}
            <button
              onClick={() => { setStep(0); haptic("step"); playSound("step"); }}
              style={S.heroBtn}
              aria-label="התחל סלט ריק"
              tabIndex={0}
            >
              <div style={{ fontSize: "48px", marginBottom: "10px", filter: "drop-shadow(0 4px 12px rgba(102,187,106,0.5))" }}>🥗</div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#e8f5e9", textShadow: "0 3px 8px rgba(0,0,0,0.8), 0 0 20px rgba(102,187,106,0.4)", marginBottom: "4px", letterSpacing: "0.02em" }}>בנו את הסלט שלכם</div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", textShadow: "0 2px 4px rgba(0,0,0,0.7)", fontWeight: 500, marginBottom: "14px" }}>5 שלבים פשוטים · בחירה חופשית</div>
              <div style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "6px 16px", borderRadius: "20px",
                background: "rgba(0,0,0,0.25)",
                border: "1px solid rgba(255,255,255,0.12)"
              }}>
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>החל מ</span>
                <span style={{ fontSize: "20px", fontWeight: 900, color: "#edd87e", textShadow: "0 2px 6px rgba(200,168,78,0.4)" }}>₪{sc.price}</span>
                <span style={{ width: "1px", height: "14px", background: "rgba(255,255,255,0.15)" }} />
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>התחל ריק ←</span>
              </div>
            </button>

            {/* Presets - Secondary */}
            <div style={{ width: "100%" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: "10px",
                marginBottom: "12px"
              }}>
                <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15))" }} />
                <span style={{
                  fontSize: "11px", fontWeight: 700,
                  color: "rgba(255,255,255,0.5)",
                  textTransform: "uppercase", letterSpacing: "0.08em",
                  textShadow: "0 1px 2px rgba(0,0,0,0.5)"
                }}>מתכוני שף</span>
                <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, rgba(255,255,255,0.15), transparent)" }} />
              </div>
              {(() => {
                const allIngredients = STEPS.flatMap(s => s.subgroups.flatMap(sg => sg.items));
                const ep = expandedPreset ? PRESETS.find(x => x.id === expandedPreset) : null;
                const epc = ep ? (PRESET_COLORS[ep.id] || PRESET_COLORS.balanced) : null;
                return (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px" }}>
                      {PRESETS.map(p => {
                        const pc = PRESET_COLORS[p.id] || PRESET_COLORS.balanced;
                        const isOpen = expandedPreset === p.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => setExpandedPreset(isOpen ? null : p.id)}
                            style={{
                              ...S.presetCard,
                              background: pc.bg,
                              border: `1px solid ${isOpen ? pc.text : pc.border}`,
                              boxShadow: isOpen ? `${pc.glow}, inset 0 0 0 1px ${pc.border}` : pc.glow,
                              opacity: expandedPreset && !isOpen ? 0.55 : 1,
                              transform: isOpen ? "scale(1.02)" : "scale(1)",
                              transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
                            }}
                            aria-expanded={isOpen}
                            aria-label={`מתכון ${p.he}`}
                            tabIndex={0}
                          >
                            <span style={{ fontSize: "18px", flexShrink: 0, filter: `drop-shadow(0 1px 4px ${pc.dot})` }} aria-hidden="true">{p.icon}</span>
                            <span style={{ flex: 1, fontSize: "11.5px", fontWeight: 800, color: pc.text, textAlign: "right", lineHeight: 1.2 }}>{p.he}</span>
                            <span style={{ fontSize: "9px", fontWeight: 700, color: isOpen ? pc.text : "rgba(255,255,255,0.28)", flexShrink: 0, transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "none" }}>▾</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Expansion Panel */}
                    {ep && epc && (
                      <div key={ep.id} style={{
                        marginTop: "8px",
                        borderRadius: "14px",
                        background: epc.bg,
                        border: `1.5px solid ${epc.border}`,
                        boxShadow: epc.glow,
                        overflow: "hidden",
                        animation: "expandIn 0.28s cubic-bezier(0.22,1.2,0.36,1) both",
                      }}>
                        {/* Header */}
                        <div style={{ padding: "14px 14px 10px", display: "flex", alignItems: "center", gap: "10px", borderBottom: `1px solid ${epc.border}` }}>
                          <span style={{ fontSize: "26px", filter: `drop-shadow(0 2px 8px ${epc.dot})`, flexShrink: 0 }}>{ep.icon}</span>
                          <span style={{ flex: 1, fontSize: "15px", fontWeight: 900, color: epc.text, textAlign: "right" }}>{ep.he}</span>
                          <button
                            onClick={() => setExpandedPreset(null)}
                            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: "14px", cursor: "pointer", padding: "2px 4px", lineHeight: 1, flexShrink: 0 }}
                            aria-label="סגור"
                          >✕</button>
                        </div>

                        {/* Description */}
                        <div style={{ padding: "10px 14px 0" }}>
                          <p style={{ fontSize: "12.5px", lineHeight: 1.65, color: "rgba(255,255,255,0.75)", margin: 0, fontWeight: 500, textAlign: "right" }}>{ep.desc}</p>
                        </div>

                        {/* Ingredient chips */}
                        <div style={{ padding: "10px 14px", display: "flex", flexWrap: "wrap", gap: "5px", justifyContent: "flex-end" }}>
                          {ep.items.map(id => {
                            const item = allIngredients.find(i => i.id === id);
                            if (!item) return null;
                            return (
                              <span key={id} style={{
                                fontSize: "10px", fontWeight: 600,
                                padding: "2px 8px", borderRadius: "8px",
                                background: "rgba(255,255,255,0.08)",
                                color: "rgba(255,255,255,0.6)",
                                border: `1px solid ${epc.border}`,
                                whiteSpace: "nowrap",
                              }}>{item.icon} {item.he}</span>
                            );
                          })}
                        </div>

                        {/* CTA */}
                        <div style={{ padding: "0 14px 14px" }}>
                          <button
                            onClick={() => { loadPreset(ep); setExpandedPreset(null); }}
                            style={{
                              width: "100%", padding: "11px 0", borderRadius: "10px",
                              border: "none", cursor: "pointer",
                              background: `linear-gradient(135deg, ${epc.dot}, ${epc.border})`,
                              color: "#0a1a0a", fontSize: "14px", fontWeight: 900,
                              fontFamily: "'Heebo',sans-serif",
                              boxShadow: `0 4px 18px ${epc.dot}`,
                              letterSpacing: "0.02em",
                            }}
                          >
                            בנה את {ep.he} ←
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Clear Draft Button - Fixed at bottom center */}
          {hasDraft && (
            <div style={{ position: "fixed", bottom: "20px", left: "50%", transform: "translateX(-50%)", zIndex: 10 }}>
              <button onClick={clearDraft} style={S.clearDraftBtn} aria-label="מחק טיוטה">
                🗑️ מחק טיוטה
              </button>
            </div>
          )}
        </div>
        <style>{KF}</style>
      </div>
    );
  }

  if (summary) return <SummaryView sels={sels} total={total} all={all} comboBadges={comboBadges} notes={notes} setNotes={setNotes} onBack={back} onEdit={(stepIndex) => { setSummary(false); setStep(stepIndex); }} onNewOrder={resetAll} base={activeBase} sizeLabel={selectedSize ? SIZE_CONFIG[selectedSize].label : null} />;

  const slideX = anim === "out" ? (slideDir > 0 ? "-16px" : "16px") : anim === "in" ? "0" : undefined;

  return (
    <div style={S.root} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {splash && <SplashScreen onDone={() => setSplash(false)} />}
      <div style={S.bg} /><div style={S.bgRay} />
      <MagicBackground isTransforming={isTransforming} stepId={step >= 0 ? STEPS[step]?.id : null} />

      {badgeFlash && <div style={S.badgeFlash}><span style={{ fontSize: "22px" }}>{badgeFlash.icon}</span><span style={S.badgeFlashTxt}>{badgeFlash.he}</span></div>}

      {/* Detail overlay */}
      {detailCtx && (
        <DetailSheet
          item={detailCtx.item}
          isAdded={(sels[detailCtx.stepId] || []).some(i => i.id === detailCtx.item.id)}
          onToggle={() => { toggle(detailCtx.stepId, detailCtx.item, detailCtx.maxPicks); setDetailCtx(null); }}
          onClose={() => setDetailCtx(null)}
        />
      )}

      <div style={{ ...S.main, opacity: anim === "enter" ? 0 : 1, transition: "opacity 0.4s" }}>

        {/* ── HEADER ── */}
        <div style={S.header} role="banner">
          {/* Contrast plate behind text */}
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "calc(100% + 40px)",
            height: "calc(100% + 40px)",
            background: "radial-gradient(circle, rgba(20,60,20,0.15) 0%, transparent 70%)",
            zIndex: 0,
            pointerEvents: "none"
          }} />
          <div style={S.headerTop}>
            <button style={S.backBtn} onClick={back} aria-label="חזור לשלב הקודם" tabIndex={0}>←</button>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ fontSize: "17px" }}>{cur.emoji}</span>
                <div style={{
                  position: "relative",
                  display: "inline-block",
                  padding: "10px 20px",
                  borderRadius: "18px",
                  background: "linear-gradient(145deg, rgba(8,22,8,0.97), rgba(13,40,13,0.95))",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  border: "1px solid rgba(200,168,78,0.25)",
                  zIndex: 1
                }}>
                  <span style={{
                    fontSize: "17px",
                    fontWeight: 900,
                    color: "#ffffff",
                    textShadow: "0 2px 6px rgba(0,0,0,0.6)"
                  }}>{cur.title}</span>
                </div>
                <span style={{ fontSize: "11px", color: "rgba(200,168,78,0.85)", fontWeight: 600 }}>{cur.subtitle}</span>
              </div>
              {/* Layer pills */}
              <div style={{ display: "flex", gap: "4px", marginTop: "4px", flexWrap: "wrap" }}>
                {[{ k: "base", l: "בסיס", i: "🌿" }, { k: "protein", l: "חלבון", i: "💪" }, { k: "grain", l: "דגנים", i: "🌾" }, { k: "flavor", l: "טעם", i: "✨" }].map(lyr => {
                  const done = lyr.k === "protein" ? (sels.protein || []).length > 0 : allTags.includes(lyr.k) || (lyr.k === "flavor" && allTags.includes("herb"));
                  return <div key={lyr.k} style={{ ...S.layerPill, background: done ? "rgba(200,168,78,0.15)" : "rgba(255,255,255,0.04)", borderColor: done ? "rgba(200,168,78,0.35)" : "rgba(255,255,255,0.06)" }}>
                    <span style={{ fontSize: "9px" }}>{lyr.i}</span>
                    <span style={{ fontSize: "8px", fontWeight: 700, color: done ? "#d4b84a" : "rgba(255,255,255,0.2)" }}>{lyr.l}</span>
                    {done && <span style={{ fontSize: "7px", color: "#f0d060" }}>✓</span>}
                  </div>;
                })}
              </div>
            </div>
            {/* Animated price */}
            <div style={{ ...S.pricePill, transform: priceFlash ? "scale(1.08)" : "scale(1)", boxShadow: priceFlash === "up" ? "0 0 12px rgba(200,168,78,0.5)" : priceFlash === "down" ? "0 0 12px rgba(102,187,106,0.5)" : "0 2px 8px rgba(200,168,78,0.12)", transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)" }}>
              <span style={S.priceS}>₪</span><span style={S.priceV}>{total}</span>
            </div>
          </div>

          {/* Tappable progress dots */}
          <div style={S.progressRow} role="progressbar" aria-valuemin={0} aria-valuemax={STEPS.length - 1} aria-valuenow={step} aria-label={`שלב ${step + 1} מתוך ${STEPS.length}`}>
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => { if (i <= step + 1) goTo(i); }}
                disabled={i > step + 1}
                aria-label={`${s.title}${i < step ? " - הושלם" : i === step ? " - נוכחי" : i === step + 1 ? " - הבא" : " - לא זמין"}`}
                style={{
                  height: "4px", flex: 1, borderRadius: "2px", border: "none", padding: 0, cursor: i <= step + 1 ? "pointer" : "default",
                  background: i < step ? "linear-gradient(90deg, #d4b84a, #f0d060)" : i === step ? "linear-gradient(90deg, #f0d060, #ffe066)" : "rgba(255,255,255,0.08)",
                  transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
                  boxShadow: i <= step ? "0 0 6px rgba(200,168,78,0.4)" : "none",
                  opacity: i > step + 1 ? 0.4 : 1,
                }}
              />
            ))}
          </div>
        </div>

        {/* ── BOWL STRIP (tap to remove) ── */}
        <div style={S.bowlArea}>
          {all.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "6px 0" }}>
              <span style={{ opacity: 0.25, fontSize: "18px" }}>🥗</span>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>הקערה ריקה</span>
            </div>
          ) : (
            <div style={S.bowlScroll}>
              {all.map(item => {
                // Use metadata to get the correct step color
                const stepId = item._meta?.stepId || "veggies";
                const catColor = getStepColor(stepId);

                return (
                  <button
                    key={item.id}
                    onClick={() => removeFromBowl(item.id)}
                    style={{
                      ...S.bowlPiece,
                      border: `2px solid ${catColor.border}`,
                      boxShadow: `0 0 6px ${catColor.glow}, 0 2px 4px rgba(0,0,0,0.2)`,
                      animation: lastAdd === item.id ? "popBounce 0.3s cubic-bezier(0.34,1.56,0.64,1)" : lastRemove === item.id ? "popOut 0.25s ease forwards" : "none",
                      opacity: lastRemove === item.id ? 0 : 1,
                    }}
                  >
                    <span style={{ fontSize: "15px", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.2))" }}>{item.icon}</span>
                  </button>
                );
              })}
            </div>
          )}
          {comboBadges.length > 0 && (
            <div style={{ display: "flex", gap: "5px", marginTop: "4px", flexWrap: "wrap" }}>
              {comboBadges.map(b => <div key={b.id} style={S.badgePill}><span style={{ fontSize: "10px" }}>{b.icon}</span><span style={S.badgePillTxt}>{b.he}</span></div>)}
            </div>
          )}
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && <div style={S.sugRow}>{suggestions.map((s, i) => <div key={i} style={S.sugPill}><span style={{ fontSize: "11px" }}>{s.icon}</span><span style={{ fontSize: "11px", fontWeight: 700, color: "#f0d060", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>{s.text}</span></div>)}</div>}

        {/* Anchor tabs (veggies only) */}
        {cur.id === "veggies" && (
          <div style={S.anchorRow}>
            {cur.subgroups.map((sg, i) => {
              const stepColor = getStepColor("veggies");
              const isActive = activeAnchor === i;
              return (
                <button
                  key={i}
                  onClick={() => scrollToSg(i)}
                  style={{
                    ...S.anchorTab,
                    ...(isActive ? {
                      background: stepColor.bg,
                      borderColor: stepColor.border,
                      color: stepColor.text,
                      boxShadow: `0 0 8px ${stepColor.glow}`
                    } : {})
                  }}
                >
                  {sg.shortLabel || sg.label}
                </button>
              );
            })}
          </div>
        )}

        {/* ── CONTENT (directional slide) ── */}
        <div style={{ ...S.content, opacity: anim === "out" ? 0 : 1, transform: anim === "out" ? `translateX(${slideX})` : "translateX(0)", transition: "all 0.16s ease" }} ref={scrollRef} role="main" aria-label={`${cur.title} - בחרו מרכיבים`}>

          {/* Long-press discovery hint — shows once on load, fades out */}
          {showLongPressHint && (
            <div style={S.longPressHint}>
              <span style={{ fontSize: "32px", lineHeight: 1 }}>👆</span>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 900, color: "#f0d060", marginBottom: "2px" }}>למידע נוסף על הרכיב</div>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.65)" }}>לחיצה ארוכה</div>
              </div>
            </div>
          )}

          {/* Empty state intro */}
          {curSel.length === 0 && cur.intro && (
            <div style={S.introCard}><span style={{ fontSize: "13px" }}>{cur.emoji}</span><span style={S.introText}>{cur.intro}</span></div>
          )}

          {cur.subgroups.map((sg, si) => {
            return (
              <div key={si} ref={el => sgRefs.current[si] = el}>
                {sg.label && <div style={S.sgLabel}>{sg.label}</div>}
                <div style={S.grid}>
                  {sg.items.map((item, idx) => {
                    const on = curSel.some(s => s.id === item.id);
                    const full = !on && cur.maxPicks && cur.maxPicks > 1 && curSel.length >= cur.maxPicks;
                    return (
                      <button key={item.id} disabled={full}
                        onClick={() => toggle(cur.id, item, cur.maxPicks)}
                        onTouchStart={() => onChipTouchStart(item)} onTouchEnd={onChipTouchEnd}
                        onMouseDown={() => onChipTouchStart(item)} onMouseUp={onChipTouchEnd} onMouseLeave={onChipTouchEnd}
                        onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(cur.id, item, cur.maxPicks); } }}
                        aria-label={`${item.he}${item.price > 0 ? `, תוספת ${item.price} שקלים` : ""}${on ? ", נבחר" : ""}${item.desc ? `, ${item.desc}` : ""}`}
                        aria-pressed={on}
                        aria-disabled={full}
                        role="checkbox"
                        tabIndex={0}
                        style={{ ...S.chip, ...(on ? S.chipOn : {}), ...(full ? S.chipOff : {}), animationDelay: `${(si * 5 + idx) * 20}ms` }}>
                        {on && <div style={S.check} aria-hidden="true">✓</div>}
                        {item.pop && <div style={S.popTag} aria-hidden="true">פופולרי</div>}
                        <div style={{ position: "absolute", bottom: "4px", right: "5px", fontSize: "8px", color: "rgba(255,255,255,0.18)", lineHeight: 1, pointerEvents: "none" }} aria-hidden="true">ℹ</div>
                        <span style={{ ...S.chipEmoji, transform: lastAdd === item.id ? "scale(1.4) rotate(-10deg)" : "scale(1)", transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1)" }} aria-hidden="true">{item.icon}</span>
                        <span style={S.chipName}>{item.he}</span>
                        {item.price > 0 && <span style={S.chipCost}>+₪{item.price}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div style={{ height: "110px" }} />
        </div>

        {/* ── BOTTOM ── */}
        <div style={S.bar}>
          <div style={S.barInfo}>
            <div style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              borderRadius: "12px",
              background: "linear-gradient(145deg, rgba(8,22,8,0.98), rgba(13,40,13,0.96))",
              border: "1px solid rgba(200,168,78,0.3)"
            }}>
              <span style={{ fontSize: "18px", fontWeight: 900, color: "#ffffff", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>{all.length}</span>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>מרכיבים</span>
              <div style={{ width: "1px", height: "14px", background: "rgba(200,168,78,0.3)" }} />
              <span style={{ fontSize: "18px", fontWeight: 900, color: "#f0d060", textShadow: "0 2px 6px rgba(200,168,78,0.4)" }}>₪{total}</span>
            </div>
          </div>
          <button
            style={{ ...S.cta, ...(cur.id === "upgrade" && curSel.length === 0 ? S.ctaGhost : {}) }}
            onClick={next}
            aria-label={step === STEPS.length - 1 ? (curSel.length > 0 ? "עבור לסיכום" : "דלג ועבור לסיכום") : `עבור לשלב הבא - ${STEPS[step + 1]?.title || ""}`}
            tabIndex={0}
          >
            {step === STEPS.length - 1 ? (curSel.length > 0 ? "לסיכום" : "דלגו") : "המשך"}<span style={{ marginRight: "6px" }}>←</span>
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
@keyframes expandIn { 0%{opacity:0;transform:translateY(-6px) scaleY(0.94);transform-origin:top} 100%{opacity:1;transform:none} }
@keyframes popBounce { 0%{transform:scale(0.3);opacity:0} 60%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
@keyframes popOut { 0%{transform:scale(1);opacity:1} 100%{transform:scale(0.3);opacity:0} }
@keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
@keyframes rayPulse { 0%,100%{opacity:0.04} 50%{opacity:0.08} }
@keyframes flashIn { 0%{transform:translateY(-20px) scale(0.8);opacity:0} 12%{transform:none;opacity:1} 85%{opacity:1} 100%{transform:translateY(-8px);opacity:0} }
@keyframes hintPop { 0%{opacity:0;transform:translateY(-6px) scale(0.95)} 3%{opacity:1;transform:none} 88%{opacity:1} 100%{opacity:0;transform:translateY(4px)} }
@keyframes hintGlow { from{box-shadow:0 0 14px rgba(200,168,78,0.2),0 4px 16px rgba(0,0,0,0.4)} to{box-shadow:0 0 28px rgba(200,168,78,0.45),0 4px 20px rgba(0,0,0,0.5)} }
@keyframes heroPulse {
  0%, 100% { box-shadow: 0 0 0 1px rgba(200,168,78,0.12), 0 12px 40px rgba(0,0,0,0.55), 0 0 50px rgba(200,168,78,0.08), inset 0 1px 0 rgba(255,255,255,0.07); }
  50% { box-shadow: 0 0 0 1px rgba(200,168,78,0.22), 0 14px 50px rgba(0,0,0,0.55), 0 0 80px rgba(200,168,78,0.18), inset 0 1px 0 rgba(255,255,255,0.1); }
}
@keyframes logoFloat {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-8px) scale(1.02); }
}
@keyframes barGrow {
  0% { width: 0%; opacity: 0; }
  30% { opacity: 1; }
  100% { opacity: 1; }
}
@keyframes goldPulse {
  0%, 100% { box-shadow: 0 0 8px rgba(200,168,78,0.3), 0 0 20px rgba(200,168,78,0.1); }
  50% { box-shadow: 0 0 16px rgba(200,168,78,0.5), 0 0 40px rgba(200,168,78,0.2); }
}
* { -webkit-tap-highlight-color:transparent; box-sizing:border-box; margin:0; padding:0; }
::-webkit-scrollbar{display:none}
button:focus-visible {
  outline: 2px solid rgba(200,168,78,0.8) !important;
  outline-offset: 2px;
  box-shadow: 0 0 0 3px rgba(200,168,78,0.2), 0 4px 18px rgba(200,168,78,0.35) !important;
}
button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(200,168,78,0.3), inset 0 2px 4px rgba(0,0,0,0.3) !important;
}
button:active:not(:disabled) {
  transform: translateY(0);
}
`;

// ─── STYLES ─────────────────────────────────────────────────

const S = {
  root: { position: "relative", width: "100%", maxWidth: "430px", minHeight: "100vh", margin: "0 auto", overflow: "hidden", fontFamily: "'Heebo',sans-serif", direction: "rtl", color: "#ffffff" },
  bg: { position: "fixed", inset: 0, zIndex: 0, background: `url(${bgImage}) center top / cover no-repeat, linear-gradient(155deg, #030a03 0%, #071a07 20%, #0a200a 45%, #071a07 70%, #030a03 100%)`, filter: "blur(2px) brightness(0.65)" },
  bgRay: { position: "fixed", top: "-30%", left: "50%", transform: "translateX(-50%)", width: "100%", height: "80%", zIndex: 0, pointerEvents: "none", borderRadius: "50%", background: "radial-gradient(ellipse 70% 60% at 50% 20%, rgba(255,224,100,0.05) 0%, rgba(255,200,80,0.02) 35%, transparent 70%)", animation: "rayPulse 8s ease-in-out infinite" },
  main: { position: "relative", zIndex: 2, display: "flex", flexDirection: "column", height: "100vh" },

  header: { padding: "8px 12px 6px", background: `linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.28) 100%), url(${headerImage}) center / cover no-repeat`, borderBottom: "2px solid rgba(200,168,78,0.4)", boxShadow: "0 4px 20px rgba(0,0,0,0.5), 0 0 30px rgba(200,168,78,0.08)", position: "relative" },
  headerTop: { display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "5px" },
  backBtn: { width: "34px", height: "34px", borderRadius: "10px", cursor: "pointer", background: "rgba(200,168,78,0.08)", border: "1px solid rgba(200,168,78,0.25)", color: "#d4b84a", fontSize: "16px", fontWeight: 700, marginTop: "2px", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Heebo',sans-serif" },
  layerPill: { display: "flex", alignItems: "center", gap: "3px", padding: "2px 6px", borderRadius: "7px", border: "1px solid", transition: "all 0.3s" },
  pricePill: { display: "flex", alignItems: "baseline", gap: "2px", background: "linear-gradient(135deg, rgba(200,168,78,0.15), rgba(180,140,40,0.08))", border: "1px solid rgba(200,168,78,0.4)", padding: "4px 12px", borderRadius: "12px", transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)" },
  priceS: { fontSize: "11px", color: "#d4b84a", fontWeight: 700 },
  priceV: { fontSize: "22px", color: "#ffffff", fontWeight: 900, textShadow: "0 2px 8px rgba(200,168,78,0.5)" },
  progressRow: { display: "flex", gap: "3px" },

  bowlArea: { padding: "6px 12px 4px", background: "rgba(0,0,0,0.4)", borderBottom: "1px solid rgba(200,168,78,0.25)" },
  bowlScroll: { display: "flex", gap: "4px", overflowX: "auto", scrollbarWidth: "none" },
  bowlPiece: { width: "31px", height: "31px", borderRadius: "9px", flexShrink: 0, background: "linear-gradient(145deg, rgba(13,46,13,0.92), rgba(8,28,8,0.88))", border: "2px solid rgba(200,168,78,0.3)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)", cursor: "pointer", position: "relative", transition: "all 0.15s" },

  badgePill: { display: "flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "8px", background: "rgba(200,168,78,0.25)", border: "1px solid rgba(200,168,78,0.45)" },
  badgePillTxt: { fontSize: "10px", fontWeight: 800, color: "#f0d060", textShadow: "0 1px 2px rgba(0,0,0,0.5)" },
  badgeFlash: { position: "fixed", top: "58px", left: "50%", transform: "translateX(-50%)", zIndex: 200, display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", borderRadius: "14px", background: "linear-gradient(135deg, rgba(8,22,8,0.97), rgba(13,40,13,0.97))", border: "2px solid rgba(200,168,78,0.5)", boxShadow: "0 4px 24px rgba(200,168,78,0.25), 0 0 40px rgba(200,168,78,0.1)", backdropFilter: "blur(16px)", animation: "flashIn 2.2s ease both" },
  badgeFlashTxt: { fontSize: "14px", fontWeight: 800, color: "#f0d060" },

  sugRow: { display: "flex", gap: "6px", padding: "5px 12px 2px" },
  sugPill: { display: "flex", alignItems: "center", gap: "4px", padding: "3px 9px", borderRadius: "9px", background: "rgba(200,168,78,0.22)", border: "1px solid rgba(200,168,78,0.4)" },

  anchorRow: { display: "flex", gap: "5px", padding: "6px 10px", overflowX: "auto", scrollbarWidth: "none", borderBottom: "1px solid rgba(200,168,78,0.3)", background: "rgba(0,0,0,0.55)", boxShadow: "inset 0 -1px 0 rgba(200,168,78,0.12)" },
  anchorTab: { padding: "5px 12px", borderRadius: "8px", border: "1px solid rgba(200,168,78,0.4)", background: "linear-gradient(145deg, rgba(18,52,18,0.95), rgba(12,36,12,0.92))", color: "rgba(255,255,255,0.8)", fontSize: "11px", fontWeight: 700, cursor: "pointer", flexShrink: 0, transition: "all 0.15s", fontFamily: "'Heebo',sans-serif", textShadow: "0 1px 2px rgba(0,0,0,0.5)" },
  anchorActive: { background: "linear-gradient(145deg, rgba(200,168,78,0.18), rgba(180,140,40,0.1))", borderColor: "rgba(200,168,78,0.45)", color: "#f0d060" },

  content: { flex: 1, overflowY: "auto", overflowX: "hidden", padding: "4px 10px", scrollbarWidth: "none" },

  longPressHint: { display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", margin: "4px 0 10px", borderRadius: "16px", background: "linear-gradient(135deg, rgba(200,168,78,0.22), rgba(180,140,40,0.12))", border: "2px solid rgba(200,168,78,0.55)", boxShadow: "0 0 20px rgba(200,168,78,0.25), 0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)", animation: "hintPop 15s ease both, hintGlow 1s ease-in-out infinite alternate", pointerEvents: "none" },
  introCard: { display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", margin: "4px 0 8px", borderRadius: "12px", background: "linear-gradient(145deg, rgba(13,46,13,0.95), rgba(8,28,8,0.9))", border: "1px solid rgba(200,168,78,0.2)", boxShadow: "0 2px 10px rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" },
  introText: { fontSize: "12px", color: "rgba(255,255,255,0.65)", fontWeight: 500, textShadow: "0 1px 2px rgba(0,0,0,0.5)" },

  sgLabel: { fontSize: "11px", fontWeight: 800, color: "rgba(200,168,78,0.85)", padding: "10px 4px 6px", textShadow: "0 1px 3px rgba(0,0,0,0.7), 0 0 8px rgba(0,0,0,0.3)" },
  grid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "7px" },

  chip: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "10px 3px 7px", borderRadius: "16px", cursor: "pointer", position: "relative", minHeight: "74px", background: "linear-gradient(155deg, rgba(50,115,50,0.9), rgba(30,75,30,0.85))", border: "2px solid rgba(200,168,78,0.55)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", boxShadow: "0 3px 12px rgba(0,0,0,0.5), 0 0 8px rgba(200,168,78,0.08), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.25)", color: "#ffffff", transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)", animation: "chipIn 0.25s ease both", outline: "none" },
  chipOn: { background: "linear-gradient(155deg, rgba(55,125,55,0.9), rgba(35,90,35,0.85))", border: "2.5px solid rgba(240,208,96,0.85)", boxShadow: "0 6px 20px rgba(200,168,78,0.5), 0 0 20px rgba(200,168,78,0.3), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.15)", transform: "translateY(-2px)" },
  chipOff: { opacity: 0.2, cursor: "not-allowed", filter: "grayscale(0.5)" },
  check: { position: "absolute", top: "3px", left: "3px", width: "16px", height: "16px", borderRadius: "50%", background: "linear-gradient(135deg, #ffe066, #d4b84a)", color: "#0d2e0d", fontSize: "8px", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(200,168,78,0.5)" },
  popTag: { position: "absolute", top: "-1px", right: "-1px", background: "linear-gradient(135deg, #d4b84a, #f0d060)", color: "#0d2e0d", fontSize: "7px", fontWeight: 900, padding: "2px 6px", borderRadius: "16px 0 8px 0", boxShadow: "0 2px 4px rgba(0,0,0,0.35)" },
  chipEmoji: { fontSize: "25px", marginBottom: "2px", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))" },
  chipName: { fontSize: "10.5px", fontWeight: 700, textAlign: "center", lineHeight: 1.15, color: "#ffffff", textShadow: "0 1px 3px rgba(0,0,0,0.6)" },
  chipCost: { fontSize: "8px", fontWeight: 800, color: "#f0d060", background: "linear-gradient(135deg, rgba(200,168,78,0.2), rgba(200,168,78,0.08))", border: "1px solid rgba(200,168,78,0.35)", padding: "1px 5px", borderRadius: "5px", marginTop: "2px", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" },

  bar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 14px max(11px, env(safe-area-inset-bottom))", background: `linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.25) 100%), url(${footerImage}) center top / cover no-repeat`, borderTop: "2px solid rgba(200,168,78,0.4)", boxShadow: "0 -4px 20px rgba(0,0,0,0.5), 0 0 30px rgba(200,168,78,0.08)" },
  barInfo: { display: "flex", alignItems: "baseline", gap: "5px" },
  barCount: { fontSize: "18px", fontWeight: 900, color: "#ffffff", textShadow: "0 2px 4px rgba(0,0,0,0.5)" },
  barLabel: { fontSize: "11px", color: "rgba(255,255,255,0.35)", fontWeight: 600 },
  barDiv: { width: "1px", height: "14px", background: "rgba(200,168,78,0.3)", display: "inline-block", margin: "0 4px" },
  barTotal: { fontSize: "18px", fontWeight: 900, color: "#f0d060", textShadow: "0 2px 6px rgba(200,168,78,0.4)" },
  cta: { padding: "10px 24px", borderRadius: "14px", cursor: "pointer", backgroundImage: "linear-gradient(135deg, #c8a832 0%, #f0d060 45%, #ffe066 55%, #c8a832 100%)", backgroundSize: "200% 100%", border: "1px solid rgba(255,224,100,0.5)", color: "#0d2e0d", fontSize: "14px", fontWeight: 900, fontFamily: "'Heebo',sans-serif", boxShadow: "0 4px 18px rgba(200,168,78,0.5), 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.15)", display: "flex", alignItems: "center", animation: "shimmer 4s ease-in-out infinite", textShadow: "0 1px 2px rgba(0,0,0,0.15)" },
  ctaGhost: { backgroundImage: "none", backgroundColor: "rgba(255,255,255,0.04)", backgroundSize: "100% 100%", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.25)", boxShadow: "none", animation: "none", textShadow: "none" },

  heroBtn: {
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: "32px 28px", borderRadius: "24px", cursor: "pointer",
    background: "linear-gradient(155deg, rgba(13,46,13,0.97), rgba(8,28,8,0.93))",
    backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
    border: "2px solid rgba(200,168,78,0.55)",
    boxShadow: "0 0 0 1px rgba(200,168,78,0.12), 0 12px 40px rgba(0,0,0,0.55), 0 0 60px rgba(200,168,78,0.1), inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.2)",
    transition: "all 0.35s cubic-bezier(0.34,1.56,0.64,1)",
    outline: "none", fontFamily: "'Heebo',sans-serif", width: "100%",
    animation: "heroPulse 3s ease-in-out infinite"
  },
  presetCard: {
    display: "flex", flexDirection: "row", alignItems: "center",
    gap: "7px", padding: "8px 10px", borderRadius: "10px", cursor: "pointer",
    background: "linear-gradient(135deg, rgba(13,40,13,0.95), rgba(8,24,8,0.9))",
    backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
    boxShadow: "0 0 0 1px rgba(200,168,78,0.07), 0 2px 10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
    transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)", outline: "none"
  },
  clearDraftBtn: { marginTop: "10px", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", background: "rgba(239,83,80,0.1)", border: "1px solid rgba(239,83,80,0.25)", color: "#ef5350", fontSize: "11px", fontWeight: 600, fontFamily: "'Heebo',sans-serif", transition: "all 0.15s" },
  sizeCard: { display: "flex", alignItems: "center", width: "100%", padding: "18px 20px", borderRadius: "18px", cursor: "pointer", background: "linear-gradient(155deg, rgba(13,46,13,0.97), rgba(8,28,8,0.93))", border: "2px solid rgba(200,168,78,0.4)", boxShadow: "0 0 0 1px rgba(200,168,78,0.08), 0 8px 30px rgba(0,0,0,0.5), 0 0 20px rgba(200,168,78,0.06), inset 0 1px 0 rgba(255,255,255,0.06)", transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)", outline: "none", fontFamily: "'Heebo',sans-serif" },
};
