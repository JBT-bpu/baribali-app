# BariMeter — selected option 1 / Emerald Atelier

User approved option **1** on 2026-10-07. Implemented only in the existing
summary screen. The approved v8 header, luminous particle background, price,
pickup controls and checkout pipeline are unchanged. No new dependencies,
route, schema, provider settings, commit, push or deployment in this phase.

## Layer contract

`BariMeterFrame.tsx` combines three individually generated real-alpha WebPs:

| Layer | Dimensions | Bytes | Function |
| --- | --- | ---: | --- |
| barimeter-atelier-frame-v1.webp | 960×1360 | 194,396 | Gold arch, static BariMeter wordmark, emerald field; nine-sliced rails. |
| barimeter-atelier-macros-v1.webp | 960×185 | 24,816 | Blank macro faceplate; no baked numbers, labels or separators. |
| barimeter-atelier-bowl-v1.webp | 960×543 | 137,642 | Empty decorated bowl and oval plinth; actual choices are separate native buttons. |

Combined source payload: 356,854 bytes. Encoded by
`scripts/prepare-barimeter-atelier-v1.cjs`: mechanical alpha-margin trim,
960px-width resize, WebP quality 88, alpha quality 100. Alpha channel and zero
alpha pixels verified for every asset. Generated originals are preserved.
The native Next Image component may serve a smaller bowl for mobile screens.

Frame height is driven by content, not a fixed raster aspect ratio. Nine-slice
top/bottom and container-relative rail widths preserve artwork while the quiet
interior grows. The macro grid becomes 2×2 below 19rem of frame width, including
larger user font settings. Forced-colors mode replaces decorative artwork with
native outlines/text. Ingredient animations respect reduced motion.

`CompositionStats` remains native and uses the existing nutrition model,
including size-sensitive ranges, grams, the estimate disclaimer, explanation
disclosure, partial coverage notice and honest no-estimate fallback. No health
score or precision claim was added. Preparation instructions are excluded from
the pictured food, not from the order. Each visible ingredient appears once;
its existing button still emphasizes the relevant choice group.

## Visual truth and provenance

Generated-image directory:
`C:/Users/COMP13/.codex/generated_images/01a06340-dcbe-7fd0-b3cb-302686bed44f/`.

- Approved option 1: `exec-ddc8646a-35df-45bf-9b7a-06909199494a.png`.
- Frame: `exec-58271e5c-b5e2-4258-aea4-1d1604f7b15f.png`.
- Macro faceplate: `exec-f4b16750-cf02-4908-838c-b5c1498b2331.png`.
- Empty bowl/plinth: `exec-7be2a845-8300-4767-99bb-885e30be6713.png`.

Each asset was generated using the exact approved screen as its reference,
with transparency explicitly enabled. Prompts specified the selected emerald,
warm-gold material and botanical arch; an uncluttered stretchable frame field;
a single blank macro plaque; and a completely empty bowl, so no food or dynamic
numbers are falsely baked into the artwork. No application asset was cut from
the full-screen screenshot. `compare-barimeter-atelier.cjs` creates diagnostic
comparison sheets only, never production assets.

## Verification and remaining scope

Full suite: **257 passed**. Typecheck passed. Touched-component lint clean;
repo lint has zero errors and the same eight pre-existing warnings. Isolated
optimized production build passed, generating 37 pages. Visual QA and evidence
are appended to root `design-qa.md`.

Local production preview: `http://127.0.0.1:3004/build?size=M`.
The live Vercel deployment is **not** this version yet.

The reference food photograph is intentionally not hard-coded: actual selection
icons are recognisable and interactive. Richer per-ingredient food illustration
is an optional next art pass, not a changed nutrition model. All future live
payment/operational checks remain separate from this visual preview.
