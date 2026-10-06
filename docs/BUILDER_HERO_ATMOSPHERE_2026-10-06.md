# Builder hero: non-botanical atmosphere — 2026-10-06

Owner feedback: the recognizable foliage behind the bowl looked too much like
part of the salad. Replace only the background; retain v1.0 layout and all
existing independent foreground layers.

## Delivered asset and implementation

- Built-in Image Gen, reference-guided generation (not CLI/API fallback).
- Reference: fresh v6 card context, `.playwright-cli/canopy-balance-2026-10-06/hero-final-393.png`.
- Original generated master:
  `C:/Users/COMP13/.codex/generated_images/01a06340-dcbe-7fd0-b3cb-302686bed44f/exec-56377dcf-d8ad-4836-ab42-197164b1f708.png`.
- Workspace master, retained outside Git:
  `.playwright-cli/hero-atmosphere-2026-10-06/masters/entry-atmosphere-background-v1.png`.
- Runtime asset: `public/builder-assets/entry-atmosphere-background-v1.webp`,
  **720 × 480, opaque, 69,718 bytes**. Source PNG: 1536 × 1024.
- Mechanical export only: Sharp width 720, no enlargement, WebP quality 86,
  effort 6. No scripted repainting, grading or semantic image editing.
- CSS points only to this version. Old v6 remains available for rollback.
- Existing 42% background-only inset shade remains unchanged; foreground bowl,
  frame, copy and gold plaque are not shaded by it.
- S/M/L facts remain native: ₪54 / ₪59 / ₪72. No new dependencies or baked text.
- No changes to the page backdrop/particles, recipes, banner, card dimensions,
  fonts, ordering, payments, provider settings, secrets or database.
- Local isolated preview: http://127.0.0.1:3004/build?size=M. Not published.

## Final prompt

```text
Use case: stylized-concept
Asset type: one opaque background layer for an existing emerald-and-gold mobile salad-builder hero card. Landscape 3:2.
Input images: Image 1 is ONLY a palette and layout reference showing the currently rendered card. Do NOT output that card or redraw its text, salad, bowl, frame or button.
Primary request: Generate a rich, elegant non-botanical emerald background that separates the vivid salad product from its setting. The existing background's recognizable green leaves are being mistaken for extra salad ingredients; remove that visual ambiguity entirely.
Scene/backdrop: A close, subtly dimensional jade-green artisan material surface, fine-grained and satin-matte, with soft atmospheric depth and a gentle wash of warm reflected light. A faint restrained champagne-gold mineral sheen in the surface can harmonize with the existing gold frame, but must not become ornaments or glitter. It should feel inviting and crafted, not a flat cheap gradient and not a forest or food photograph.
Composition: The actual UI has native ivory text in the LEFT half and a separate bright salad bowl in the RIGHT half. Keep both halves naturally connected with continuous material texture. Give the left subtle visible depth, not dead black. Give the right a calm soft mid-dark emerald field so the separate bowl silhouette stands out. Fine texture, small scale; no identifiable objects or foreground elements. Lighting is gently balanced across the whole image, with no white/yellow hotspot or dramatic spotlight.
Palette: deep warm emerald, jade, and restrained moss-green reflected light. Saturated but natural, no neon, no blue-teal cast, no milky haze. Moderate dark-to-mid values that support ivory text, retaining visible detail.
Constraints: Background ONLY, filled opaque to all edges. NO leaves, herbs, vegetables, fruit, botanical silhouettes, vines, bowls, plates, salad, food, text, logos, frames, borders, cards, buttons, panels, crests, stars or watermark. No garden foliage even out of focus. No large marble veins or decorative stripes. Existing actual foreground product and gold ornament will remain separate unchanged code/assets.
```

## Verification and evidence

Root: `.playwright-cli/hero-atmosphere-2026-10-06/`.

- Fresh pre-change and final captures at 393 × 852 CSS px, DPR 1, M, empty draft,
  Hebrew RTL, identical isolated open-shop fixtures and reduced motion.
- `hero-before-after.png`: 734 × 240, before LEFT / after RIGHT.
- `entry-before-after-393.png`: 798 × 852, same full-view comparison.
- `background-source-export.png`: 1212 × 400, source versus runtime export,
  each normalized to 600 × 400 without stretching.
- `primary-phone-widths.png`: unscaled 360, 390, 393, 412, 430 CSS-px captures.
- `narrow-text-stress.png`: 320 CSS-px entry and 200% computed-font-size stress.
- `browser-results.json`: nine viewports, canonical prices, keyboard start,
  recipe load/focus restoration, draft retention, forced colors, normal/reduced
  motion, missing-background/bowl fallbacks and shop fixtures.
- Conservative background contrast check: lowest **6.61:1** across 28 title/body
  bounding regions, minimum 8.16:1 body / 10.62:1 title at 393 px.
  Uses actual padding-box cover mapping (1 px border inset) and native 42% shade.
  This is a background-only conservative check, not glyph sampling or a full
  accessibility certification.
- 247 regression tests passed; standalone TypeScript and isolated production
  build passed; ESLint 0 errors, 8 existing warnings.
- Browser: no page exceptions or attempted writes. Three expected resource
  errors from deliberately aborted asset requests; fresh normal render had no
  console warnings/errors.
- Read-only browser checks block all non-GET/HEAD and external requests; no
  orders, payments, real backend changes or user-profile/tab mutations.

Physical-phone, Safari, high-DPR-device, GPU and performance measurements remain
outside this pass. Root `design-qa.md` records the reviewed fidelity surfaces.

Rollback is a scoped CSS/test URL switch to the retained v6; no old art was
deleted and no Git/Vercel publish occurred.
