# Botanical salad card — 2026-10-05

Implemented after the owner's approval of the scoped mockup. Preserves
v1.0 structure; this is not the earlier full-screen botanical redesign.

## Asset and behavior

- Workspace asset: C:/Users/COMP13/Documents/ChatGPT/BariBali/payment-foundation/public/homepage-assets/card-salad-botanical-54-v1.webp.
- 630×858, 174,040 bytes; displayed at the existing 210×286 card footprint.
- Built-in ImageGen, followed by mechanical sharp resize/WebP compression
  (quality92). Original retained at C:/Users/COMP13/.codex/generated_images/01a06340-dcbe-7fd0-b3cb-302686bed44f/exec-a9bad7c3-87c0-419f-8643-a1e0f10760dc.png.
- Title, starting-price plaque and footer caption belong to the illustration.
  Real availability, button behavior, accessible name and selection state remain
  in code. Existing finite sheen/rim feedback and reduced motion are preserved.
- The illustrated54 is a minimum base price, not a total. Runtime uses the
  minimum effective750/1000/1500 prices. `matchingSaladHeroArtwork` permits the
  image only while its price/title/subtitle match the current menu. Otherwise
  the native bowl, current price and copy remain visible. No pricing authority,
  ingredient catalog, server route or menu override changed.
- Native fallback also handles an image-load failure, forced colors and viewport
  height≤560. Original assets retained, no dependency changes or new routes.

## Verification and delivery

229 focused tests passed; TypeScript, full lint (0 errors,8 existing warnings)
and production build (37 pages) passed.
Isolated browser checks cover selection/M handoff, Escape/focus, RTL/locked
choices, 320/393/430/768 widths, short screens, forced colors and actual poster
404. APIs mocked; no real order/payment or remote data mutation.

Full-view and focused source/implementation comparisons inspected and passed.
See ../design-qa.md and .playwright-cli/card-botanical-2026-10-05/.

The owner subsequently requested the original bright background and full
particle density, plus publication for phone review. The home scrim, tracking
background and home/size-picker/tracking particle density match7bbacf4 again.
Existing reduced-motion/hidden-tab safeguards and all other UI improvements
remain. The browser confirmed111 mobile sprites per frame and normal/frozen
motion behavior. No further card redesign is authorized until this review.

Publication is authorized only on codex/payment-foundation through the existing
Git-based Vercel Preview. The delivery message supplies the verified READY URL.
Production/main, provider settings, environment variables and protection remain
unchanged. Rollback is a scoped revert of this visual phase, never a repo reset.

## Reference and exact built-in prompt

Reference passed to ImageGen:
C:/Users/COMP13/.codex/generated_images/01a06340-dcbe-7fd0-b3cb-302686bed44f/exec-acc77686-7285-410e-b02e-07d63ff49e62.png.

```text
Use case: precise-object-edit / product-mockup.
Input image is the EXACT selected and approved BariBali v1.0 home mockup. Extract/recreate ONLY its single central illustrated salad card as a clean standalone production UI raster asset, matching the source card faithfully. Do not output the whole screenshot.
Production component footprint: 210 x 286 CSS pixels. Output artwork in this exact 210:286 aspect ratio, high resolution roughly 840x1144 or equivalent, complete rectangular canvas edge to edge. Do not add empty margins or another background around the card. A faintly rounded engraved-gold perimeter sits inside the edges; the container handles the final18px CSS corner clipping. Card fills the entire output.
MATCH the source card: rich very dark emerald shaded botanical backdrop, restrained carved gold border and gold leaves at corners, ivory/gold Hebrew title integrated toward top, a small gold leaf divider, central appetizing emerald glazed ceramic bowl with delicate engraved gold foliage and realistic lettuce/cucumber/tomato/purple cabbage, gold starting-price plaque near bottom, small ivory caption below it. Preserve the title/bowl/plaque arrangement, proportions, food and the artistic metal/leaf details. This is a full bespoke card composition with illustrated typography, not a bare bowl, generic stock photo or new layout.
Exact embedded text (only these three strings, verbatim):
Title: "הסלט שלכם"
Price plaque: "החל מ־54 ₪"
Bottom caption: "בחירת גודל · הרכבה חופשית"
Hebrew RTL correct, readable at210px display width; title around26–28 CSS px equivalent, price around17px, caption at least11px. No repeated title, no extra slogan, no volumes or sizes, no English logo.
ONE intended change from the source card: OMIT the small gold "זמין" badge at the upper right; no availability label, no empty drawn pill. Leave that same upper-right region visually quiet dark emerald because a real live availability badge will be overlaid by the application there. Keep the embedded title below that badge area as in the source, so the application badge cannot overlap the title. Reserve x154–200 y9–33 CSS-pixel equivalent as quiet background.
No whole page logo, stars wallpaper, navbar, app background, CTA, handset, frame of a phone, UI outside the single card, shadows outside canvas, cropped leaves, watermarks or multiple options.
Create ONE final isolated card asset faithful to the approved reference. The embedded54 is a catalogue starting-price variant, never a payment total. Everything else outside the source card is omitted.
```
