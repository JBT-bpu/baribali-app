# Design QA — botanical customer UI extension, 2026-10-05

## Current phase acceptance

final result: passed

The short-screen P2 below was repaired and passed post-fix capture/comparison.
No actionable scoped P0/P1/P2 remains. This extends the owner's approved botanical
salad card art direction
through v1.0, without a new layout or dependency. The current phase is local:
publication is awaiting explicit owner approval. Earlier Preview authorization
and URLs below refer only to the prior phase, not these new changes.

## Visual truth and actual combined comparisons

Primary style truth: `public/homepage-assets/card-salad-botanical-54-v1.webp`.
Seven new built-in ImageGen outputs were opened and inspected in original and
optimized form. Exact variants, original PNG paths and generation briefs:
`docs/BOTANICAL_UI_SYSTEM_2026-10-05.md`.

Actual same-turn before and after captures use a 393×852 CSS viewport and pixels,
deviceScaleFactor 1, guest, closed-shop fixture, reduced motion. No device frame
or browser chrome is included. Sources are 630×816 (size cards), 630×858 (home
future cards), 960×320 (panel texture), 512×384 (alpha journal).

- Combined five-card comparison:
  `.playwright-cli/art-system-2026-10-05/source-and-render-board.png`.
  Source top, rendered implementation below; S/M/L and pasta/wraps left-to-right.
  Normalize sources to 210×272 and 210×286 respectively, not a stretched mockup.
- Focused comparisons:
  `.playwright-cli/art-system-2026-10-05/compare-S.png`, `compare-M.png`,
  `compare-L.png`, `compare-pasta.png`, `compare-wraps.png`.
  Source left, actual browser right, matching scale. Full-view crops use
  (92,319,210,272) for sizes and (92,258,210,286) for home; identical half-pixel
  screenshot rounding conventions. Native selected/coming-soon badges are
  intentional overlays, not missing or baked source elements.
- Actual full-view before/after comparisons:
  `.playwright-cli/art-system-2026-10-05/before-after-01-home.png`,
  `before-after-02-size.png`, `before-after-03-entry.png`,
  `before-after-04-orders.png`; each is 802×852, before left / after right.
- Short-screen repair comparison: `compare-short-stage-fix.png`, 652×540.
  Left is a clearly labelled browser-only reconstruction of original stage
  sizing; right is the actual repaired implementation, both 320×540. It is not
  represented as an archived pre-edit source screenshot. The initial screenshot
  was inspected before discovering the issue; the final matrix recaptured it.
- Additional implementation states: `recipe-expanded.png`, `builder-step-after.png`,
  `builder-step-verified.png`, `summary-after.png`, `summary-price-panel.png`,
  `summary-price-viewport.png`, `profile-after.png`, `login-after.png` in that folder.

Both source and implementation were visually inspected from the combined
boards, not inferred from filenames or separate thumbnail views.

## Five required fidelity surfaces

- Fonts/typography: unchanged self-hosted Heebo/Secular One for native UI;
  generated ivory Hebrew lettering matches the approved poster style. Titles,
  tier letters and prices are legible at the unchanged card dimensions. Volume
  and descriptors are subordinate raster captions, not an accessibility claim.
  Real native ARIA labels expose exact live size/price/volume. Native text appears
  in forced colors, short/zoomed viewports, changed offers and image failures.
- Spacing/layout rhythm: home stays 210×286, size stays 210×272 at 393×852;
  entry 180.5px, live bowl 114px before/after selection. Twelve recipe buttons
  retain the original two-column compact grid. Nine-sliced corners do not grow
  padding/boxes; guest actions remain below copy and clear of the bottom dock.
- Colors/tokens: preserved emerald/gold/ivory identity, luminous backdrop and
  full field density. Source and browser card palettes align. Availability is
  a real native badge; unlaunched food is intentionally visible rather than
  obscured by a giant lock. Full-color art never means orderability.
- Image quality/fidelity: 3× WebP posters retain real bowl/leaf relief details;
  no handcrafted CSS/SVG substitute. S restrained, M richer relief, L pedestal
  and double botanical perimeter. Slight differences in bowl visual scale are
  artistic composition, not measured servings. Journal has genuine alpha and
  blank pages; no invented account facts. Panel uses real nine-slicing.
- Copy/content: exact S54/M59/L72 and 750/1000/1500 variants are runtime guarded
  against effective menu prices and descriptions. Future cards have no prices
  or dates. Pasta and sandwiches/tortillas explicitly remain coming soon.
  Guest-first instructions/CTA are coherent. Nutrition, totals and legal facts
  remain native, and existing checkout/recovery safeguards are unchanged.

## Verified interactions and viewport resilience

Isolated Chrome sessions; fixture APIs, external hosts and all non-GET/HEAD
requests blocked. Final browser runs reported zero runtime errors and zero
attempted writes. Signed-in sessions were not borrowed or fabricated.

- Home: salad pointer/Enter opens the original picker; future cards pointer/
  Enter stay on home without opening ordering. RTL arrows preserve roving focus.
- Sizes: S/M/L illustrated at identical dimensions; native selection marker,
  focus follows arrows, Tab remains inside, Escape restores the opener.
  L confirmation reaches `/build?size=L` and reopening retains L.
- Entry/recipes: real shared panel loaded; recipe expands/collapses; loading
  signature recipe still quotes 67. Ingredient details, add and remove work;
  bowl height is unchanged (114px empty and selected). Five-step flow reaches
  summary with native total 67; no submit button pressed.
- Guest orders/profile/login: art/logo loaded; full-width guest actions navigate
  to home. Targets are 54px / 54px / 52.5px at the canonical viewport.
- 320×540, 320×640, 393×852, 430×932, 768×1024: no horizontal overflow across
  home, picker, entry, guest orders/profile/login. Picker confirmation remains
  reachable and guest controls do not disappear below the dock.
- At 320×540 home and picker use native offers; forced colors also reveals
  native facts. Intentional M, pasta and wrap 404s preserve live native facts
  and availability. M fallback confirmation still reaches the builder; future
  fallbacks stay locked.
- Field: 111 mobile sprites (92 sparks +19 bokeh), frozen reduced-motion frames,
  advancing normal-motion frames; size picker retains 111. Existing finite
  sheen and coordinated handoff remain, no new permanent animation loop.
- 235 focused tests, TypeScript and production build passed; full ESLint:
  zero errors and eight unchanged warnings. React review: no new fetch/effect,
  timer/listener, provider boundary or pointer-blocking decoration.

## QA history, follow-up and limits

The canonical equal-scale card and full-view comparisons passed. Subsequent
short-screen inspection found one P2: the absolute 272px size card extended
outside its clamped stage and covered about 13px of the confirmation button at
320×540. This violates touch-action visibility even though a bounding-box-only
reachability assertion passes. The current result was set blocked during repair.

Fix: only at height ≤600px, reserve a 272px minimum, non-shrinking stage;
existing safe-centering/modal scrolling handles the extra height. Card size and
canonical-screen layout are unchanged. Add a regression/source assertion and a
browser assertion for at least 8px between card and CTA. The full resilience run
then passed again. `compare-short-stage-fix.png` was opened and inspected; the
post-fix gap is about 14.8px. Confirmation and Back remain reachable by scrolling.
Login supporting copy was also brightened against the restored luminous image,
with refreshed canonical/short captures. No background darkening was introduced.

During verification, the harness needed the
observed volume label and checkbox role. The initial fixed Date clock also kept
Motion's outgoing route tree alive: normal-animation verification was rerun in
a fresh advancing-clock browser and passed with a single builder tree. These
are recorded harness corrections, not hidden application or visual fixes.

P3: raster footers do not inherit all system text-size preferences, and the L
food composition is not a scientific representation of volume. The native
small-screen/high-contrast/failure fallbacks and miniature comparison cups
remain. Full WCAG/OS-text-only zoom certification and real-device performance
measurement are not claimed. Authenticated history/profile panels are covered
by shared-component/source checks, not a real OAuth session; no payment, staff,
production or database round trip was performed.

Implementation checklist complete: seven versioned assets, offer/launch guards,
native fallback, opt-in quiet surfaces, guest CTAs, RTL/modal/focus checks,
responsive/motion/failure and ingredient-to-summary checks, combined comparisons,
regression tests and build. Preview publication remains a separate pending action.

---

# Prior phase — botanical salad card and luminous backdrop, 2026-10-05

## Current acceptance

final result: passed

The owner selected the single botanical card mockup, explicitly preserving v1.0
screen structure. This phase implements the home salad card and, at the owner's
subsequent request, restores the exact pre-refresh background/particle settings.
The owner authorized publication to codex/payment-foundation Preview only.
No production change, order, payment, provider configuration or DB write.

## Visual truth, state and normalization

- Approved source: C:/Users/COMP13/.codex/generated_images/01a06340-dcbe-7fd0-b3cb-302686bed44f/exec-acc77686-7285-410e-b02e-07d63ff49e62.png.
- Source pixels: 851×1847; normalized to 393×852 with proportional cover scaling
  and only the subpixel aspect-ratio rounding crop, not a reframed design.
- Implementation: .playwright-cli/card-botanical-2026-10-05/home-393.png,
  393×852, CSS viewport 393×852, deviceScaleFactor 1.
- State: guest, salad selected, closed-shop fixture, reduced motion. APIs mocked,
  external hosts and non-GET requests blocked. No real checkout submitted.
- Full-view comparison, source left / implementation right:
  .playwright-cli/card-botanical-2026-10-05/compare-full.png.
- Focused comparison: .playwright-cli/card-botanical-2026-10-05/compare-card.png.
  Both sides use identical 210×286 crops at (92,258) from the normalized full
  screenshots. Element capture rounds the half-pixel bounds to 211×287, so it
  was not silently compared against a 210×286 source crop.
- Structural before/after comparison:
  .playwright-cli/card-botanical-2026-10-05/before-after.png.
- The brighter background is an intentional owner-requested difference from
  the approved dark-background mockup. Home scrim, tracking backdrop and all
  three reduced-density GoldField call sites match parent commit7bbacf4 again.
  The builder's backdrop was not changed by8305de9 and is left intact.

## Findings and the five fidelity surfaces

No actionable P0/P1/P2 mismatch found in the final equal-scale comparisons.

- Typography: baked ivory/gold title, engraved price and footer caption preserve
  the approved hierarchy. Display lettering is part of the generated asset;
  the surrounding Heebo/Secular One UI is untouched. No duplicate native title
  appears over the poster. The button's accessible name includes title, current
  minimum base price, the before-extras caveat and its size-selection action.
- Layout: measured card bounds (91.5,258.359375,210,286); original 210×286
  footprint, carousel, banner, primary CTA and bottom dock unchanged. Native
  badge uses its original upper-right slot without colliding with the title.
- Colors: emerald/gold art matches the approved palette; real status badge and
  surrounding UI tokens retained. The original luminous background and particle
  density are restored without reverting readability or layout improvements.
  Forced colors exposes native text and hides
  the poster rather than depending on raster text contrast.
- Image quality: 630×858 WebP, 174,040 bytes, no stretched/cropped display.
  The generated bowl and botanical border preserve the reference's subject,
  arrangement and art direction. Existing bowl assets remain intact. Fine food
  arrangement/lettering differences from generation are acceptable P3 variation,
  not a layout change. No code-drawn replacement for the approved artwork.
- Copy/content: artwork contains only title, starting price 54 and the existing
  size/free-build caption. Runtime availability is not baked in. Price derives
  from the minimum effective S/M/L prices; changed price or caption rejects the
  old artwork and reveals native content, never an obsolete illustrated offer.

## Interaction and responsive evidence

- Pointer/Enter open the original size modal; Escape restores card focus.
  Selecting and confirming M reaches /build?size=M.
- Physical RTL ArrowLeft moves the active roving tab stop; locked tortilla
  activation does not open ordering. Existing reduced-motion handling retained.
- 320×640: card 162×220, poster visible, no horizontal overflow.
- 430×932 and 768×1024: card 210×286, poster visible, no horizontal overflow.
- 320×540: card 103×140, readable native title/price fallback, no horizontal
  overflow. This intentional exception avoids shrinking baked lettering in
  exceptionally short/zoomed viewports.
- Forced colors: native title/price/caption visible; poster hidden.
- Deliberate poster 404: native content and live price remain visible, and the
  card still opens size selection. Expected fixture network errors excluded
  from the unexpected-console check; zero JavaScript errors and zero attempted
  writes. Normal flow: zero unexpected console errors, one existing Motion
  reduced-motion warning.
- Browser-instrumented mobile field:111 sprites per frame (92 sparks +19 bokeh)
  on home and size picker. Normal-motion frames advance; reduced-motion frames
  stay frozen. Existing visibility-pause safeguards remain regression-tested.
  Normal-motion capture: .playwright-cli/card-botanical-2026-10-05/home-normal-motion.png.
- 229 focused tests passed; TypeScript, full ESLint (0 errors,8 existing warnings)
  and production build passed (37 pages). Scoped React review found no new
  effect/listener/data-fetch dependency or interaction regression.

## Comparison history and remaining limits

First visual comparison passed; no visual P0/P1/P2 repair cycle was needed.
The test harness initially used an ambiguous M selector, corrected to the
observed size-card and confirmation controls. Focused captures were normalized
for half-pixel screenshot rounding. Neither was an app or visual defect.

The unchanged large CTA can require scrolling on compact phones; the active
card remains a tested direct action above the dock. This scoped change does not
claim to fix the entire pre-existing short-screen layout. No full WCAG audit,
text-only zoom certification, device performance measurement or real payment
round trip performed. Raster lettering does not automatically inherit every
OS/browser font-size preference; native accessibility/fallback support is not
a claim of universal image-of-text compliance.

Implementation checklist complete: selected asset installed, price/copy guard,
native fallback, interactions, responsive captures, equal-scale comparison,
original backdrop and particle density, regressions and build verified.
Publication is authorized through the existing non-production Git branch only;
the verified READY Preview URL is returned in the delivery message. No direct
folder upload, protection change, environment-variable change or main merge.

---

# Historical QA — customer UI refresh, 2026-10-04

## Current acceptance

Scoped customer UI refresh passed after the implementation/inspection/repair
loop below. This is a visual and local-flow acceptance, not a certification of
the entire product, real payments, admin or kitchen. Nothing was deployed.

Reference: the previously inspected live application and the selected option 2
Botanical Cartouche. Outcome: retain that brand and ordering model, improve
food imagery, density, readability and motion. This is an approved redesign,
not a request to reproduce the old screenshots pixel-for-pixel.

## Target, capture and comparison

Original audit: .playwright-cli/ui-review-2026-10-04/.
Current: .playwright-cli/ui-refresh-2026-10-04/.
Both use the same local route family, 393×852 viewport, device scale factor 1,
fixed Israel service time 2026-10-04 09:00 and settled local fonts/content.
Reduced-motion captures keep decorative effects stable. Source and implementation
are combined at equal scale, before left / after right.

- Home: compare-home.png; closed shop, salad selected.
- Sizes: compare-size.png; M selected, 1000ml / 59 shekels.
- Entry: compare-entry.png; empty M draft, recipe choices.
- Ingredients: compare-builder.png; empty M bowl and the first category.
- Summary: compare-summary.png; same nine-choice draft, 88 shekels, closed shop.
- Tracking: compare-tracking.png; fictional paid/preparing BB-PREVIEW.
- Combined: before-after-overview.png, pairs ordered as above.
- Detail, open checkout/pickup, confirmation lab, filled bowl and responsive
  screenshots are also in the current folder. Confirmation lab chrome is a
  development-only control, not customer UI.

![Before left / after right](.playwright-cli/ui-refresh-2026-10-04/before-after-overview.png)

## Five fidelity surfaces

- Typography: retained Heebo/Secular One, native live headings/prices/volumes,
  clearer secondary text and nutritional units. Critical facts are not baked
  into generated art. Text-enlargement evidence is scoped to counter/hint.
- Layout: retained 430px customer-app maximum width, RTL, navigation and
  ordering stages. Active bowl now 106/114px excluding margins on small/regular
  phones; all choices scroll horizontally instead of increasing panel height.
- Color: emerald/gold remains; quieter native card fills and background shading
  separate copy from baked glitter. Summary/tracking frame geometry preserved.
- Imagery: four real, custom transparent food assets, optimized as WebP;
  complete logo from selected header preserved. Existing raster frames kept.
  No decorative CSS/emoji stand-in substituted for missing generated bowl art.
- Copy/icons/states: one home product title, explicit S/M/L names, canonical
  ingredient icons in recipe cards, 44px labelled removal buttons. Product
  locks, closed-store disabling, pickup gating, nutrition caveat and payment
  verification semantics unchanged.

## Responsive and interaction evidence

- 29 choices at 320×640, 393×852, 430×932, 768×1024 and 1280×900:
  all preserved, no horizontal page overflow, no broken loaded images.
- Every removal target 44×44. Keyboard Tab/Enter reaches the end of the rail
  and removes the correct item. Focused targets scroll entirely into view.
- 320/393/430px home and size modal: S/M/L, focus containment, Escape and
  focus return passed; all three thumbnail images settled before capture.
- Reduced and normal motion exercised. Runtime canvas probe stops while
  hidden, resumes, then remains frozen after reduced-motion event settles.
- Counter/hint doubled to 24/22px: rows remain separate and panel can grow.
- Open mock checkout: 09:30 becomes selected and hosted-payment CTA enables.
  No checkout submission. Closed mock checkout remains disabled.
- Nine-choice draft preserved across summary/edit/navigation.
- Zero collected browser errors; expected Motion reduced-motion warning.

## Iterations and repaired findings

1. Generated coherent food-only bowls; retained original artwork for rollback.
2. Replaced old home/size posters and compacted entry/ingredient bowl.
3. Corrected chef-icon centering and made the removal hint readable on 320px.
4. P2: a partially clipped focused removal target did not always native-scroll;
   added instant nearest-edge focus scrolling and verified at five widths.
5. Allowed counter/hint line boxes to grow when text is enlarged.
6. P1: entry began invisible behind a 500ms mount timer. An equal-scale capture
   exposed a blank loading moment; removed timer-dependent opacity, retained
   deliberate step/arrival motion and verified opacity 1 throughout ancestors.
7. Resolved capture-state mismatches by recapturing empty entry/ingredients and
   retaining filled-bowl evidence separately. Re-inspected final comparisons.
8. No unresolved P0/P1/P2 finding within this changed customer-UI scope.

## Technical checks and boundaries

- Final regressions: 225 passed, 0 failed.
- Final production build: passed, 37 static pages, TypeScript passed.
- Touched-file error-level lint and final geometry/whitespace checks passed.
  Existing effect warnings are not represented as a warning-free lint run.
- No dependency upgrade, real order/payment, database write, provider setting,
  secret change, commit, push, merge or deployment.
- Full app accessibility certification, physical-device GPU benchmarks and
  real hosted-payment E2E remain outside this acceptance.
- Asset prompts, sizes, exact pre-turn rollback archive and implementation
  details: docs/UI_REFRESH_2026-10-04.md.

Current final result: passed

---

# Historical header-only QA — before the current refresh

## Result and scope

The selected option 2 header passed the scoped visual comparison and responsive
checks below. This accepts the shared builder-entry/summary header, not the
entire application's accessibility or payment flow. The user approved the
separate local browser run on this turn; the previous evidence blocker is
resolved. No commit, push or deployment occurred.

## Target and state

- Selected reference: /mnt/c/Users/COMP13/.codex/generated_images/01a06340-dcbe-7fd0-b3cb-302686bed44f/exec-a75703f1-9cee-437c-9308-0667ed5a855b.png.
- Source image: 853×1844 pixels; opened and inspected again during this QA run.
- Route: http://127.0.0.1:3002/build?size=M.
- Browser: isolated ephemeral Edge session baribali-ui-review, not the user's
  logged-in profile; all external requests and API writes intercepted/blocked.
- Capture: 393×852 CSS pixels, device scale factor 1, settled fonts/content,
  reduced-motion media preference enabled.
- Fixture: nine-choice draft, 88 shekels, mocked closed shop. Amount and closed
  state match the reference. Ingredients and nutrition differ intentionally
  because the displayed values are computed from the actual fixture draft.
- Density normalization: source resized to 393×850, implementation 393×852,
  both on one 852px-high comparison board. No mismatched-scale judgment.

## Accepted comparison evidence

All files are under .playwright-cli/ui-review-2026-10-04/ and were opened and
inspected in this run. Reference left; implementation right.

- Full-view board: header-comparison.png, 802×852.
- Focused header board: header-comparison-focus.png, 802×200.
- Browser summary: 06-summary-closed.png.
- Entry: 03-builder-entry.png.
- Narrow entry: qa-entry-320x640.png.

![Full comparison](.playwright-cli/ui-review-2026-10-04/header-comparison.png)

![Header comparison](.playwright-cli/ui-review-2026-10-04/header-comparison-focus.png)

## Fidelity surfaces

- Typography: actual Secular One display font verified; Heebo retained for
  utility text. Native Hebrew heading and price remain readable, RTL ordered
  and independent of the raster. The reference heading is optically larger;
  implementation retains the application's native live-text sizing.
- Layout: artwork and toolbar remain separate; rendered 393px header is 196px
  tall, close to the normalized reference's footprint. Both app screens keep
  their existing 430px maximum width. Short screens use an 82px artwork slot
  with horizontal breathing room, preserving the whole logo. No masthead was
  added to active ingredient selection. Existing panel/footer not redesigned.
- Colors: emerald/gold follow the reference. Native toolbar and buttons are
  deliberately quieter than the raster concept, not missing baked-in artwork.
- Imagery: dedicated 1280×427 WebP retains complete logo, leaves and arch. No
  missing image, stretching, clipping or visible compression defect found in
  scoped header captures. Controls are not baked into the image.
- Copy/icons/states: summary heading is ההזמנה שלכם; entry adapts to
  הסלט שלכם, בדרך שלכם. Back uses a consistent library arrow. Price is live
  and labelled. Closed-shop CTA stays disabled; no order was submitted.

## Responsive and interaction checks

| Check | Evidence / result |
| --- | --- |
| 320×640 | qa-summary-320x640.png; header 143px, whole logo contained, Back 52×44px, bottom actions and legal copy visible. |
| 430×932 | qa-summary-430x932.png; header ~208.3px, no horizontal overflow. |
| 768×1024 | qa-summary-768x1024.png; centered 430px app, no horizontal overflow. |
| 1280×900 | qa-summary-1280x900.png; same app max width, no expanding desktop masthead. |
| Doubled toolbar heading/button text, 393×852 | qa-header-text-200.png; injected preview-only font sizes, not a full browser/text-zoom certification. No collision/overflow. |
| Entry 320×640 | qa-entry-320x640.png; long heading, menu return, draft notice and continue control fit. |
| Keyboard | Tab reaches summary Back; focus-visible true with a solid 3px outline. |
| Back to edit | All nine bowl-removal labels preserved; three selected vegetables still checked; edit view restored. |
| Broken images | None reported in responsive summary checks. |
| Browser errors | Zero console/page errors collected; Motion reduced-motion warning expected. |

An automated title scroll-height flag was investigated: Secular One glyphs
extend beyond their line box with overflow visible. Doubled-text ink remains
inside the header (bottom ~189.4px vs header 196px); screenshots show no
clipping. This heuristic flag is not a confirmed defect.

## Iteration and findings

1. Implementation: full-logo cartouche plus native accessible toolbar.
2. Current run: combined full-view/focused comparison, small/large viewports,
   enlarged toolbar text, keyboard, Back and draft preservation inspected.
3. Header-related follow-up: home2 still preloaded the obsolete 489,639-byte
   header-brand.png. Replaced with the 122,396-byte current cartouche, retained
   the used footer preload and added a regression test. Browser requests after
   opening SizePicker confirmed the new path with no legacy-header request.
   No asset was deleted.
4. No unresolved P0/P1/P2 finding in the shared header's scoped comparison.
   Broader opportunities and evidence limits are in
   docs/ASSET_MOTION_REVIEW_2026-10-04.md; not silently implemented.

## Technical checks and boundaries

- Full regression after preload correction: 221 passed, 0 failed.
- Targeted UI/customer flow: 31 passed, 0 failed.
- Typecheck and touched-file lint passed; no lint errors/warnings.
- Git diff whitespace check passed; normal CRLF conversion notices only.
- Prior header implementation production build passed, 37 static pages. Not
  repeated after the image-path-only preload correction; current visual
  evidence is from dev, not a production deployment.
- No real order/card payment, database write, provider change, secret exposure,
  commit, push, merge or deployment.

final result: passed
