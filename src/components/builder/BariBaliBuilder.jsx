'use client';
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft } from "lucide-react";
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

const headerImage = "/builder-assets/header-brand.png";
const footerImage = "/builder-assets/footer-brand.png";

const BOWL_MAX     = 14; // global cap for salad
const TORTILLA_MAX =  8; // veggie/filling cap for tortilla (premiums still exempt)

// Renders either a PNG icon path or an emoji string
function Icon({ src, size = "1.4em", style = {} }) {
  if (src && src.startsWith("/")) {
    return <img src={src} alt="" style={{ width: size, height: size, objectFit: "contain", verticalAlign: "middle", ...style }} />;
  }
  return <span style={{ fontSize: size, lineHeight: 1, ...style }}>{src}</span>;
}

import { STEPS, BASE, COMBOS, PRESETS, getSuggestions, TORTILLA_STEPS, TORTILLA_BASE, SIZE_CONFIG } from "../../data/salad-data.js";
import DetailSheet from "./ui/DetailSheet.jsx";
import SummaryView from "./SummaryView.jsx";
import HeroBowlCard from "./ui/HeroBowlCard.jsx";
import SizePicker from "../home/SizePicker";
import BariModal from "../ui/bari/BariModal";
import BariButton from "../ui/bari/BariButton";
import { useAnimatedNumber } from "../../lib/motionHooks";
import { takeReorder } from "../../lib/reorder";
import { effectiveItemPrice, effectiveBase, effectiveSizePrice } from "../../lib/menuConfig";

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
// Micro-sounds are opt-out: some people build a salad in public. The builder
// header exposes a toggle that flips this and persists the choice.
const SOUND_KEY = "bb-sound";
let soundEnabled = null; // null = preference not read yet
function setSoundEnabled(on) {
  soundEnabled = on;
  try { localStorage.setItem(SOUND_KEY, on ? "1" : "0"); } catch (e) { }
}
function readSoundPref() {
  try { return localStorage.getItem(SOUND_KEY) !== "0"; } catch (e) { return true; }
}
function isSoundOn() {
  if (soundEnabled === null) soundEnabled = readSoundPref();
  return soundEnabled;
}
function playSound(type) {
  if (!isSoundOn()) return;
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
    glow: "rgba(76,175,80,0.35)",
    // Stronger variants for the selected-chip glow — gives each step its
    // own accent color instead of every step glowing the same gold.
    onBorder: "rgba(129,199,132,0.95)",
    onGlow: "rgba(76,175,80,0.55)"
  },
  protein: {
    bg: "linear-gradient(145deg, rgba(66,165,245,0.18), rgba(30,136,229,0.12))",
    border: "rgba(66,165,245,0.45)",
    text: "#64b5f6",
    glow: "rgba(66,165,245,0.35)",
    onBorder: "rgba(100,181,246,0.95)",
    onGlow: "rgba(66,165,245,0.55)"
  },
  sauces: {
    bg: "linear-gradient(145deg, rgba(255,167,38,0.18), rgba(251,140,0,0.12))",
    border: "rgba(255,167,38,0.45)",
    text: "#ffb74d",
    glow: "rgba(255,167,38,0.35)",
    onBorder: "rgba(255,183,77,0.95)",
    onGlow: "rgba(255,167,38,0.55)"
  },
  finish: {
    bg: "linear-gradient(145deg, rgba(171,71,188,0.18), rgba(142,36,170,0.12))",
    border: "rgba(171,71,188,0.45)",
    text: "#ba68c8",
    glow: "rgba(171,71,188,0.35)",
    onBorder: "rgba(186,104,200,0.95)",
    onGlow: "rgba(171,71,188,0.55)"
  },
  upgrade: {
    bg: "linear-gradient(145deg, rgba(236,64,122,0.18), rgba(216,27,96,0.12))",
    border: "rgba(236,64,122,0.45)",
    text: "#f06292",
    glow: "rgba(236,64,122,0.35)",
    onBorder: "rgba(240,98,146,0.95)",
    onGlow: "rgba(236,64,122,0.55)"
  }
};

function getStepColor(stepId) {
  return STEP_COLORS[stepId] || STEP_COLORS.veggies;
}

// ─── Ingredient chip visual — step-tinted glow when selected, plus a
// distinct richer "premium" look for the upgrade step (real premium items,
// not just a bigger price tag) ──
function chipVisual(stepId, isOn) {
  const isPremiumStep = stepId === "upgrade" || stepId === "t_upgrade";
  if (isPremiumStep) {
    return isOn ? {
      backgroundImage: "linear-gradient(120deg, rgba(96,70,16,0.95) 0%, rgba(220,180,90,0.45) 45%, rgba(96,70,16,0.95) 100%)",
      backgroundSize: "200% 100%",
      animationName: "shimmer",
      animationDuration: "2.5s",
      animationTimingFunction: "ease-in-out",
      animationIterationCount: "infinite",
      border: "2.5px solid rgba(255,224,102,0.95)",
      boxShadow: "0 0 0 1px rgba(255,224,102,0.3), 0 6px 22px rgba(200,168,78,0.55), 0 0 30px rgba(255,224,102,0.4), inset 0 1px 0 rgba(255,255,255,0.25)",
      transform: "translateY(-3px)",
    } : {
      backgroundImage: "linear-gradient(155deg, rgba(58,44,16,0.92), rgba(32,24,8,0.88))",
      border: "2px solid rgba(200,168,78,0.65)",
      boxShadow: "0 3px 14px rgba(0,0,0,0.5), 0 0 12px rgba(200,168,78,0.2), inset 0 1px 0 rgba(255,255,255,0.12)",
    };
  }
  const sc = getStepColor(stepId);
  return isOn ? {
    // backgroundImage (not the `background` shorthand) so it can't conflict
    // with S.chip's own `background` key when the two style objects merge.
    backgroundImage: "linear-gradient(155deg, rgba(60,140,60,0.95), rgba(40,100,40,0.9))",
    border: `2.5px solid ${sc.onBorder}`,
    boxShadow: `0 0 0 1px ${sc.onGlow}, 0 6px 22px ${sc.onGlow}, 0 0 28px ${sc.onGlow}, inset 0 1px 0 rgba(255,255,255,0.25)`,
    transform: "translateY(-3px)",
  } : {};
}

// ─── PRESET COLOR SYSTEM ─────────────────────────────────────

const PRESET_COLORS = {
  // bright gold — hero/signature
  balanced:     { bg: "linear-gradient(145deg, rgba(240,200,80,0.22), rgba(13,42,13,0.88))",  border: "rgba(240,200,80,0.45)",  glow: "0 0 18px rgba(240,200,80,0.28), 0 4px 20px rgba(0,0,0,0.35)",  text: "#ffe066", dot: "rgba(240,200,80,0.75)" },
  signature:    { bg: "linear-gradient(145deg, rgba(240,200,80,0.25), rgba(13,42,13,0.88))",  border: "rgba(240,200,80,0.5)",   glow: "0 0 22px rgba(240,200,80,0.32), 0 4px 20px rgba(0,0,0,0.35)",  text: "#ffe066", dot: "rgba(240,200,80,0.8)"  },
  // brand gold
  mediterranean:{ bg: "linear-gradient(145deg, rgba(200,168,78,0.22), rgba(10,34,10,0.88))",  border: "rgba(200,168,78,0.45)",  glow: "0 0 16px rgba(200,168,78,0.24), 0 4px 20px rgba(0,0,0,0.35)",  text: "#f0d060", dot: "rgba(200,168,78,0.72)" },
  // amber-gold
  protein_beast:{ bg: "linear-gradient(145deg, rgba(210,155,45,0.24), rgba(12,36,10,0.88))",  border: "rgba(210,155,45,0.45)",  glow: "0 0 16px rgba(210,155,45,0.24), 0 4px 20px rgba(0,0,0,0.35)",  text: "#e8b840", dot: "rgba(210,155,45,0.72)" },
  // olive-gold (yellow-green)
  asian_fusion: { bg: "linear-gradient(145deg, rgba(175,185,55,0.22), rgba(10,30,8,0.9))",    border: "rgba(175,185,55,0.42)",  glow: "0 0 16px rgba(175,185,55,0.22), 0 4px 20px rgba(0,0,0,0.35)",  text: "#c8d44a", dot: "rgba(175,185,55,0.7)"  },
  // fresh mid-green
  rainbow:      { bg: "linear-gradient(145deg, rgba(102,187,106,0.24), rgba(8,28,8,0.9))",    border: "rgba(102,187,106,0.44)", glow: "0 0 16px rgba(102,187,106,0.24), 0 4px 20px rgba(0,0,0,0.35)", text: "#81c784", dot: "rgba(102,187,106,0.7)" },
  // deep forest green
  fire_spice:   { bg: "linear-gradient(145deg, rgba(56,142,60,0.28), rgba(6,20,6,0.92))",     border: "rgba(56,142,60,0.5)",    glow: "0 0 18px rgba(56,142,60,0.28), 0 4px 20px rgba(0,0,0,0.35)",   text: "#66bb6a", dot: "rgba(56,142,60,0.75)"  },
  // lime / yellow-green
  warm_earth:   { bg: "linear-gradient(145deg, rgba(148,196,60,0.22), rgba(10,28,6,0.9))",    border: "rgba(148,196,60,0.4)",   glow: "0 0 16px rgba(148,196,60,0.22), 0 4px 20px rgba(0,0,0,0.35)",  text: "#aed858", dot: "rgba(148,196,60,0.7)"  },
  // pale sage green
  garden_fresh: { bg: "linear-gradient(145deg, rgba(130,178,100,0.22), rgba(8,26,8,0.9))",    border: "rgba(130,178,100,0.4)",  glow: "0 0 16px rgba(130,178,100,0.2), 0 4px 20px rgba(0,0,0,0.35)",  text: "#a5cc82", dot: "rgba(130,178,100,0.68)"},
  // deep olive
  pasta_garden: { bg: "linear-gradient(145deg, rgba(160,170,50,0.22), rgba(10,28,6,0.9))",    border: "rgba(160,170,50,0.4)",   glow: "0 0 16px rgba(160,170,50,0.2), 0 4px 20px rgba(0,0,0,0.35)",   text: "#bcc84a", dot: "rgba(160,170,50,0.7)"  },
  // mint-green
  detox_bowl:   { bg: "linear-gradient(145deg, rgba(86,196,130,0.22), rgba(6,24,12,0.9))",    border: "rgba(86,196,130,0.4)",   glow: "0 0 16px rgba(86,196,130,0.22), 0 4px 20px rgba(0,0,0,0.35)",  text: "#6dcc9e", dot: "rgba(86,196,130,0.7)"  },
  // dark amber
  crunchy_master:{ bg: "linear-gradient(145deg, rgba(188,140,40,0.24), rgba(12,32,8,0.9))",   border: "rgba(188,140,40,0.44)",  glow: "0 0 16px rgba(188,140,40,0.22), 0 4px 20px rgba(0,0,0,0.35)",  text: "#d4a830", dot: "rgba(188,140,40,0.7)"  },
  // warm spring green
  eastern_night:{ bg: "linear-gradient(145deg, rgba(120,190,80,0.22), rgba(8,26,6,0.9))",     border: "rgba(120,190,80,0.4)",   glow: "0 0 16px rgba(120,190,80,0.2), 0 4px 20px rgba(0,0,0,0.35)",   text: "#8ed060", dot: "rgba(120,190,80,0.68)" },
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
function HeaderBanner() {
  return (
    <>
      <div style={{ position: "relative", width: "100%", flexShrink: 0 }}>
        <img
          src={headerImage}
          alt=""
          aria-hidden="true"
          style={{ width: "100%", display: "block", height: "80px", objectFit: "cover", objectPosition: "center top" }}
        />
        {/* Fade dissolve — image melts into dark bg */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "52px",
          background: "linear-gradient(to bottom, transparent, #020a02)",
          pointerEvents: "none",
        }} />
        {/* Gold glow line */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "2px",
          background: "linear-gradient(90deg, transparent 0%, rgba(200,168,78,0.7) 20%, rgba(240,208,96,1) 50%, rgba(200,168,78,0.7) 80%, transparent 100%)",
          boxShadow: "0 0 10px rgba(200,168,78,0.55), 0 0 22px rgba(200,168,78,0.22)",
          pointerEvents: "none",
        }} />
      </div>
      {/* Scalloped wave separator */}
      <div style={{ width: "100%", lineHeight: 0, flexShrink: 0, marginTop: "-1px" }}>
        <svg
          viewBox="0 0 430 16"
          preserveAspectRatio="none"
          style={{ width: "100%", height: "16px", display: "block", filter: "drop-shadow(0 0 5px rgba(200,168,78,0.4))" }}
        >
          <path
            d="M0,0 Q26.875,12 53.75,0 Q80.625,12 107.5,0 Q134.375,12 161.25,0 Q188.125,12 215,0 Q241.875,12 268.75,0 Q295.625,12 322.5,0 Q349.375,12 376.25,0 Q403.125,12 430,0"
            fill="none"
            stroke="rgba(200,168,78,0.45)"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    </>
  );
}

function ClearConfirmModal({ open, onConfirm, onCancel }) {
  return (
    <BariModal open={open} onClose={onCancel} variant="dialog" title="למחוק את הטיוטה הנוכחית?">
      <div className="mt-2 text-xs leading-relaxed text-white/50">כל הבחירות שלך יימחקו ולא ניתן יהיה לשחזר אותן.</div>
      <div className="mt-5 flex gap-2.5">
        <BariButton variant="secondary" size="sm" fullWidth onClick={onCancel}>ביטול</BariButton>
        <BariButton variant="danger" size="sm" fullWidth onClick={onConfirm}>מחק</BariButton>
      </div>
    </BariModal>
  );
}

// ─── MAIN ───────────────────────────────────────────────────

/** @param {{ sizeParam?: string | null, type?: string, entrance?: boolean, skipIntro?: boolean }} props */
export default function BariBaliBuilder({ sizeParam = null, type = "salad", entrance = false, skipIntro = false }) {
  const isTortilla = type === "tortilla";
  const steps = useMemo(() => isTortilla ? STEPS.filter(s => s.id !== "finish") : STEPS, [isTortilla]);
  const [step, setStep] = useState(isTortilla ? 0 : -1);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Sound preference. The toggle only renders once `mounted`, so reading the
  // stored value here can't cause a hydration mismatch.
  const [soundOn, setSoundOn] = useState(readSoundPref);
  const toggleSound = useCallback(() => {
    const nextOn = !soundOn;
    setSoundOn(nextOn);
    setSoundEnabled(nextOn);
    haptic("tap");
  }, [soundOn]);
  const [selectedSize, setSelectedSize] = useState(() => parseSizeParam(sizeParam));
  const [sels, setSels] = useState({});
  const [lastAdd, setLastAdd] = useState(null);
  const [lastRemove, setLastRemove] = useState(null);
  const [summary, setSummary] = useState(false);
  // "enter" fades the whole screen in on mount. Skipped when arriving from the
  // page transition — that slab fade is exactly what made the builder look like
  // it appeared in one piece; the staggered `rise()` below does the arrival instead.
  const [anim, setAnim] = useState(skipIntro ? null : "enter");
  const [slideDir, setSlideDir] = useState(1);
  const [comboBadges, setComboBadges] = useState([]);
  const [badgeFlash, setBadgeFlash] = useState(null);
  const [shownBadges, setShownBadges] = useState(new Set());
  const [detailCtx, setDetailCtx] = useState(null); // { item, stepId, maxPicks }
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [draftNotice, setDraftNotice] = useState(false);
  const [showLongPressHint, setShowLongPressHint] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowLongPressHint(false), 15000);
    return () => clearTimeout(t);
  }, []);
  const [priceFlash, setPriceFlash] = useState(null);
  const activeBase = isTortilla ? effectiveBase('tortilla') : (selectedSize ? effectiveSizePrice(selectedSize) : effectiveBase('salad'));
  const [prevPrice, setPrevPrice] = useState(activeBase);
  const [activeAnchor, setActiveAnchor] = useState(0);
  const [notes, setNotes] = useState("");
  const [expandedPreset, setExpandedPreset] = useState(null);
  const [bowlAnim, setBowlAnim] = useState(null);
  useEffect(() => {
    const file = isTortilla ? "/mexican-burrito.json" : "/cat-salad-bowl.json";
    fetch(file).then(r => r.json()).then(setBowlAnim).catch(() => {});
  }, [isTortilla]);
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

  // ─── Load a reorder, else the saved draft, on mount ───
  useEffect(() => {
    // "Order again" takes precedence over any saved draft — reconstruct the
    // selection from the past order's item ids against the CURRENT catalog
    // (so prices are current and off-menu items simply drop out).
    const reorder = takeReorder();
    if (reorder) {
      const catalog = steps.flatMap(s => s.subgroups.flatMap(sg => sg.items));
      const rebuilt = {};
      reorder.itemIds.forEach(id => {
        const item = catalog.find(i => i.id === id);
        if (!item) return; // no longer on the menu
        const inStep = steps.find(s => s.subgroups.some(sg => sg.items.some(i => i.id === id)));
        if (!inStep) return;
        (rebuilt[inStep.id] ||= []).push({ ...item, _meta: { stepId: inStep.id } });
      });
      setSels(rebuilt);
      setStep(0);
      // 'same' → straight to the summary to pick a fresh time + pay;
      // 'edit' → land in the builder to change things.
      if (reorder.mode === "same") setSummary(true);
      return;
    }

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
        // Say so. Silently repopulating a bowl from a previous visit looks like
        // a bug ("why is there already stuff in here?"); the clear button is
        // right there once you know it came from a saved draft.
        if (Object.values(migratedSels).some(v => v.length > 0)) {
          setDraftNotice(true);
          setTimeout(() => setDraftNotice(false), 7000);
        }
      }
    } catch (e) { }
  }, [steps]);

  // ─── Save draft to localStorage ───
  useEffect(() => {
    try {
      if (Object.keys(sels).length > 0 || notes) {
        localStorage.setItem("baribali-draft", JSON.stringify({ sels, notes }));
      }
    } catch (e) { }
  }, [sels, notes]);

  const cur = step >= 0 ? steps[step] : null;
  const getSel = id => sels[id] || [];
  const all = useMemo(() => Object.values(sels).flat(), [sels]);
  const allTags = useMemo(() => all.flatMap(i => i.tags || []), [all]);

  const extras = all.reduce((s, i) => s + effectiveItemPrice(i.id, i.price || 0), 0);
  const total = activeBase + extras;
  // Rolls toward the new total instead of snapping — the price is the most
  // watched number in the builder. (No-op under reduced motion.)
  const displayTotal = useAnimatedNumber(total);
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

      // Global bowl cap — only for unlimited ingredient steps (no per-step maxPicks)
      // Exempt: premium upgrades, finish (preferences not ingredients), steps with own maxPicks
      const isPremium    = sid === "upgrade" || sid === "t_upgrade";
      const isPreference = sid === "finish";
      if (!isPremium && !isPreference && !max && !exists) {
        const totalCount = Object.values(prev).flat().length;
        const cap = isTortilla ? TORTILLA_MAX : BOWL_MAX;
        if (totalCount >= cap) return prev;
      }

      if (sid === "finish") {
        const st = steps.find(s => s.id === sid);
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
  }, [isTortilla, steps]);

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
    const allItems = steps.flatMap(s => s.subgroups.flatMap(sg => sg.items));
    const v = [], p = [], sc = [];
    preset.items.forEach(id => {
      const item = allItems.find(i => i.id === id);
      if (!item) return;
      const inStep = steps.find(s => s.subgroups.some(sg => sg.items.some(i => i.id === id)));

      // Add metadata to preset items
      const itemWithMeta = { ...item, _meta: { stepId: inStep?.id } };

      if (inStep?.id === "veggies") v.push(itemWithMeta);
      else if (inStep?.id === "protein") p.push(itemWithMeta);
      else if (inStep?.id === "sauces") sc.push(itemWithMeta);
    });
    setSels({ veggies: v, protein: p, sauces: sc });
    haptic("step"); playSound("step");


    setStep(0);
  }, [steps]);

  // ─── Clear draft ───
  const requestClearDraft = useCallback(() => setShowClearConfirm(true), []);
  const confirmClearDraft = useCallback(() => {
    localStorage.removeItem("baribali-draft");
    setSels({});
    setNotes("");
    setStep(isTortilla ? 0 : -1);
    haptic("remove");
    setShowClearConfirm(false);
  }, [isTortilla]);

  // ─── Directional transitions ───
  const goTo = useCallback((target) => {
    if (target === step) return;
    const dir = target > step ? 1 : -1;
    setSlideDir(dir); setAnim("out");
    haptic("step"); playSound("step");


    setTimeout(() => {
      setStep(target); setAnim("in"); setActiveAnchor(0);
      scrollRef.current?.scrollTo(0, 0);
      setTimeout(() => setAnim(null), 300);
    }, 200);
  }, [step]);

  const next = useCallback(() => step < steps.length - 1 ? goTo(step + 1) : setSummary(true), [step, steps, goTo]);
  const back = useCallback(() => {
    if (summary) setSummary(false);
    else if (step > 0) goTo(step - 1);
    else if (step === 0 && !isTortilla) goTo(-1);
    else window.location.href = "/";
  }, [summary, step, goTo, isTortilla]);
  const resetAll = () => {
    setSels({});
    setNotes("");
    setComboBadges([]);
    setShownBadges(new Set());
    setSummary(false);
    setSelectedSize(sizeParam ? parseSizeParam(sizeParam) : null);
    setStep(isTortilla ? 0 : -1);
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
    if (dt > 500 || Math.abs(dy) > 40) return;
    const velocity = Math.abs(dx) / dt; // px/ms
    const isFlick = velocity > 0.3 && Math.abs(dx) > 20;
    const isSlide = Math.abs(dx) > 45;
    if (!isFlick && !isSlide) return;
    // RTL: swipe right = next, swipe left = back
    if (dx > 0) next();
    else back();
  }, [next, back]);

  // ─── Long-press for detail ───
  const onChipTouchStart = (item) => {
    setShowLongPressHint(false);
    longPressRef.current = setTimeout(() => {
      setDetailCtx({ item, stepId: cur?.id, maxPicks: cur?.maxPicks }); haptic("tap");
    }, 500);
  };
  const onChipTouchEnd = () => { clearTimeout(longPressRef.current); };

  // ─── Arrival stagger ───
  // When the page transition hands off, the builder's regions
  // rise into place from the bottom up, continuing the upward motion of the
  // transition rather than landing as one slab. `entrance` is flipped by /build
  // the moment the veil starts lifting. Defined above the early returns so both
  // the preset screen and the step screen can use it.
  const rise = (order) => entrance
    ? { animation: `bbRise 640ms cubic-bezier(0.16,1,0.3,1) ${order * 85}ms both` }
    : null;

  // ─── Anchor tab scroll ───
  const scrollToSg = (idx) => {
    setActiveAnchor(idx);
    sgRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ─── Preset screen ───
  if (step === -1 && !summary) {
    const hasDraft = Object.keys(sels).length > 0 || notes;

    // ── No size yet (deep link / bookmark straight to /build) — show the SAME
    //    shared picker the landing uses, so "which size?" is asked one way only.
    if (!selectedSize) {
      return (
        <SizePicker
          onSelect={(s) => { setSelectedSize(parseSizeParam(s)); haptic("step"); }}
          onBack={() => { window.location.href = "/home2"; }}
        />
      );
    }

    const sc = SIZE_CONFIG[selectedSize];
    return (
      <div style={S.root}>
        <div style={S.bg} />
        <div style={{
          ...S.main, justifyContent: "space-between", padding: "0 0 20px",
          opacity: anim === "enter" ? 0 : 1, transform: anim === "enter" ? "translateY(12px)" : "none", transition: "all 0.5s"
        }}>
          {/* Brand header banner */}
          <div style={rise(2) ?? undefined}><HeaderBanner /></div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1, padding: "16px 16px 24px", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>

            {/* Draft was restored — explain the pre-filled bowl */}
            {draftNotice && (
              <div style={S.draftNotice} role="status">
                <span style={{ fontSize: "15px" }}>📝</span>
                <span style={{ flex: 1 }}>המשכנו מהטיוטה הקודמת שלכם</span>
                <button onClick={requestClearDraft} style={S.draftNoticeBtn}>התחל מחדש</button>
              </div>
            )}

            {/* HERO - Start Empty Button (Glassy) */}
            <button
              onClick={() => { setStep(0); haptic("step"); playSound("step"); }}
              style={{ ...S.heroBtn, ...rise(1) }}
              aria-label="התחל סלט ריק"
              tabIndex={0}
            >
              {/* Top row: bowl + text */}
              <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "14px", padding: "10px 14px 10px" }}>

                {/* Bowl ring */}
                <div className="hero-ring">
                  <svg viewBox="0 0 158 158" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                    <circle cx="79" cy="79" r="64" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                    <circle cx="79" cy="79" r="64" fill="none" stroke="rgba(200,168,78,0.3)" strokeWidth="5"
                      strokeLinecap="round" strokeDasharray={2 * Math.PI * 64} strokeDashoffset={2 * Math.PI * 64} />
                  </svg>
                  <div className="hero-bowl" style={{ filter: "drop-shadow(0 4px 16px rgba(200,168,78,0.25))" }}>
                    {bowlAnim
                      ? <Lottie animationData={bowlAnim} loop autoplay style={{ width: "100%", height: "100%" }} />
                      : <span style={{ fontSize: "52px", lineHeight: "108px", display: "block", textAlign: "center" }}>🥗</span>
                    }
                  </div>
                </div>

                {/* Text column */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "5px", textAlign: "right" }}>
                  <div style={{ fontSize: "20px", fontWeight: 900, color: "#e8f5e9", textShadow: "0 2px 6px rgba(0,0,0,0.7)", letterSpacing: "0.02em", lineHeight: 1.2 }}>בנו את הסלט שלכם</div>
                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>5 שלבים פשוטים · בחירה חופשית</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px", padding: "5px 10px", borderRadius: "10px", background: "rgba(200,168,78,0.1)", border: "1px solid rgba(200,168,78,0.25)", width: "fit-content", alignSelf: "flex-end" }}>
                    <span style={{ fontSize: "12px", fontWeight: 800, color: "#f0d060" }}>{sc.label}</span>
                    <div style={{ width: "1px", height: "12px", background: "rgba(200,168,78,0.3)" }} />
                    <span style={{ fontSize: "18px", fontWeight: 900, color: "#f0d060", lineHeight: 1 }}>₪{effectiveSizePrice(sc.ml)}</span>
                  </div>
                  <span
                    onClick={(e) => { e.stopPropagation(); setSelectedSize(null); }}
                    role="button" tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); setSelectedSize(null); }}}
                    style={{ cursor: "pointer", fontSize: "10px", color: "rgba(255,255,255,0.3)", fontWeight: 600, alignSelf: "flex-end" }}
                  >שנה גודל</span>
                </div>
              </div>

              {/* Gold CTA strip */}
              <div style={{
                width: "100%", padding: "10px 18px",
                backgroundImage: "linear-gradient(135deg, #c8a832 0%, #f0d060 40%, #ffe599 52%, #c8a832 100%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 3s ease-in-out infinite",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                borderTop: "1px solid rgba(255,220,80,0.3)",
              }}>
                <span style={{ fontSize: "14px", fontWeight: 900, color: "#0d2e0d", letterSpacing: "0.03em" }}>לחצו להתחיל לבנות</span>
                <span style={{ fontSize: "17px", fontWeight: 900, color: "#0d2e0d" }}>←</span>
              </div>
            </button>

            {/* Presets - Secondary */}
            <div style={{ width: "100%", ...rise(0) }}>
              <div style={{ textAlign: "center", marginBottom: "14px" }}>
                <div style={{ fontSize: "26px", marginBottom: "5px", filter: "drop-shadow(0 0 10px rgba(200,168,78,0.5))" }}>👨‍🍳</div>
                <div style={{
                  fontSize: "15px", fontWeight: 900, letterSpacing: "0.06em",
                  backgroundImage: "linear-gradient(135deg, #c8a832 0%, #f0d060 45%, #ffe599 55%, #c8a832 100%)",
                  backgroundSize: "200% auto",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  animation: "shimmer 4s ease-in-out infinite",
                }}>מתכוני השף</div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", fontWeight: 500, marginTop: "3px" }}>
                  בחרו מתכון מוכן או התחילו מאפס
                </div>
              </div>
              {(() => {
                const allIngredients = steps.flatMap(s => s.subgroups.flatMap(sg => sg.items));
                const ep = expandedPreset ? PRESETS.find(x => x.id === expandedPreset) : null;
                const epc = ep ? (PRESET_COLORS[ep.id] || PRESET_COLORS.balanced) : null;
                return (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px" }}>
                      {PRESETS.map((p, i) => {
                        const pc = PRESET_COLORS[p.id] || PRESET_COLORS.balanced;
                        const isOpen = expandedPreset === p.id;
                        return (
                          // Outer wrapper carries the idle float (staggered per
                          // card for an organic, not-all-in-sync feel) so it
                          // doesn't fight the button's own press/open transform.
                          <div key={p.id} style={{ width: "100%", animation: `cardFloat 3.6s ease-in-out ${(i % 4) * 0.25}s infinite` }}>
                            <button
                              onClick={() => setExpandedPreset(isOpen ? null : p.id)}
                              style={{
                                ...S.presetCard,
                                width: "100%",
                                background: pc.bg,
                                borderWidth: "1px", borderStyle: "solid", borderColor: isOpen ? pc.text : pc.border,
                                boxShadow: isOpen ? `${pc.glow}, inset 0 0 0 1px ${pc.border}` : pc.glow,
                                opacity: expandedPreset && !isOpen ? 0.55 : 1,
                                transform: isOpen ? "scale(1.02)" : "scale(1)",
                                transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
                              }}
                              aria-expanded={isOpen}
                              aria-label={`מתכון ${p.he}`}
                              tabIndex={0}
                            >
                              {p.id === "signature" && (
                                <div style={{ position: "absolute", top: 0, right: 0, background: "linear-gradient(135deg, #c8a832, #f0d060)", color: "#0d2e0d", fontSize: "7px", fontWeight: 900, padding: "2px 7px", borderRadius: "0 10px 0 8px", letterSpacing: "0.04em" }}>
                                  מומלץ ✦
                                </div>
                              )}
                              <Icon src={p.icon} size="20px" style={{ flexShrink: 0, filter: `drop-shadow(0 1px 4px ${pc.dot})` }} />
                              <span style={{ flex: 1, fontSize: "11.5px", fontWeight: 800, color: pc.text, textAlign: "right", lineHeight: 1.2 }}>{p.he}</span>
                              <span style={{ fontSize: "9px", fontWeight: 700, color: isOpen ? pc.text : "rgba(255,255,255,0.28)", flexShrink: 0, transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "none" }}>▾</span>
                            </button>
                          </div>
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
                          <Icon src={ep.icon} size="28px" style={{ filter: `drop-shadow(0 2px 8px ${epc.dot})`, flexShrink: 0 }} />
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
                              }}><Icon src={item.icon} size="14px" /> {item.he}</span>
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
                              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                              background: `linear-gradient(135deg, ${epc.dot}, ${epc.border})`,
                              color: "#0a1a0a", fontSize: "14px", fontWeight: 900,
                              fontFamily: "var(--font-heebo), 'Heebo', sans-serif",
                              boxShadow: `0 4px 18px ${epc.dot}`,
                              letterSpacing: "0.02em",
                            }}
                          >
                            <span>בנה את {ep.he}</span>
                            <ArrowLeft size={15} strokeWidth={2.8} />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Clear Draft Button - inline at bottom of scroll */}
          {hasDraft && (
            <div style={{ display: "flex", justifyContent: "center", paddingBottom: "8px" }}>
              <button onClick={requestClearDraft} style={S.clearDraftBtn} aria-label="מחק טיוטה">
                🗑️ מחק טיוטה
              </button>
            </div>
          )}
        </div>
        <ClearConfirmModal open={showClearConfirm} onConfirm={confirmClearDraft} onCancel={() => setShowClearConfirm(false)} />
        {mounted && <style>{KF}</style>}
      </div>
    );
  }

  if (summary) return <SummaryView sels={sels} total={total} all={all} comboBadges={comboBadges} notes={notes} setNotes={setNotes} onBack={back} onEdit={(stepIndex) => { setSummary(false); setStep(stepIndex); }} onNewOrder={resetAll} base={activeBase} sizeLabel={selectedSize ? SIZE_CONFIG[selectedSize].label : null} />;

  const slideX = anim === "out" ? (slideDir > 0 ? "-60px" : "60px") : anim === "in" ? "0" : undefined;

  // Global bowl cap, surfaced. `toggle` has always enforced it by silently
  // returning the previous state, so at 14/14 an ingredient chip still looked
  // tappable and simply did nothing — which reads as the app being broken.
  // Steps with their own maxPicks, premium upgrades and the finish step are
  // exempt from the cap (see toggle), so they must not be blocked here either.
  const bowlCap = isTortilla ? TORTILLA_MAX : BOWL_MAX;
  const capApplies = !!cur && !cur.maxPicks && cur.id !== "finish" && cur.id !== "upgrade" && cur.id !== "t_upgrade";
  const bowlFull = capApplies && all.length >= bowlCap;

  return (
    <div style={S.root} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div style={S.bg} />

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

      <ClearConfirmModal open={showClearConfirm} onConfirm={confirmClearDraft} onCancel={() => setShowClearConfirm(false)} />

      <div style={{ ...S.main, opacity: anim === "enter" ? 0 : 1, transition: "opacity 0.4s" }}>

        {/* ── HEADER ── */}
        <div style={{ ...S.header, ...rise(3) }} role="banner">
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
          {/* Single compact header row: [→ ↺] · title (abs centered) · [←] */}
          <div style={{ position: "relative", display: "flex", alignItems: "center", padding: "7px 10px 4px" }}>
            {/* Back + reset cluster — left */}
            <div style={{ display: "flex", gap: "5px", flexShrink: 0, zIndex: 1 }}>
              <button onClick={back} aria-label="חזור" style={S.navBtn}>→</button>
              <button onClick={requestClearDraft} aria-label="נקה הכל" style={{ ...S.resetBtn, opacity: all.length > 0 ? 1 : 0.2, pointerEvents: all.length > 0 ? "auto" : "none" }}>↺</button>
              {/* Sound toggle — rendered post-mount so the stored preference can't
                  cause a hydration mismatch. */}
              {mounted && (
                <button
                  onClick={toggleSound}
                  aria-label={soundOn ? "כבה צלילים" : "הפעל צלילים"}
                  aria-pressed={soundOn}
                  style={{ ...S.resetBtn, opacity: soundOn ? 1 : 0.45 }}
                >
                  {soundOn ? "🔊" : "🔇"}
                </button>
              )}
            </div>
            {/* Step title — truly centered over the full row, single line */}
            <div style={{ position: "absolute", left: 0, right: 0, textAlign: "center", pointerEvents: "none" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "5px", whiteSpace: "nowrap" }}>
                <span style={{ fontSize: "clamp(15px, 4.5vw, 22px)" }}>{cur.emoji}</span>
                <span style={{ fontFamily: "var(--font-display), 'Secular One', sans-serif", fontSize: "clamp(16px, 4.8vw, 23px)", color: "#ffffff", textShadow: "0 2px 6px rgba(0,0,0,0.6)" }}>{cur.title}</span>
                {cur.subtitle && <>
                  <span style={{ fontSize: "clamp(11px, 3vw, 14px)", color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>·</span>
                  <span style={{ fontSize: "clamp(11px, 3vw, 14px)", fontWeight: 700, color: "rgba(255,255,255,0.65)" }}>{cur.subtitle}</span>
                </>}
              </div>
            </div>
            {/* Spacer */}
            <div style={{ flex: 1 }} />
            {/* Next — right */}
            <button onClick={next} aria-label="המשך" style={{ ...S.navBtnNext, flexShrink: 0, zIndex: 1 }}>←</button>
          </div>

          {/* Tappable progress segments */}
          <div style={{ ...S.progressRow, alignItems: "center" }} role="progressbar" aria-valuemin={0} aria-valuemax={steps.length - 1} aria-valuenow={step} aria-label={`שלב ${step + 1} מתוך ${steps.length}`}>
            {steps.map((s, i) => (
              <button
                key={s.id}
                onClick={() => { if (i <= step + 1) goTo(i); }}
                disabled={i > step + 1}
                aria-label={`${s.title}${i < step ? " - הושלם" : i === step ? " - נוכחי" : i === step + 1 ? " - הבא" : " - לא זמין"}`}
                style={{
                  flex: 1, border: "none", padding: "2px 1px",
                  cursor: i <= step + 1 ? "pointer" : "default",
                  background: "transparent", display: "flex", alignItems: "stretch",
                }}
              >
                <div style={{
                  height: "30px", width: "100%", borderRadius: "7px",
                  background: i < step
                    ? "linear-gradient(90deg, rgba(40,120,40,0.7), rgba(60,150,60,0.6))"
                    : i === step
                      ? "linear-gradient(90deg, var(--color-gold-light), var(--color-gold-bright))"
                      : "rgba(255,255,255,0.07)",
                  border: i === step
                    ? "1px solid rgba(255,220,80,0.6)"
                    : i < step
                      ? "1px solid rgba(60,160,60,0.5)"
                      : "1px solid rgba(255,255,255,0.12)",
                  transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
                  boxShadow: i === step ? "0 0 10px rgba(240,208,80,0.5)" : "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  overflow: "hidden", gap: "3px",
                }}>
                  <span style={{ fontSize: "11px", lineHeight: 1 }}>
                    {i < step ? "✓" : s.emoji}
                  </span>
                  <span style={{
                    fontSize: "10px", fontWeight: i === step ? 800 : 700,
                    color: i === step ? "#3a2800" : i < step ? "#ffffff" : "rgba(255,255,255,0.55)",
                    letterSpacing: "0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    maxWidth: "calc(100% - 18px)",
                    transition: "color 0.3s ease",
                  }}>{s.title}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── HERO BOWL CARD ── */}
        <div style={rise(2) ?? undefined}>
          <HeroBowlCard
            all={all}
            onRemove={removeFromBowl}
            comboBadges={comboBadges}
            lastAdd={lastAdd}
            lastRemove={lastRemove}
            animFile={isTortilla ? "/mexican-burrito.json" : "/cat-salad-bowl.json"}
            freePlay={isTortilla}
            bowlTop={isTortilla ? "44%" : "24%"}
            max={isTortilla ? TORTILLA_MAX : BOWL_MAX}
          />
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
        <div style={{ ...S.content, opacity: anim === "out" ? 0 : 1, transform: anim === "out" ? `translateX(${slideX})` : "translateX(0)", filter: anim === "out" ? "blur(3px)" : "blur(0px)", transition: "opacity 0.22s ease, transform 0.28s cubic-bezier(0.25,0.46,0.45,0.94), filter 0.22s ease", ...rise(1) }} ref={scrollRef} role="main" aria-label={`${cur.title} - בחרו מרכיבים`}>

          {/* Long-press discovery hint — shows once on load, fades out */}
          {showLongPressHint && (
            <div style={S.longPressHint}>
              <span style={{ fontSize: "32px", lineHeight: 1 }}>👆</span>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 900, color: "#f0d060", marginBottom: "2px" }}>למידע נוסף על הרכיב</div>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.65)" }}>לחצו על ⓘ או לחיצה ארוכה</div>
              </div>
            </div>
          )}

          {/* Empty state intro */}
          {curSel.length === 0 && cur.intro && (
            <div style={S.introCard}><span style={{ fontSize: "13px" }}>{cur.emoji}</span><span style={S.introText}>{cur.intro}</span></div>
          )}

          {/* Bowl at capacity — says why the chips below are unavailable */}
          {bowlFull && (
            <div style={S.capNotice} role="status">
              <span style={{ fontSize: "16px" }}>🥣</span>
              <span>הקערה מלאה ({all.length}/{bowlCap}) — הסירו מרכיב כדי להוסיף אחר</span>
            </div>
          )}

          {cur.subgroups.map((sg, si) => {
            return (
              <div key={si} ref={el => sgRefs.current[si] = el}>
                {sg.label && <div style={S.sgLabel}>{sg.label}</div>}
                <div style={S.grid}>
                  {sg.items.map((item, idx) => {
                    const on = curSel.some(s => s.id === item.id);
                    // Unavailable either because this step is at its own limit, or
                    // because the bowl as a whole is full. Removing is always allowed.
                    const full = !on && ((cur.maxPicks && cur.maxPicks > 1 && curSel.length >= cur.maxPicks) || bowlFull);
                    const isPremiumStep = cur.id === "upgrade" || cur.id === "t_upgrade";
                    const itemPrice = effectiveItemPrice(item.id, item.price);
                    // A div rather than a <button>: it already carries
                    // role="checkbox", and the info affordance inside is a real
                    // button — which cannot legally nest inside a button.
                    return (
                      <div key={item.id}
                        onClick={() => { if (!full) toggle(cur.id, item, cur.maxPicks); }}
                        onTouchStart={() => onChipTouchStart(item)} onTouchEnd={onChipTouchEnd}
                        onMouseDown={() => onChipTouchStart(item)} onMouseUp={onChipTouchEnd} onMouseLeave={onChipTouchEnd}
                        onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (!full) toggle(cur.id, item, cur.maxPicks); } }}
                        aria-label={`${item.he}${itemPrice > 0 ? `, תוספת ${itemPrice} שקלים` : ""}${on ? ", נבחר" : ""}${item.desc ? `, ${item.desc}` : ""}`}
                        aria-checked={on}
                        aria-disabled={full}
                        role="checkbox"
                        tabIndex={full ? -1 : 0}
                        style={{ ...S.chip, ...chipVisual(cur.id, on), ...(full ? S.chipOff : {}), animationDelay: `${(si * 5 + idx) * 20}ms` }}>
                        {on && <div style={S.check} aria-hidden="true">✓</div>}
                        {isPremiumStep && <div style={{ position: "absolute", top: "-2px", left: "-2px", fontSize: "12px", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))" }} aria-hidden="true">👑</div>}
                        {item.pop && <div style={S.popTag} aria-hidden="true">פופולרי</div>}
                        {/* Ingredient info. Was an 8px glyph at 0.18 opacity with
                            pointerEvents:none — effectively invisible, and the only
                            way in was a long-press nobody discovers. Now a real
                            control (long-press still works). */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); clearTimeout(longPressRef.current); setDetailCtx({ item, stepId: cur.id, maxPicks: cur.maxPicks }); haptic("tap"); }}
                          onTouchStart={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          aria-label={`מידע על ${item.he}`}
                          style={S.chipInfo}
                        >ℹ</button>
                        <Icon src={item.icon} size="38px" style={{ ...S.chipEmoji, transform: lastAdd === item.id ? "scale(1.4) rotate(-10deg)" : "scale(1)", transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1)" }} />
                        <span style={S.chipName}>{item.he}</span>
                        {itemPrice > 0 && <span style={S.chipCost}>+₪{itemPrice}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div style={{ height: "110px" }} />
        </div>

        {/* ── BOTTOM ACTION ZONE ── */}
        <div style={{ ...S.bar, ...rise(0) }}>
          <button
            style={{
              flex: 1,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 20px",
              borderRadius: "14px",
              border: "1px solid rgba(200,168,78,0.35)",
              background: "linear-gradient(145deg, rgba(8,22,8,0.97), rgba(13,40,13,0.95))",
              cursor: "pointer",
              fontFamily: "var(--font-heebo), 'Heebo', sans-serif",
              // Static gold glow — was a goldPulse box-shadow loop, but infinite
              // box-shadow animation repaints every frame and the CTA pill's
              // shimmer already provides motion here.
              boxShadow: "0 4px 18px rgba(0,0,0,0.4), 0 0 12px rgba(200,168,78,0.35), 0 0 0 1px rgba(200,168,78,0.08)",
              ...(cur.id === "upgrade" && curSel.length === 0 ? { opacity: 0.5 } : {}),
            }}
            onClick={next}
            aria-label={step === steps.length - 1 ? (curSel.length > 0 ? "עבור לסיכום" : "דלג ועבור לסיכום") : `עבור לשלב הבא - ${steps[step + 1]?.title || ""}`}
            tabIndex={0}
          >
            {/* Left: counts */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "17px", fontWeight: 900, color: "#ffffff", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>{all.length}</span>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>מרכיבים</span>
              <div style={{ width: "1px", height: "14px", background: "rgba(200,168,78,0.25)" }} />
              <span style={{ fontSize: "17px", fontWeight: 900, color: "#f0d060", textShadow: "0 2px 6px rgba(200,168,78,0.4)" }}>₪{displayTotal}</span>
            </div>
            {/* Right: single combined CTA pill */}
            <div style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "7px 14px", borderRadius: "10px",
              backgroundImage: "linear-gradient(135deg, #c8a832 0%, #f0d060 40%, #ffe599 52%, #c8a832 100%)",
              backgroundSize: "200% 100%",
              color: "#0d2e0d", fontWeight: 900,
              boxShadow: "0 2px 10px rgba(200,168,78,0.5)",
              animation: "shimmer 3s ease-in-out infinite",
              whiteSpace: "nowrap",
            }}>
              <span style={{ fontSize: "14px" }}>
                {step === steps.length - 1 ? (curSel.length > 0 ? "לסיכום" : "דלגו") : "המשך"}
              </span>
              <span style={{ fontSize: "16px" }}>←</span>
            </div>
          </button>
        </div>
      </div>
      <style>{KF}</style>
    </div>
  );
}

// ─── KEYFRAMES ──────────────────────────────────────────────

const KF = `
@keyframes bbRise { 0%{opacity:0;transform:translateY(30px)} 100%{opacity:1;transform:none} }
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
.hero-ring { position:relative; width:158px; height:158px; flex-shrink:0 }
.hero-bowl { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:108px; height:108px; pointer-events:none }
@media (max-width: 374px) {
  .hero-ring { width:110px; height:110px }
  .hero-bowl { width:76px;  height:76px  }
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
@keyframes cardFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
/* Layered so Tailwind utility classes (used by BariButton etc.) can still
   override this reset — an unlayered rule here would otherwise beat every
   Tailwind utility regardless of source order, per the CSS cascade layers
   spec. Same bug/fix as the one in globals.css's global reset. */
@layer base {
  * { -webkit-tap-highlight-color:transparent; box-sizing:border-box; margin:0; padding:0; }
}
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
  root: { position: "relative", width: "100%", maxWidth: "430px", minHeight: "100vh", margin: "0 auto", overflow: "hidden", fontFamily: "var(--font-heebo), 'Heebo', sans-serif", direction: "rtl", color: "#ffffff" },
  bg: { position: "fixed", inset: 0, zIndex: 0, background: "url(/homepage-assets/BG_8K.webp) center center / cover no-repeat, #020a02", filter: "brightness(0.45)" },
  bgRay: {},
  main: { position: "relative", zIndex: 2, display: "flex", flexDirection: "column", height: "100vh" },

  header: { padding: "8px 12px 6px", background: `linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.28) 100%), url(${headerImage}) center / cover no-repeat`, borderBottom: "2px solid rgba(200,168,78,0.4)", boxShadow: "0 4px 20px rgba(0,0,0,0.5), 0 0 30px rgba(200,168,78,0.08)", position: "relative" },
  headerTop: { display: "flex", alignItems: "center" },
  backBtn: { width: "34px", height: "34px", borderRadius: "10px", cursor: "pointer", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#ffffff", fontSize: "16px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-heebo), 'Heebo', sans-serif" },
  navBtn: { width: "34px", height: "34px", borderRadius: "10px", cursor: "pointer", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#ffffff", fontSize: "16px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-heebo), 'Heebo', sans-serif" },
  navBtnNext: { width: "34px", height: "34px", borderRadius: "10px", cursor: "pointer", background: "linear-gradient(135deg, rgba(200,168,78,0.35), rgba(240,208,96,0.25))", border: "1.5px solid rgba(200,168,78,0.55)", color: "#f0d060", fontSize: "16px", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-heebo), 'Heebo', sans-serif", boxShadow: "0 0 10px rgba(200,168,78,0.25)" },
  resetBtn: { width: "34px", height: "34px", borderRadius: "10px", cursor: "pointer", background: "rgba(239,83,80,0.18)", border: "1.5px solid rgba(239,83,80,0.5)", color: "#ff7575", fontSize: "17px", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-heebo), 'Heebo', sans-serif", boxShadow: "0 0 8px rgba(239,83,80,0.2)" },
  pricePill: { display: "flex", alignItems: "baseline", gap: "2px", background: "linear-gradient(135deg, rgba(200,168,78,0.15), rgba(180,140,40,0.08))", border: "1px solid rgba(200,168,78,0.4)", padding: "4px 12px", borderRadius: "12px", transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)" },
  priceS: { fontSize: "11px", color: "#d4b84a", fontWeight: 700 },
  priceV: { fontSize: "22px", color: "#ffffff", fontWeight: 900, textShadow: "0 2px 8px rgba(200,168,78,0.5)" },
  progressRow: { display: "flex", gap: "3px" },

  badgePill: { display: "flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "8px", background: "rgba(200,168,78,0.25)", border: "1px solid rgba(200,168,78,0.45)" },
  badgePillTxt: { fontSize: "10px", fontWeight: 800, color: "#f0d060", textShadow: "0 1px 2px rgba(0,0,0,0.5)" },
  badgeFlash: { position: "fixed", top: "58px", left: "50%", transform: "translateX(-50%)", zIndex: 200, display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", borderRadius: "14px", background: "linear-gradient(135deg, rgba(8,22,8,0.97), rgba(13,40,13,0.97))", border: "2px solid rgba(200,168,78,0.5)", boxShadow: "0 4px 24px rgba(200,168,78,0.25), 0 0 40px rgba(200,168,78,0.1)", backdropFilter: "blur(16px)", animation: "flashIn 2.2s ease both" },
  badgeFlashTxt: { fontSize: "14px", fontWeight: 800, color: "#f0d060" },

  sugRow: { display: "flex", gap: "6px", padding: "5px 12px 2px" },
  sugPill: { display: "flex", alignItems: "center", gap: "4px", padding: "3px 9px", borderRadius: "9px", background: "rgba(200,168,78,0.22)", border: "1px solid rgba(200,168,78,0.4)" },

  anchorRow: { display: "flex", gap: "5px", padding: "6px 10px", overflowX: "auto", scrollbarWidth: "none", borderBottom: "1px solid rgba(200,168,78,0.3)", background: "rgba(0,0,0,0.55)", boxShadow: "inset 0 -1px 0 rgba(200,168,78,0.12)" },
  anchorTab: { padding: "5px 12px", borderRadius: "8px", border: "1px solid rgba(200,168,78,0.4)", background: "linear-gradient(145deg, rgba(18,52,18,0.95), rgba(12,36,12,0.92))", color: "rgba(255,255,255,0.8)", fontSize: "11px", fontWeight: 700, cursor: "pointer", flexShrink: 0, transition: "all 0.15s", fontFamily: "var(--font-heebo), 'Heebo', sans-serif", textShadow: "0 1px 2px rgba(0,0,0,0.5)" },
  anchorActive: { background: "linear-gradient(145deg, rgba(200,168,78,0.18), rgba(180,140,40,0.1))", borderColor: "rgba(200,168,78,0.45)", color: "#f0d060" },

  content: { flex: 1, overflowY: "auto", overflowX: "hidden", padding: "4px 10px", scrollbarWidth: "none" },

  longPressHint: { display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", margin: "4px 0 10px", borderRadius: "16px", background: "linear-gradient(135deg, rgba(200,168,78,0.22), rgba(180,140,40,0.12))", border: "2px solid rgba(200,168,78,0.55)", boxShadow: "0 0 20px rgba(200,168,78,0.25), 0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)", animation: "hintPop 15s ease both, hintGlow 1s ease-in-out infinite alternate", pointerEvents: "none" },
  introCard: { display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", margin: "4px 0 8px", borderRadius: "12px", background: "linear-gradient(145deg, rgba(13,46,13,0.95), rgba(8,28,8,0.9))", border: "1px solid rgba(200,168,78,0.2)", boxShadow: "0 2px 10px rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" },
  draftNotice: {
    display: "flex", alignItems: "center", gap: "8px",
    padding: "9px 12px", borderRadius: "12px",
    background: "rgba(200,168,78,0.12)", border: "1px solid rgba(200,168,78,0.35)",
    fontSize: "12px", fontWeight: 700, color: "#f0d060", lineHeight: 1.5,
  },
  draftNoticeBtn: {
    flexShrink: 0, padding: "5px 10px", borderRadius: "8px", cursor: "pointer",
    background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)",
    color: "rgba(255,255,255,0.75)", fontSize: "11px", fontWeight: 800,
    fontFamily: "var(--font-heebo), 'Heebo', sans-serif",
  },
  chipInfo: {
    position: "absolute", bottom: "3px", right: "3px",
    width: "20px", height: "20px", borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(0,0,0,0.42)", border: "1px solid rgba(255,255,255,0.28)",
    color: "rgba(255,255,255,0.8)", fontSize: "11px", fontWeight: 900,
    lineHeight: 1, cursor: "pointer", padding: 0,
    fontFamily: "var(--font-heebo), 'Heebo', sans-serif",
  },
  capNotice: { display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", margin: "4px 0 8px", borderRadius: "12px", background: "rgba(255,183,77,0.12)", border: "1px solid rgba(255,183,77,0.42)", fontSize: "12px", fontWeight: 700, color: "#ffcc80", lineHeight: 1.5 },
  introText: { fontSize: "12px", color: "rgba(255,255,255,0.65)", fontWeight: 500, textShadow: "0 1px 2px rgba(0,0,0,0.5)" },

  sgLabel: { fontSize: "11px", fontWeight: 800, color: "rgba(200,168,78,0.85)", padding: "10px 4px 6px", textShadow: "0 1px 3px rgba(0,0,0,0.7), 0 0 8px rgba(0,0,0,0.3)" },
  grid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "7px" },

  // animationName/Duration/TimingFunction/FillMode used instead of the
  // `animation` shorthand so it can coexist with the per-chip `animationDelay`
  // set at the call site — mixing shorthand + animationDelay longhand on the
  // same element trips React's "conflicting property" dev warning.
  chip: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "10px 3px 7px", borderRadius: "16px", cursor: "pointer", position: "relative", minHeight: "74px", backgroundImage: "linear-gradient(155deg, rgba(50,115,50,0.9), rgba(30,75,30,0.85))", border: "2px solid rgba(200,168,78,0.55)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", boxShadow: "0 3px 12px rgba(0,0,0,0.5), 0 0 8px rgba(200,168,78,0.08), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.25)", color: "#ffffff", transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)", animationName: "chipIn", animationDuration: "0.25s", animationTimingFunction: "ease", animationFillMode: "both", outline: "none" },
  chipOff: { opacity: 0.2, cursor: "not-allowed", filter: "grayscale(0.5)" },
  check: { position: "absolute", top: "3px", left: "3px", width: "18px", height: "18px", borderRadius: "50%", background: "linear-gradient(135deg, #ffe066, #d4b84a)", color: "#0d2e0d", fontSize: "10px", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(200,168,78,0.5)" },
  popTag: { position: "absolute", top: "-1px", right: "-1px", background: "linear-gradient(135deg, #d4b84a, #f0d060)", color: "#0d2e0d", fontSize: "10px", fontWeight: 900, padding: "3px 8px", borderRadius: "16px 0 8px 0", boxShadow: "0 2px 4px rgba(0,0,0,0.35)" },
  chipEmoji: { marginBottom: "2px", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))" },
  chipName: { fontSize: "10.5px", fontWeight: 700, textAlign: "center", lineHeight: 1.15, color: "#ffffff", textShadow: "0 1px 3px rgba(0,0,0,0.6)" },
  chipCost: { fontSize: "10px", fontWeight: 800, color: "#f0d060", background: "linear-gradient(135deg, rgba(200,168,78,0.2), rgba(200,168,78,0.08))", border: "1px solid rgba(200,168,78,0.35)", padding: "2px 7px", borderRadius: "6px", marginTop: "2px", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" },

  bar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 20px max(14px, env(safe-area-inset-bottom))", background: `linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.25) 100%), url(${footerImage}) center top / cover no-repeat`, borderTop: "2px solid rgba(200,168,78,0.4)", boxShadow: "0 -4px 20px rgba(0,0,0,0.5), 0 0 30px rgba(200,168,78,0.08)" },
  heroBtn: {
    display: "flex", flexDirection: "column", alignItems: "stretch", gap: 0,
    padding: 0, borderRadius: "16px", cursor: "pointer",
    background: "linear-gradient(145deg, rgba(6,18,6,0.17), rgba(10,28,10,0.17)), url(/builder-assets/salad-card-bg.webp) center top / 102% auto no-repeat",
    border: "2px solid rgba(200,168,78,0.55)",
    boxShadow: "0 0 0 1px rgba(200,168,78,0.12), 0 8px 30px rgba(0,0,0,0.5), 0 0 40px rgba(200,168,78,0.08)",
    transition: "all 0.35s cubic-bezier(0.34,1.56,0.64,1)",
    outline: "none", fontFamily: "var(--font-heebo), 'Heebo', sans-serif", width: "100%",
    animation: "heroPulse 3s ease-in-out infinite", overflow: "hidden",
    // A flex item with overflow != visible gets an automatic min-height of 0
    // (CSS flexbox spec), so this button — the tallest thing in a scrollable
    // flex column — was the one the flex-shrink algorithm sacrificed first,
    // silently clipping the gold "לחצו להתחיל לבנות" strip below its own
    // fold before the column ever got a chance to just scroll instead.
    flexShrink: 0,
  },
  presetCard: {
    display: "flex", flexDirection: "row", alignItems: "center",
    gap: "7px", padding: "8px 10px", borderRadius: "10px", cursor: "pointer",
    background: "linear-gradient(135deg, rgba(13,40,13,0.95), rgba(8,24,8,0.9))",
    backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
    boxShadow: "0 0 0 1px rgba(200,168,78,0.07), 0 2px 10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
    transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)", outline: "none",
    position: "relative", overflow: "hidden",
  },
  clearDraftBtn: { marginTop: "10px", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", background: "rgba(239,83,80,0.1)", border: "1px solid rgba(239,83,80,0.25)", color: "#ef5350", fontSize: "11px", fontWeight: 600, fontFamily: "var(--font-heebo), 'Heebo', sans-serif", transition: "all 0.15s" },

};
