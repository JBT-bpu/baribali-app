# BariBali — Order Summary Page: Design Review & Roadmap

> Reviewed: 2026-03-17
> Reviewer context: senior product design / UX / conversion audit
> Status: active — implement in priority order

---

## What the page currently is

1. **Fixed header** — brand image with dark overlay, back arrow (→), title "הסלט שלכם", live price pill
2. **Emoji bowl** — layered ingredient icons grouped by food type (greens bottom, proteins top), 220px wide
3. **Combo achievement badges** — shown only when combos triggered
4. **Group cards** — one per category (veggies, protein, sauces, finish, upgrade), with per-item rows showing emoji + name + optional calorie + optional price delta
5. **Notes textarea** — always-visible, 200 char, special requests
6. **Price breakdown card** — base price + extras itemized + total line
7. **Sticky bottom bar** — gold CTA "שלח הזמנה 🥗" with inline price badge, brand footer image behind
8. **MixingAnimation** → **OrderedScreen** pipeline triggered on tap

---

## STEP structure (from salad-data.js)

| Step ID | Title | Max Picks | Notes |
|---------|-------|-----------|-------|
| veggies | בחרו ירקות | unlimited | 5 subgroups: leaves, fresh, grains, baked, toppings |
| protein | תוספת כלולה | 1 | single subgroup |
| sauces | רטבים | 2 | 2 subgroups: classic, special |
| finish | ערבוב ולחם | — | 2 subgroups: mixing style, side |
| upgrade | שדרוג | — | premium paid add-ons |

Typical user order: **5–12 ingredients across 3–5 cards**. Scroll depth is manageable.

---

## Strengths (keep these)

- Emoji bowl is unique and creates ownership moment — no other food app does this
- Price visible in two places (header + CTA) — eliminates cost anxiety
- Edit buttons per category — non-destructive corrections
- Dark premium aesthetic consistent with brand
- Notes field covers a real need
- GroupCard category structure is scannable

---

## Weaknesses (must fix)

### Critical bugs / UX errors

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| 1 | Back arrow `→` is wrong direction in RTL | `S.backBtn` | Change to `←` |
| 2 | Edit button touch target is ~28px (min 44px required) | `S.editBtn` | Increase padding |
| 3 | Notes textarea always visible — wastes scroll space for 80% of users | `notesBox` | Collapse to tap-to-expand |
| 4 | Double-confirmation: MixingAnimation ConfirmPhase + OrderedScreen both say "ההזמנה נשלחה" | Both components | Pick one owner; make ConfirmPhase terminal OR skip it |
| 5 | CTA button is right-aligned partial width | `S.bar` | Full-width button |

### Visual hierarchy issues

| # | Issue | Fix |
|---|-------|-----|
| 6 | Price total `24px` — too small for the emotional anchor it should be | Increase to 36–40px + gold glow |
| 7 | Calories shown at 9px `rgba(255,255,255,0.3)` — invisible ghost data | Remove per-item OR consolidate to one bowl-level calorie pill |
| 8 | Emoji bowl is 220px and visually secondary | Make it the hero (full-width treatment, gold glow beneath) |
| 9 | Combo badges poorly anchored between bowl and cards | Full-width reward banner with title "🏆 שילובים שנבחרו" |
| 10 | No appetite language, no emotional framing | Add generated salad descriptor or dynamic title |

### Trust / conversion gaps

| # | Issue | Fix |
|---|-------|-----|
| 11 | Nothing tells user what happens after ordering | Add "מוכן בכ-8 דקות" line above CTA |
| 12 | No delivery/pickup/ETA context anywhere | Even one micro-line eliminates hesitation |
| 13 | Page reads as a receipt, not a moment of anticipation | Visual and copy tone upgrade |

---

## Implementation Roadmap

### Phase 1 — Quick Wins (do now, 1–2 hours total)

1. **Fix RTL back arrow** → change `→` to `←` in `S.backBtn` and button text
2. **Full-width CTA button** → remove `justifyContent: "flex-end"`, make button stretch
3. **Increase total price size** → `sumTotal` fontSize `36px`, add gold glow
4. **Fix edit button touch targets** → add `minHeight: "36px"`, `padding: "6px 12px"`
5. **Collapse notes by default** → replace textarea with `[📝 הוסף הערה +]` tap-to-expand
6. **Add trust line above CTA** → `"{N} מרכיבים · מוכן בכ-8 דקות"` above button
7. **Resolve double-confirmation** → remove `OrderedScreen`, make `MixingAnimation` ConfirmPhase terminal (call `onComplete` → `setOrdered(true)` stays but OrderedScreen content changes to just "Restart" option)

### Phase 2 — Strong Upgrades (next iteration)

8. **Elevate the emoji bowl to hero** — larger, centered, gold radial glow beneath, animated entrance
9. **Dynamic salad name/descriptor** — tag-based (lots of protein → "בניית כוח", Mediterranean → "מנה ים תיכונית")
10. **Consolidated calorie pill** — single `~{totalKcal} קק״ל` below bowl, remove per-item calories
11. **Add ingredient count to group card headers** — `"🥬 בסיס הסלט · 2 מרכיבים"`
12. **Combo badge as reward banner** — full-width gold panel with spacing, not a tight row of pills
13. **Price total gold glow animation** — shimmer on total line matching brand

### Phase 3 — Premium / Ambitious

14. **Interactive bowl** — tap emoji → corresponding group card pulses/highlights
15. **Nutritional ring summary** — small arc diagram (protein/fat/carb bands) below bowl
16. **Food texture ambient layer** — ultra-dark blurred ingredient photo in bowl section for appetite appeal
17. **Trust micro-copy** — `"אנחנו משתמשים בחומרי גלם טריים בלבד"` below price card
18. **Haptic feedback on CTA tap** — immediate vibration before animation starts

---

## Ideal Layout Blueprint

```
┌─────────────────────────────────┐
│  [←]  הסלט שלכם    [₪{total}]  │  ← sticky header, brand image bg
├─────────────────────────────────┤
│                                 │
│       [SALAD BOWL VISUAL]       │  ← HERO, ~300px, full-width feel
│    emoji layers + gold glow     │
│   "12 מרכיבים · ~640 kcal"     │  ← unified pill below bowl
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 🏆 שילובים שנבחרו          │ │  ← reward banner (if any)
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 🥬 בסיס · 2 מרכיבים  [ערוך]│ │
│ │  חסה · תרד                 │ │
│ └─────────────────────────────┘ │
│ ┌── other category cards ─────┐ │
│                                 │
│ [📝 הוסף הערה +]               │  ← collapsed notes
│                                 │
│ ┌─────────────────────────────┐ │
│ │ סלט בסיס         ₪54       │ │
│ │ + פרמיום טופינג  +₪6       │ │
│ │─────────────────────────────│ │
│ │ סה"כ             ₪60 ← BIG │ │
│ └─────────────────────────────┘ │
│                                 │
│  15 מרכיבים · מוכן בכ-8 דקות  │  ← trust line
│                                 │
├─────────────────────────────────┤
│  [  🥗  שלח הזמנה  |  ₪60  ]  │  ← FULL WIDTH gold CTA
└─────────────────────────────────┘
```

---

## Copy / Microcopy Improvements

| Current | Improved | Reason |
|---------|----------|--------|
| `הסלט שלכם` | `הסלט שלכם מוכן` or dynamic name | More ownership |
| `שלח הזמנה` | `אשר הזמנה ·  ₪{total}` | Clearer commitment language |
| `ההזמנה נשלחה!` | `בהכנה!` | More immediate, present tense |
| `הסלט שלכם בהכנה` | `מכינים את הסלט שלכם עכשיו` | Action in progress |
| `+ הזמנה חדשה` | `הזמנה חדשה →` | Direction implies flow |
| `מקסימום 200 תווים` | `{N} תווים נותרו` | Less restrictive tone |
| `📝 הערות מיוחדות (לא חובה)` | `📝 הערה לבשלן` | More personal, kitchen-facing |

---

## Assets Needed for Deeper Review

Priority order:

1. **Screenshot of summary page on 390px mobile** — scrolled to top, and scrolled to bottom CTA
2. **Screen recording of MixingAnimation → OrderedScreen flow** — to confirm double-confirmation issue
3. **Food photography / ingredient texture images** — for ambient layer in Phase 3
4. **Color tokens / brand guide** beyond what's in code
5. **Competitor references** — apps that "feel right" or "feel wrong" to the client

---

## Notes on MixingAnimation Double-Confirm Problem

MixingAnimation ConfirmPhase already shows:
- Gold seal with ✓
- "ההזמנה נשלחה"
- "הסלט שלכם בהכנה · תודה!"
- Price with shimmer
- Ingredient count

Then OrderedScreen (after animation completes) shows:
- Gold ring + ✓
- "ההזמנה נשלחה!"
- "הסלט שלכם בהכנה"
- Price with shimmer
- "מוכן בקרוב"
- "+ הזמנה חדשה" button

**Recommended resolution:** MixingAnimation ConfirmPhase = cinematic moment only, no order-sent copy. OrderedScreen = the actual confirmation state with ETA, restart button, and any post-order content. Alternatively: skip ConfirmPhase in MixingAnimation (end at GlowPhase) and let OrderedScreen be the full conclusion.
