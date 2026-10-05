# Customer UI refresh — 2026-10-04

Implemented locally in payment-foundation. No commit, push, merge or deployment.

## Scope and outcome

The user approved broad customer-facing visual improvements with room for
revision. Retained the chosen option 2 Botanical Cartouche, emerald/gold palette,
existing routes and customer order flow. No backend, database, provider settings,
pricing rules, dependency versions or secrets changed.

- Home: food-only custom artwork, one native title, quieter background and
  clearer supporting copy. Availability and the locked tortilla are unchanged.
- Sizes: three matching bowls, real illustrated shortcuts, native size/volume/
  effective price. Removed the obsolete baked-price poster/masking layout.
- Builder entry: matching bowl, readable caption, quieter recipe cards with
  actual catalog ingredient icons and a centered library chef icon.
- Active bowl: 106px box on a 320px screen, 114px on a 393px screen (114/122px
  including margins). Previously ~196px on the latter. All selected items,
  including extras and preparation choices, remain removable in a 44px rail.
- Keyboard: a focused offscreen removal button scrolls fully into view, with
  a visible inset focus ring. Enlarged counter/hint text can grow the panel.
- Detail/summary/confirmation/tracking: targeted contrast improvements;
  preserved the bespoke summary, seal and tracking artwork and its geometry.
- Motion: finite feedback instead of perpetual recipe bobbing or the builder
  Lottie/Tilt panel. GoldField pauses on visibilitychange and respects reduced
  motion. Removed obsolete builder animation warming.
- Loading: entry/ingredient content no longer starts invisible behind a
  mount-animation timer. Arrival and deliberate step choreography are retained.

Bowl illustrations are decorative, not photographs of actual serving volumes
or a nutritional representation. The active preview shows up to three selected
food icons; every choice remains in the actual order and nutrition inputs.

## Verification

- 225 regression tests passed, 0 failed.
- Final production build passed; 37 static pages, TypeScript passed.
- Error-level lint passed across touched files. Existing React effect warnings
  were not treated as a dependency/refactoring project.
- Plaque, tracking, bowl and seal geometry verification passed.
- Isolated browser: home/size/entry/ingredients/detail/closed summary/open
  checkout/tracking/confirmation lab captured; no console or page errors.
- 29 legal choices survived at 320×640, 393×852, 430×932, 768×1024 and 1280×900;
  no page-wide horizontal overflow or broken loaded images. Removal controls
  remained 44×44, keyboard-visible and focusable. Count stress tested to 64
  in unit geometry, without increasing the business limit.
- S/M/L selection, modal Tab containment, Escape and focus return passed at
  320, 393 and 430px. Pickup 09:30 selection enabled the truthful hosted-payment
  CTA; it was NOT clicked.
- Canvas draw probe: running 488, hidden 0, resumed 1220, reduced 0 during the
  respective sample windows. Preference-event settling allowed before sampling.
- Scoped doubled counter/hint text had no collision; not full browser zoom or
  WCAG certification.
- Browser API calls were mocked, external requests and non-GET writes blocked.
  No real order, payment or Supabase mutation occurred.

Visual evidence and acceptance: [design-qa.md](../design-qa.md).
Capture directory: .playwright-cli/ui-refresh-2026-10-04/.
Before/after boards use equal 393×852 captures, before left / after right.

## Exact pre-turn rollback snapshot

A copy of the precise pre-refresh UI files (including existing dirty edits)
is preserved locally at:
.playwright-cli/ui-refresh-2026-10-04/ui-before.tar.gz

Original creation: /tmp/baribali-ui-restore-YBaT8w/ui-before.tar.gz.
The archive contains UI/source/test/QA files only; no .env, credentials or .git.
It is ignored and must not be committed or publicly uploaded.

Restoration should select only the intended files and preserve any later work.
Do not use a repository-wide reset. Newly added this turn, outside that archive:
the four bowl WebPs below, HeroBowlCard.module.css and this report. Earlier
cartouche files and unrelated working docs belong to the pre-turn state.
Old public artwork was deliberately left in place.

## Asset manifest

| Production asset | Dimensions | Bytes |
| --- | --- | --- |
| public/homepage-assets/salad-bowl-s-v2.webp | 640×640, alpha | 84,988 |
| public/homepage-assets/salad-bowl-m-v2.webp | 640×640, alpha | 110,516 |
| public/homepage-assets/salad-bowl-l-v2.webp | 640×640, alpha | 137,164 |
| public/builder-assets/builder-bowl-empty-v2.webp | 384×384, alpha | 28,566 |

Created with the built-in ImageGen tool. Native sharp performed mechanical
resize/WebP compression (quality 88, alphaQuality 100), not creative editing.
The original generated images remain untouched in:
C:/Users/COMP13/.codex/generated_images/01a06340-dcbe-7fd0-b3cb-302686bed44f/

Original PNGs:
- S: exec-4787e5ed-1185-4561-b30d-0f4cddcd9da2.png
- M: exec-c5202b77-00d8-4f31-a88a-8051b919ccd8.png
- L: exec-0b5ce173-bd68-4e53-9d8c-afb51d2498ba.png
- Empty: exec-483af48d-8a3d-4645-9804-8f6519a92c0b.png

## Generation prompts

### medium

Use case: product-mockup.
Asset type: production BariBali mobile UI food artwork; one isolated MEDIUM 1000ml salad bowl, for a 210x210px image slot on a 210x286px product card and for a size selector. Square composition.
Input image 1 is a STYLE/PALETTE reference only: the selected BariBali botanical gold/emerald masthead. Input image 2 is an OLD bowl/card reference only, NOT an edit target and NOT a requested card.
Create a new sophisticated, appetizing food illustration/render: a polished deep emerald-green ceramic salad bowl with a delicate warm metallic gold rim and very subtle botanical engraving, three-quarter front view slightly from above. Rich fresh lettuce, baby leaves, cucumber slices, cherry tomato halves, fine white/purple cabbage; believable juicy food textures and gently painterly premium 3D lighting, consistent with the reference rather than a flat cartoon. Medium-width rounded bowl, visually about 1000ml but no volume text. Bowl and vegetables form a clean coherent silhouette centered; complete bowl visible, ample 10% clear margin all sides. Broad soft top-left studio light and a subtle localized contact shadow immediately beneath the bowl. No cutlery, no separate props, no floating leaves, no decorative card/frame, no distant scenery, no bokeh. No text, lettering, labels, logos, currency, prices, numbers, buttons, or watermark anywhere.
Genuinely TRANSPARENT background, preserve clean alpha edges around the food. This is ONE raster UI asset, not a screenshot or a poster. Render crisply at small mobile size.

### small

Use case: product-mockup. Asset type: single production BariBali SMALL 750ml salad bowl cutout for a 210x210px mobile image slot. The input image is the approved medium bowl STYLE AND MATERIAL reference, not the final requested size.
Create ONE matching SMALL 750ml bowl: compact, slightly narrower bowl with a shallower side wall and a modest amount of vegetables. It must look visibly smaller in capacity than the reference, without simply scaling the same bowl photograph.
Preserve the reference family exactly: deep emerald glazed ceramic, delicate warm metallic gold rim, fine botanical leaf engraving, same three-quarter front camera slightly above, soft top-left studio light, realistic gently painterly premium render. Food uses the same fresh lettuce/baby greens/cucumber/cherry tomatoes and fine white/purple cabbage, arranged naturally rather than copied exactly. Center the complete bowl and vegetables with 10% clear margins and a small localized soft contact shadow. Square image. The only subject is one bowl of salad. Genuinely transparent background with clean alpha. No table, frame, scenery, utensils, extra props, floating leaves, bokeh, text, numbers, labels, prices, logos or watermark. Do not create a sprite sheet or a card.

### large

Use case: product-mockup. Asset type: single production BariBali LARGE 1500ml salad bowl cutout for a 210x210px mobile image slot. The input image is the approved medium bowl STYLE AND MATERIAL reference, not the final requested size.
Create ONE matching LARGE 1500ml bowl: generously wide, noticeably deeper bowl with more plentiful vegetable layers. It must look visibly larger in capacity than the reference, without simply scaling the same photograph.
Preserve the reference family exactly: deep emerald glazed ceramic, delicate warm metallic gold rim, fine botanical leaf engraving, same three-quarter front camera slightly above, soft top-left studio light, realistic gently painterly premium render. Food uses the same fresh lettuce/baby greens/cucumber/cherry tomatoes and fine white/purple cabbage, arranged naturally rather than copied exactly. Center the complete bowl and vegetables with 10% clear margins and a small localized soft contact shadow. Square image. The only subject is one bowl of salad. Genuinely transparent background with clean alpha. No table, frame, scenery, utensils, extra props, floating leaves, bokeh, text, numbers, labels, prices, logos or watermark. Do not create a sprite sheet or a card.

### empty

Use case: product-mockup. Asset type: one transparent production UI bowl base for BariBali's compact ingredient-builder preview (displayed about 96x96 CSS pixels).
Input image is the style/material/camera reference: the approved medium filled salad bowl.
Recreate the SAME emerald glazed ceramic bowl with a thin warm gold rim and subtle botanical engraving, same three-quarter front angle slightly from above and soft top-left light, but make it COMPLETELY EMPTY: no lettuce, vegetables, food, utensils or objects inside or outside. Clearly visible clean dark-emerald inner bowl surface, not a flat black hole. The bowl must be complete, centered, with 10% margins in a square composition, and a small localized contact shadow. Match the reference's premium gently painterly realistic rendering, no logo/text/labels/prices/numbers/frame/scenery/bokeh/watermark. Genuine transparent background with clean alpha edges. This is a single bowl object, not a UI card or a sprite sheet.
