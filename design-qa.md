# Design QA — iteration history (latest pass appended at end)

final result: passed

# Follow-up QA — all four approved pre-preview polish items, 2026-10-07

Scope: the BariMeter navigation hint, honest per-group counts, compact persistent
actions, clearer pickup prerequisite and expandable payment details. No new art,
dependency, business-hours, pricing, provider, backend or order-flow change.
The Compact Ingredient Tray remains the selected visual direction.

Final evidence: `.playwright-cli/summary-polish-2026-10-07/`.
`capture.js` and `interactions.js` use only local GET fixtures; all order/payment
writes and external hosts are blocked. Zero page exceptions or attempted writes.
Opened mobile hero/tray/receipt, 320px tray, pickup prerequisite, expanded/collapsed
payment details, forced-colors, closed/error/stale-state captures.

Seven viewport sizes pass with no document overflow and56–73px footer actions.
At393×852 the selected-time footer is145px versus approximately169px before this
polish. Full legal consent remains readable and safe-area padding is retained.
The hero frame/bowl remain complete; the new 44px hint sits above the artwork.
Eight food ingredients and two sauces are labelled independently; singular and
preparation-only/mixed groups have direct helper tests.

Keyboard hint activation focuses the actual selections at y122; the pickup
shortcut focuses its region. Native payment disclosure opens/collapses using Enter.
Root-font200% has no document overflow; high-contrast selected-time text stays
readable. Closed, full, capacity-error and stale-time states block checkout.
The initial loading label was observed; the delayed-loading screenshot settled
after its fixture arrived, so it is not evidence of a stable loading screen.

Fixed an old inline-style override of the prerequisite card. Harness corrections:
allow the intentional one-pixel decorative CTA border overhang, and refresh stale
capacity through the real visibility-change listener rather than a focus event.

268 tests pass; final isolated optimized build/TypeScript pass,37 pages;
touched-file lint0 errors/warnings, full-repo lint0 errors/8 existing warnings.
React review preserves pure keyed native presentation, type-only optional refs,
all request/recovery gates and errors; no new fetch, effect or dependency.
Limits: Chrome viewport emulation/root-font stress, not physical-device or live
payment certification. See `docs/SUMMARY_TRAY_2026-10-07.md` for the full record.

final result: passed

Selected visual truth: owner's accepted option 2 with the requested translucent
main-card refinement, `.playwright-cli/ornamental-controls-2026-10-06/approved-option2-translucent.png`
(851 x 1847). Scope: existing builder entry and summary controls, chef heading,
and main build-card material. V1.0 navigation, price authority, order locks,
twelve recipe frames and original bright page art/particles remain intact.
No commit, push, deployment, order submission, payment or external write.

## Matched source and browser evidence

Evidence folder: `.playwright-cli/ornamental-controls-2026-10-06/`.
Actual settled page: /build?size=M, empty draft, Hebrew RTL, open-shop fixture,
Chrome, reduced motion, 393 x 852 CSS px, DPR 1, fonts loaded before capture.
Selected source normalized proportionally from 851 x 1847 to 393 x 853;
browser capture is 393 x 852. Neither side is stretched.

Combined images actually opened in the same visual input:
`source-render-full.png`, `source-render-header.png` and
`source-render-hero-chef.png`. Source/render full board is 802 px wide with a
16 px gap. Header and hero boards align corresponding regions with padding.
The source's larger top spacing/display type, greener background and wrapped
size label are not treated as code requirements. Existing production column
(430 px maximum), native Heebo/Secular One, compact top lane and requested
original luminous gold-field background are intentional adaptations, documented
instead of silently described as a pixel-perfect clone.

Actual 320/360/393/430 mobile-width entry, small-height summary, desktop 1440,
keyboard-focus, forced-colors and 240 px fallback captures were opened.
`header-393-dpr3.png` and `hero-393-dpr3.png` were captured at real browser
deviceScaleFactor 3 and actually inspected; not a rescaled DPR-1 sharpness claim.

## Findings and comparison history

1. First implementation captures retained as `entry-first-pass-393.png` and
   `summary-first-pass-393.png`. Selected-source comparison confirms the actual
   native controls now match the botanical/gold language; the old rectangular
   frieze and duplicate size action beneath the hero are no longer consumed.
2. First matrix exposed premature entrance measurements: header y=-14 while the
   pre-existing arrival animation/hydration had not settled. Capture harness now
   awaits header top >= -.5 px and asserts the full logo remains onscreen.
   This was a capture timing correction, not a new application animation.
3. Subsequent resize/emulated-media readings could precede Chromium's responsive
   style pass. Harness now awaits the expected rendered emblem width (or forced-
   colors min-height), not an arbitrary fixed delay. Final summary320 measures
   the actual 108 px emblem and 113.39 px header; forced-colors header is 66 px.
4. Final settled matrix and combined source/render comparison found no remaining
   actionable P0/P1/P2 issue within this scoped change. Rollback assets and previous
   QA history below remain intact. No app bug was hidden by deleting a fixture.

## Five required fidelity surfaces

- Fonts/typography: existing loaded Heebo and Secular One. Native menu/change-size
  labels fit without ellipsis; current volume remains in the accessible label.
  Chef title becomes a native h2, not baked copy. Existing entry h1 stays accessible
  but visually hidden to avoid another competing slogan. Summary heading and
  authoritative native 67-shekel seeded fixture price are legible.
- Spacing/layout: complete contained emblem and reserved central lane. Entry
  header heights: 113.39 px at 320/360 x640, 121.95 at 393x852, 131.55 at
  430x932, 134.14 at desktop1440x900. Native buttons are at least 44 x50 px.
  No logo/control overlap, horizontal document overflow or clipped control text
  in the final matrix. At 240 px controls reflow below the logo. At 320 px the
  existing hero container query stacks food/copy instead of crushing the text.
  Recipe grid stays scrollable; viewport-bottom cropping is normal scroll content,
  not a clipped decorative frame. Summary body is also intentionally scrollable.
- Colors/tokens: emerald material and warm gold ornament; original luminous
  background and particles untouched. Only the hero material is opacity 0.8;
  card, text, food, outer frame and primary CTA are opacity 1. Header is transparent.
  Forced colors remove these decorative layers while native controls remain.
- Image quality: three independently generated true-alpha ornaments; empty
  control centers, clear exterior margins, complete leaf tips, no checkerboard
  or reconstruction mask. Nine-slice gold contours plus code-owned button faces,
  contained wings and independent chef icon. New assets total 114,768 bytes.
  DPR-3 capture confirms sharp complete logo/frame edges and text.
- Copy/content: existing build/draft labels, offer/volume and price, all twelve
  recipe labels/quotes, summary legal links and pickup controls are retained.
  Size selection appears once in the header; menu and summary edit keep their
  original actions. No mock price or mock click target overrides product data.

## Functional verification and boundaries

`browser-results.json` records 16 final states: five entry viewports, S/L,
size-picker cancel with focus return and committed URL preserved, forced colors,
240 px fallback, menu return, four summary viewports and summary edit.
Zero page exceptions, console errors or attempted non-GET writes. API fixtures
and external hosts were intercepted before any live service; no charge or order.
Separate temporary DPR-3 context also recorded zero writes/page errors and closed.

253 regression tests, dedicated TypeScript check and isolated Next production
build passed. Full lint: zero errors, eight pre-existing hook-effect warnings.
Default installed formatter used; the removed ESLint compact formatter did not
trigger a new dependency installation. Git diff --check passed apart from
existing CRLF conversion notices.

React/Next review: no new dependencies, hooks/observers, parallel fetches,
animation loops, server/client boundary change or hydration-only layout.
Shared decorative component remains pure. No nested interactive controls.
Relocated size button retains history handler and original focus ref;
summary request lock and checkoutTotal are unchanged. Current assets are prefetched.

Scope limits: Chrome emulation is not physical iOS/Android validation. Real pending
payment, screen-reader walkthrough and provider error flows were not exercised
in this visual pass; their existing source invariants/tests were preserved.
Unrelated pre-existing lint warnings and non-header forced-colors polish are not
presented as resolved. Local preview only: http://127.0.0.1:3004/build?size=M.

Provenance/composition note: `docs/ORNAMENTAL_CONTROLS_2026-10-06.md`.

---

# Previous QA — compact layered brand v7, 2026-10-06

final result: passed

Selected visual truth: the owner's accepted muted green/gold header v15,
`.playwright-cli/compact-brand-2026-10-06/approved-header-v15.png` (2048 × 683).
Scope: compact responsive header on the existing builder entry and summary;
native title, menu/back actions and order total remain code-owned.
Existing page brightness, particles, hero/recipe art, product rules and payments
are outside this change and remain intact. No push/deployment or external writes.

## Matched visual evidence and intentional adaptation

All latest evidence lives in `.playwright-cli/compact-brand-2026-10-06/`.
Browser state: /build?size=M, empty draft, Hebrew RTL, open-shop fixture,
reduced motion, Chrome, 393 × 852 CSS px. The existing app is a 430 px maximum
column on desktop; this is not a new desktop-wide page.

Full-view combined board actually opened: `full-entry-before-after-393.png`,
802 × 852; prior round-header capture and new page are both 393 × 852 pixels,
DPR 1. This is a structural compactness/background comparison, not a claim
that historical body screenshots are pixel-identical. Hero/recipe component
code, artwork, data and the original page background were not edited here.

Selected source/render header board actually opened:
`source-render-header-393.png`, 802 × 131. Source mock normalized without
stretching from 2048 × 683 to 393 × 131; browser header is 393 × 110,
padding only for the combined board. The shorter band, native existing title
instead of the mock's 'בנו סלט', and inherited accessible menu button are
intentional adaptations requested for the existing app. This is not a
pixel-perfect clone of the mock's baked UI. Complete circular identity,
green/gold botanical wings and two gold rails are the fidelity targets.

Focused boards actually opened: `emblem-source-render-393.png` and
`summary-readability-before-after-393.png`. The DPR-1 emblem board uses a 2×
display enlargement to inspect edges, not a false claim of retina density.
Actual separate 393 × 852 / DPR-3 browser capture was also opened:
`header-393-dpr3.png`. It confirms sharp real-density artwork and native text.

## Findings, fixes and comparison history

1. First browser pass found [P2] summary readability: the heading occupied
   the busy decorative frieze, although geometric logo/control overlap was zero.
   Evidence: `summary-before-readability-fix-393-640.png`.
   Fix: native price in the upper-left lane, heading underneath; no baked copy.
   Post-fix full summary and combined before/after board inspected. The title
   now lies on the quiet surface below the strip. Pickup fixture state differs
   between those full captures; that lower-page difference is not attributed
   to the header fix.
2. Added 4 px breathing space above the emblem so the gold ring is not flush
   with the screen edge. Latest source/render and actual DPR-3 captures inspected.
3. QA-only pickup fixture now matches the real read-only slots response, and
   two animation frames are awaited after resize. The initial deliberate 503
   and stale post-resize measurements were harness issues, not app fixes.

Second complete browser pass and the combined visual comparisons found no
remaining actionable P0/P1/P2 issue in this scoped header change.

## Five required fidelity surfaces

- Fonts/typography: existing Heebo controls and Secular One display retained,
  loaded before capture. Title is intentionally smaller (13–16 px) to fit the
  compact side lane; no ellipsis/copy removal. Price remains native, bold and
  legible. Wordmark/tagline stay in the real generated brand asset.
- Spacing/layout: 393 × 852 entry header is 109.95 px instead of approximately
  219 px in the prior round implementation. 320/360 × 640 headers are 101.39 px;
  430 × 932 is 119.55 px. Both rails remain visible, emblem keeps its 488:422
  ratio, toolbar has a reserved central lane and 44 px minimum touch targets.
  No logo/control overlap, horizontal document overflow, clipped heading or
  hidden button at the tested sizes. At 240 CSS px the toolbar deliberately
  reflows beneath the emblem rather than compressing text into the artwork.
- Colors/tokens: rich emerald and warm gold lead; ingredient accents remain
  subdued within botanical engraving. Original bright gold-field background
  and particles remain. Forced colors replace decoration with system colors.
- Image quality: independent genuine-alpha WebP emblem/frieze, 488 × 422 and
  1600 × 143; combined 157,078 bytes. No painted checkerboard, manual extraction
  mask, emblem clipping, stretch, animation or code-native artwork substitute.
  DPR-3 screenshot verifies sharpness at common high-density phone rendering.
- Copy/content: existing entry and summary Hebrew copy, menu/edit actions,
  price 67 for the seeded signature fixture, recipe labels, pickup control and
  legal links retained. Mock navigation text never became application authority.

## Verification and boundaries

`browser-results.json` records 15 states: entry and summary at 320, 360, 393,
430 and desktop 1440 widths, keyboard focus, forced-colors entry, 240 px fallback,
summary Back and menu navigation. Separate DPR-3 run passed with no writes/errors.
Zero page exceptions, console errors or non-GET attempts in the final matrix.
API fixtures intercepted before reaching live services; no order/payment test.
Existing request-lock source invariant retained; pending payment lock was not
exercised as a live browser scenario.

All 252 regression tests, TypeScript check, scoped lint and corrected isolated
production build passed. Full-project lint: 0 errors / 8 existing warnings.
React/Next review: pure shared component, no new hooks/observers, dependencies,
network requests, hydration-only layout, price authority or nested controls.
Git diff --check passed; only existing CRLF-conversion notices were emitted.

## Follow-up polish and test gaps

No blocking P0/P1/P2 finding remains in the header. Native controls intentionally
do not exactly copy the mock's baked UI. Physical iOS/Android devices, real
safe-area hardware, live order/payment state, full-app text scaling and unrelated
screens are not certified by this scoped pass. Local preview stays available;
owner approval is still required before commit/push/Vercel publication.

Production assets, exact built-in ImageGen prompts and provenance:
`docs/COMPACT_LAYERED_HEADER_2026-10-06.md`.

Earlier complete reports below are retained as history, not current-v7 evidence.

---

# Design QA — integrated emerald masthead, 2026-10-06

final result: passed

Scope: owner-requested alternative to the transparent header; the existing v1.0
builder entry and shared order summary, not a whole-app redesign.
Local only; no commit, push, deployment or external data writes.

## Source truth and matched comparison evidence

Selected source art: public/builder-assets/builder-brand-masthead-v5.webp,
960 × 320 pixels, opaque, 48,448 bytes. Original master/provenance/exact prompt:
docs/EMERALD_MASTHEAD_2026-10-06.md.
Structural source: before-entry-393.png and before-header-393.png, captured from
the previous local v4 implementation, not from older HEAD or the protected live preview.

All paths below are under .playwright-cli/emerald-header-2026-10-06/.
Same full-view state: /build?size=M, empty draft, Hebrew RTL, open-shop fixture,
reduced motion, 393 × 852 CSS px, Chrome DPR 1. Source and implementation both
393 × 852 image pixels. Route entrance settled before capture.
Full-view combined board actually opened: entry-before-after-393.png, 798 × 852.
Focused board actually opened: header-before-after-393.png, 798 × 198;
source 393 × 198, implementation 393 × 193, canvas padding only, no stretching.
Selected artwork/render board actually opened: asset-render-comparison.png,
798 × 131; source resized to 393 × 131 against actual 393 × 131 masthead capture.
This checks the intentional background-only margin fade, not a logo crop.

Additional evidence opened: short-phone-before-after.png (732 × 640),
entry-320-568.png, entry-844-390.png, entry-1440-900.png,
summary-393-640.png, header-text-200-320.png, header-forced-colors.png,
header-missing.png. Hero captures remain 361 × 240 on both sides.
Generated background artwork plus native inherited title/controls are the target;
old transparent header placement/particles behind logo are intentionally replaced.

## Findings and comparison history

Owner-requested [P2] header visual integration: floating ornamental arch over the
busy gold field and disconnected side decoration did not feel like a cohesive masthead.
Fix: generate one opaque emerald brand artwork, full-width reserved 3:1 slot,
low-relief botanical accents, background-only bottom fade and quiet native toolbar.
Before/after and selected-source/render boards above show the complete logo,
no cut-off rail, readable native title and no change to food cards or page background.
First post-build visual comparison found no actionable P0/P1/P2 differences.
No visual-repair iteration was required. A QA-only heading selector was corrected
to the real existing premium-step heading before rerunning the complete browser suite;
that harness correction is not a design iteration or an application change.

## Five required fidelity surfaces

- Fonts/typography: existing Secular One display and Heebo controls retained and
  loaded; title weight/wrapping/hierarchy match the surrounding app. Raster wordmark
  preserves supplied letterforms; it is intentionally larger/clearer than v4.
  Synthetic 200% font doubling wraps rather than clipping at 320/393 px.
- Spacing/layout rhythm: original structural order and hero/card spacing preserved.
  393 px header is 193 px rather than 197.375 px; short 360 px header is 178 px.
  Fluid art is width-driven, with contain sizing and no portrait height cap.
  Eleven widths/heights, shared summary controls and document width checked.
- Colors/tokens: own deep emerald brand surface and warm gold logo match the selected
  artwork; native fade releases the existing bright gold field under the toolbar.
  Original page brightness and particle implementation are untouched. System
  colors take over in forced-colors mode; visible real controls retain focus.
- Image quality: 960 × 320 source supplies over 2× density at maximum 430 CSS px.
  WebP is sharp and opaque, with no checkerboard, extraction halo, hard-cut gold rail
  or cropped emblem. Generated engraving is real raster art, not a CSS approximation.
  Native gradients are surface transitions, not substitutes for pictured imagery.
- Copy/content: inherited Hebrew title/menu action, summary title/price, legal links,
  size prices and recipe labels retained. No extra slogan or baked UI text.
  Canonical S/M/L prices remain 54/59/72; signature summary remains 67.

## Interaction/accessibility/build evidence

browser-results.json records 24 states, eleven viewport checks, zero page exceptions,
zero external writes, no header/control overflow, 44 px minimum native targets,
keyboard focus/start, summary Back, forced colors, normal/reduced motion and image failure.
Two short summaries retain all three legal links and pickup shortcut.
Expected logs only: two existing Chrome haptic restrictions, intentional pickup 503,
deliberate image-abort failure. These are not claimed to be a clean live payment flow.
TypeScript, focused lint, all 249 regression tests and isolated production build passed.
Whole-project lint retained 0 errors / 8 existing warnings; focused changed files are clean.
React/Next review: pure existing component; no hooks, hydration-only conditionals,
new requests, nested interactive controls, dynamic price authority or dependencies.

## Follow-up polish and test gaps

No blocking P0/P1/P2 findings. Existing P3 recipe recommendation-badge behavior under
synthetic large text remains documented in the previous report, unchanged here.
Physical phones/iOS safe-area hardware not available; emulated CSS viewports and font
doubling are not device certification. Tall content in very short landscape viewports
uses the existing inner scroller, rather than squeezing cards to fit simultaneously.
No actual order/card charge, production config change or Vercel publication attempted.

## Implementation checklist

- [x] Selected versioned generated asset saved in project; earlier assets preserved.
- [x] Shared responsive header and homepage prefetch updated.
- [x] Canonical controls, business rules and previous recipe changes preserved.
- [x] Source and actual render compared together at matching density/state.
- [x] Browser, accessibility and build/regression verification complete.
- [x] Owner publication approval remains required.

---


# Design QA — open alpha header and completed recipe family, 2026-10-06

final result: passed

Scope: the owner's annotated header/recipe feedback; existing v1.0 structure.
Local implementation only. No commit, push, deployment, database or payment write.

## Source truth, state and normalized comparison

Owner reference: the two screenshots in /tmp/codex-remote-attachments/
01a06340-dcbe-7fd0-b3cb-302686bed44f/23690a65-62ad-4d7b-9cb1-18524fbcb3b0/.
Unannotated screenshot is 591 × 1280 pixels and includes browser chrome,
draft continuation and an expanded signature recipe. It grounds the complaint,
not a falsely claimed pixel-perfect match to an empty-draft desktop capture.

Matched structural source: fresh current-HEAD captures in
.playwright-cli/header-recipes-2026-10-06/before-*.png.
Matched implementation: final-build after-*.png in the same directory.
Same state: /build?size=M, Hebrew RTL, empty draft, open-shop fixture,
Chrome DPR 1, 393 × 852 CSS px. Expanded-grid pair has signature expanded
on both sides. The existing route entrance was allowed to settle before
checking viewport origins; every final matrix header top is 0.

Full comparison actually opened: entry-before-after-393.png, 798 × 852.
Focused comparisons actually opened, before LEFT / after RIGHT:
- header-before-after-393.png: source 393 × 186, implementation 393 × 198,
  padded only for comparison; deliberate larger, rail-free crest.
- recipes-before-after-393.png and recipes-expanded-before-after-393.png:
  source 361 × 431, implementation 361 × 497. Intentional completed frames,
  modest card padding and full-opacity alternatives, not a density mismatch.
- hero-before-after-393.png: both 361 × 240; hero code/art unchanged.
- panel-before-after-393.png: both 361 × 298, shared finished treatment.

Short-phone comparison actually opened: short-phone-before-after-360.png,
732 × 640. Source 360 × 640 from the preserved current-HEAD atmosphere QA
capture, same M/empty/reduced-motion/open fixture; after 360 × 640.
It visibly confirms that the old 82 px masthead leaves gaps whereas the new
328 × 123 CSS px silhouette uses the available width without cropping.

Additional evidence opened: primary-phone-widths.png, desktop 1440 × 900,
enlarged header, forced-colors recipes, Asian recipe detail, actual summary
393 × 640, and corrected per-card 200% typography galleries at 320/393 px.
Asset truth/provenance/prompt: docs/HEADER_RECIPE_COMPLETION_2026-10-06.md.

## Findings, fixes and comparison history

1. Owner-identified [P2] header integration/flexibility: fixed 82 px height on
   portrait phones shrank contained artwork; flat lower rails and toolbar
   backplate reinforced the rectangular-banner appearance.
   Fix: generated open organic alpha crest, fluid 8:3 width, transparent toolbar,
   landscape-only compaction. Matched short-phone and header evidence inspected.
2. Owner-identified [P2] incomplete recipe family: only one of twelve buttons
   and one detail panel had the finished gold frame; opening a panel reduced
   alternatives to 55% opacity.
   Fix: share the real nine-slice frame and finished panel/CTA across all twelve,
   recommendation badge signature-only, available alternatives remain opaque.
   Both idle and expanded matched comparisons inspected after the fix.
3. First rendered accessibility comparison [P2]: 200% synthetic fonts at 320 px
   broke names into near-vertical fragments. Bounds-only checks did not detect
   this visual problem. Evidence retained as text-200-cramped-before-320.png.
   Fix: flexible button wrapping, text-relative minimum copy width and a
   wrapping chevron. Recaptured all twelve individual cards at 320/393 px and
   opened text-200-all-cards-320.png / text-200-all-cards-393.png.
   Names/price words now wrap readably; all frames and controls remain intact.
4. No remaining actionable P0/P1/P2 finding in the final visual comparisons.

QA harness corrections are not implementation fixes: await the existing RAF
focus return; do not sample the route's initial pre-hydration translateY(-14px);
do not treat black offscreen areas from a clipped scroll-container element
screenshot as missing UI. Final enlarged evidence uses individual card captures,
assembled without stretching. It is a diagnostic gallery, not a full viewport.

## Required fidelity surfaces

- Fonts/typography: existing next/font Heebo UI and Secular One display retained;
  no added font/fallback. Native headings, prices and recipe names stay live.
  Main header 16–20 px with balanced wrapping; enlarged copy checked visually.
- Spacing/layout: 16 px gutters; entire alpha silhouette remains contained.
  Standard 393 px cards 176.5 × 76, eight-pixel grid gap, flexible larger text.
  Complete corners/rails remain visible. Larger header is intentional, while
  native entry CTA stays reachable and lower content remains scrollable.
- Colors/tokens: emerald/ivory/gold preserved; luminous page background and
  particles unchanged. Removing the toolbar plate reveals the original photo.
  Frame and selected outline distinguish states without dimming alternatives.
  Forced colors retains native readable text/buttons; no WCAG certification.
- Image quality: new 960 × 360 WebP has true outer/internal alpha, no opaque
  backplate, chopped baseline or visible runtime rectangular matte/halo.
  Existing recipe bowls reused with their canonical mapping; no distorted sprite
  crops, handcrafted art substitutes or background-removal masks.
- Copy/content: original coherent Hebrew retained; canonical volume/price,
  recommendation, unavailable and draft labels are native. No text/prices baked
  into recipe art; large hero and checkout logic not re-authored.

## Browser, interaction and accessibility evidence

Final browser-results-final.json contains 46 states and zero exceptions,
attempted writes or console warnings/errors. Eleven CSS viewports:
320×568, 360×640, 390×844, 393×640, 393×852, 412×915, 430×932,
591×760, 768×1024, 844×390, 1440×900.
All final header tops 0; twelve frames each; no document horizontal overflow,
toolbar collision, card child spill or decorative hit-test interception.

All twelve recipe panels open, display matching bowls and close with focus
returned. Keyboard recipe activation and entry tested. Signature loads eight
canonical base selections; Mediterranean seven; draft retention and S/M/L
prices ₪54/₪59/₪72 verified. Reduced-motion/normal particle canvas checked.
The actual five-step journey reaches summary; shared header, pickup shortcut
and three legal links present on 360/393 × 640 fixtures. No order submitted.

fallback-results.json: missing header/frame/recipe artwork and loading/closed/
unavailable shop fixtures retain native flow. No exceptions or attempted writes.
Intentional resource aborts and Chromium user-gesture vibration-policy messages
occurred in those artificial failure runs; not misreported as normal-render
errors. Final normal matrix and matched comparisons were clean.

## Checks, limits and follow-up

248 regression tests, TypeScript and isolated production build passed.
Whole-repo lint: zero errors/eight pre-existing warnings; final changed-file
lint zero errors/the same five builder warnings. React/Next review retained
native semantics, stable refs, inert decorations, no new effects or fetches.
git diff --check passed.

Synthetic 200% computed-font tests are not physical OS text-size or browser-zoom
certification. No physical handset, Safari, GPU/performance or end-to-end-payment
claim. [P3] At synthetic 200% the recommendation ribbon can overlap part of its
decorative bowl thumbnail; label, frame and hit area remain readable/intact.
Owner visual approval remains open. New Git/Vercel publishing needs approval.

---

# Design QA — separated material backdrop, 2026-10-06

final result: passed

Scope: fix the owner's complaint that background leaves looked like extra salad
ingredients. Only a new versioned background, its CSS reference/comment and its
matching test references change. No new dependency, foreground, layout, font,
recipe, page-background, particle or ordering change. Local preview only.

## Source truth and matched evidence

Two explicit visual sources: the freshly captured v6 card for preserved
structure, and the generated non-botanical background for new surface treatment.
This is an intentional background replacement, not an exact foliage clone.

- Structure source: `.playwright-cli/hero-atmosphere-2026-10-06/entry-before-393.png`
  (393 × 852) and `hero-before-393.png` (361 × 240).
- Background source: `.playwright-cli/hero-atmosphere-2026-10-06/masters/entry-atmosphere-background-v1.png`
  (1536 × 1024); exported WebP 720 × 480, opaque, 69,718 bytes.
- Implementation: `.playwright-cli/hero-atmosphere-2026-10-06/entry-final-393.png`
  (393 × 852) and `hero-final-393.png` (361 × 240).
- Same viewport/state: 393 × 852 CSS px, DPR 1 confirmed in Chrome, M, empty
  draft, Hebrew RTL, reduced motion, isolated open-shop fixture. Card CSS box
  361 × 239.5; element capture rounds to 361 × 240 pixels.
- Full comparison actually opened: `entry-before-after-393.png` (798 × 852).
- Focused comparison actually opened: `hero-before-after.png` (734 × 240);
  before LEFT, after RIGHT. Both card captures have equal dimensions.
- New source/export comparison actually opened: `background-source-export.png`
  (1212 × 400), both backgrounds normalized to 600 × 400 with contain, no stretch.
  This checks texture fidelity, not a full-UI state match or the native shade.
- Opened additional evidence: `primary-phone-widths.png`, `narrow-text-stress.png`,
  `entry-final-1440.png`, `forced-colors-393.png`, `hero-art-failure-393.png`.
- Route: http://127.0.0.1:3004/build?size=M.
- Provenance/prompt: `docs/BUILDER_HERO_ATMOSPHERE_2026-10-06.md`.

## Findings, fixes and comparison history

1. Earlier owner-identified [P2] imagery ambiguity: recognizable detailed garden
   leaves behind the title and bowl could read as salad ingredients. Fresh v6
   source captures confirm competing foreground-like foliage.
2. Fix: generate one independent, non-botanical jade material background. Keep
   the food, frame, native copy, price and gold CTA completely unchanged.
3. Post-fix matched comparisons show a clean product silhouette and a continuous
   emerald surface on both sides; no recognizable leaves/food remain in the new
   background. The independent bowl stays sharp and bright. This is the intended
   owner-directed art change, not accidental design drift.
4. No additional actionable P0/P1/P2 finding in the final rendered comparisons.

## Required fidelity surfaces

- Fonts/typography: existing native Secular One title and Heebo UI retained;
  fonts loaded. Standard title 20 px/400, description 11 px/400. Matched 393 px
  wrapping/hierarchy unchanged; 360 px wraps naturally without clipping.
- Spacing/layout: same two-column bowl/copy composition, intact full gold frame,
  separate gold CTA, same padding/radii/hit area and above-the-fold geometry.
  Card remains 361 × 239.5 at 393 px and capped 398 × 240 on wider screens.
  At 320 px it uses the existing stacked layout, 288 × 298.09, not image cropping.
- Colors/tokens: native emerald/ivory/gold preserved. Background is intentionally
  less botanical. Existing 42% background-only inset shade remains unchanged.
  No shaded food/text/frame, neon hotspot or flat CSS-art substitution.
- Image quality: source and WebP viewed together; restrained fine texture survives
  encoding. Bowl and frame alpha/scale remain unchanged. No visible new halo,
  stretch, cut corner, added food or text baked into the backdrop.
- Copy/content: native Hebrew title, description, draft copy, CTA, canonical
  volume/price data retained; no rasterized customer-facing text.

## Responsive, interaction and accessibility checks

Nine CSS viewports: 320×568, 360×640, 390×844, 393×852, 412×915, 430×932,
768×1024, 844×390 and 1440×900. No document overflow or card-child spill in recorded
bounds. Primary-phone board and desktop/narrow evidence inspected.

Keyboard focus/Enter starts the builder. Recipe panel close restores focus,
canonical recipe loads eight selections, and draft continuation works.
S/M/L native prices are ₪54/₪59/₪72.

200% computed-font-size stress retains frame/content/CTA (361 × 440.98 card);
this is not physical OS text scaling or browser-zoom coverage.
Forced colors removes background/shade and retains native readable controls.
Reduced motion respected; normal-motion fixture keeps one particle canvas.
Missing background and combined missing bowl/background still allow native start.
Shop loading/closed/unavailable entry fixtures inspected; not full checkout proof.

Background-only conservative contrast: 28 complete title/description bounds,
lowest 6.61:1; 393 px title 10.62:1 and body 8.16:1. Mapping uses actual padding-box
cover coordinates inside the 1 px border and the unchanged native 42% shade.
Not a complete WCAG, glyph-level or all-site contrast certification.

Browser exceptions: 0. Attempted writes: 0. Three expected console resource errors
during intentional asset aborts; fresh final normal render: no errors/warnings.
All external requests and non-GET/HEAD writes blocked in our isolated Chrome;
no orders/payments, user-profile actions or existing user tabs touched.

## Checks, limits and follow-up

247 regression tests, TypeScript and isolated production build passed.
ESLint: 0 errors, 8 pre-existing warnings. No main merge, commit, push or deploy.

No physical handset, Safari, high-DPR, GPU/performance or full-site audit claim.
Subjective owner approval remains the next step; no further visual work is assumed.
Implementation checklist complete: scoped asset → native reference → build/tests
→ matched browser evidence → fidelity review → preserved QA history.

## Earlier balanced-canopy record (preserved)

# Design QA — balanced canopy refinement, 2026-10-06

final result: passed

Scope: owner's request to enrich the left, soften the right and unify the
existing selected garden hero. Only the background asset, native background
shade, forced-color shadow reset and matching regression references change.
Food, full frame, gold action, native typography/copy, geometry, page background,
particles and ordering behavior remain untouched. Local preview, not publishing.

## Findings, fixes and iteration evidence

- Owner-identified tonal imbalance: v3 had nearly empty very dark foliage on the
  left and yellow-white glare behind the vivid bowl on the right. Fresh pre-change
  captures `entry-before-393.png` / `hero-before-393.png` show this exact state.
- V4/v5 attempts made left leaf detail visible and reduced right glare, but
  unshaded background field checks found insufficient small-copy contrast.
  They were prechecked only, not browser-rendered or selected as runtime art.
- V6 supplies a coherent matte green garden with recognizable leaves/veins on
  the left and no glaring yellow-white opening. A native inset shadow supports
  copy contrast without altering child artwork or adding a panel.
- [P2, repaired] First actual v6 + 38% shade run had a 4.42:1 conservative
  description-field minimum at 360px after correcting the sampler to the CSS
  padding-box origin. Evidence preserved under `shade38-history/`. Fix: 42%
  inset shade, rebuilt and recaptured at the same sizes/states.
- Post-fix field minimum is **4.80:1** over all 28 normal/size/draft/text-stress
  title/description regions. At 393: title 6.45:1, description 5.40:1. Final
  focused and full before/after boards were reopened after this last build.
  No actionable scoped P0/P1/P2 remains in the inspected states.

## Visual truth and matched comparisons

Approved base direction: original displayed option 1, Fresh Morning Canopy,
`C:/Users/COMP13/.codex/generated_images/01a06340-dcbe-7fd0-b3cb-302686bed44f/exec-da94f17d-ad10-4502-9ca0-215ae289c991.png`
(1536×1024). The owner's new correction explicitly changes its tonal balance;
sunlit glare is not a fidelity requirement anymore. Final generated background:
`exec-3ca21470-ed0f-4c92-bfd0-2a9e5d3454f2.png`, 1536×1024. Exact input roles,
three prompts, paths and iteration boundaries are saved in
`docs/BUILDER_CANOPY_BALANCE_2026-10-06.md`.

Implementation: `http://127.0.0.1:3004/build?size=M`, isolated production-mode
Next preview, authorized Chrome session `bari-canopy-fit-1006`, DPR 1, Hebrew RTL,
guest/open-shop fixture, empty draft and reduced motion. Main comparison at
393×852 CSS/physical pixels. Hero remains 361×239.5 CSS px, screenshot 361×240.
No browser/phone chrome or density mismatch is counted as design drift.

Combined evidence under `.playwright-cli/canopy-balance-2026-10-06/`:

- Full view `entry-before-after-393.png`, 798×852, fresh v3 baseline left and
  actual final v6 + 42% shade right at matching viewport/content/auth/state.
- Focused `hero-before-after.png`, 734×240, complete independent food/frame/CTA.
- `selected-source-render.png`, 734×240, original concept normalized to
  361×240 vs actual. Softer lighting is intentional; native fonts/offer remain
  authoritative rather than cloning generated proposal lettering.
- `background-source-export.png`, 1212×400, original/export normalized to
  600×400. The code shade is not baked into this mechanical asset comparison.
- `primary-phone-widths.png`, 2033×932, actual 360/390/393/412/430 widths.
- `narrow-text-stress.png`, 693×568, actual 320 entry and 200% draft-copy hero.
- Actual focus, forced-colors, background-failure, combined-art-failure and
  desktop captures were inspected; the post-fix primary/stress/full boards
  were explicitly reopened. Short viewports scroll rather than crop art.

## Five fidelity surfaces

Typography: native Heebo/Secular One, weights, sizes (20/11/18px), hierarchy,
RTL content, wrapping and price order are unchanged. No new font, bitmap
lettering or text-shadow effect. Enlarged copy reflows instead of clipping.

Spacing/layout: unchanged padding/grid/radii and content-driven height.
At 393, hero is 361×239.5; at 320, existing stacked 288×298.09375. At 200%
computed-font stress, 361×440.984375. Complete rails, food silhouette and action
fit; the native shade has no layout box or hit target.

Colors/tokens: continuous emerald/jade botanical depth replaces the harsh
dark/glare split. The left has visible matte shapes; right is calm enough for
the unchanged vivid salad to lead. Warm gold frame/plaque and original page
background/GoldField are retained. Native inset shade rgba(2,16,8,0.42) affects
only garden/base painting, not child food, text, frame or price.

Image quality: one individually generated opaque 720×480 WebP, 55400 bytes,
no text/food/frame/button ghosts. Existing alpha edges remain complete and
clean. Built-in ImageGen supplied the image; existing Sharp only encodes/resizes
and composes diagnostic boards. No custom CSS/SVG art substitutes the garden;
the native shadow is contrast support for the real raster, not a fake asset.

Copy/content: native S/M/L ₪54/₪59/₪72, titles/descriptions, draft selections,
start/continue action and canonical recipe behavior stay unchanged. No new
claims, features, route, duplicate pricing or persistence behavior.

## Verification and limits

Final browser run: nine viewports 320×568, 360×640, 390×844, 393×852,
412×915, 430×932, 768×1024, 844×390 and 1440×900. Zero horizontal document
overflow or visible hero-child spill; inert frame retains pointer-events:none.
Canonical size prices pass. Enter starts; signature expand/close restores focus,
recipe action loads eight canonical base selections, and entry restores draft.

Computed-font doubling is a stress test, not OS settings/native zoom.
Forced colors remove both background image and shadow. Background and combined
background/bowl failures still start the builder. Normal motion retains one
particle canvas. Delayed/closed/unavailable-shop fixtures cover unchanged entry
layout only, not provider availability or full checkout state semantics.

External and non-GET/HEAD requests blocked; zero attempted writes and page
exceptions. Whole-run console recorded three expected ERR_FAILED messages from
deliberately aborted artwork requests; no unrelated message was recorded.
Final clean-page console is rechecked separately. No submitted order/payment.

Field contrast sampling uses actual measured text rectangles, padding-box
background origin inside the existing 1px border, cover/left-center geometry
and the verified 42% shadow's sRGB compositing. It is a conservative background
field approximation, not glyph-level measurement or accessibility certification.

Checks: 247 regression tests and isolated production-mode build pass after the
last shade fix (build includes TypeScript). Standalone TypeScript and full lint
also passed this pass before the final numeric-only shade correction; lint
remains zero errors/eight pre-existing warnings. Whitespace check passes.

Untested: physical phone, high-DPR, Safari, GPU/performance metrics, full
accessibility certification and payment/provider connectivity. No TSX/JSX or
dependency change, commit, push, deploy, main/provider/secret/database change.
Unrelated working-tree edits and historical QA remain intact. Local port 3004
is kept running for owner review.

## Implementation checklist

- Owner correction applied using a versioned independent background.
- Background-only native shade supports clarity without dimming content.
- Narrow-screen P2 repaired, rebuilt, recaptured and re-compared.
- Scoped interactions/layout/failure/source checks passed.
- Review locally; publishing remains subject to owner's approval.

## Earlier selected-canopy record (preserved)

# Design QA — selected canopy background, 2026-10-06

final result: passed

Scope: displayed option 1 (Fresh Morning Canopy) implemented as one independent
opaque garden background on the existing layered builder-start hero. Native UI,
complete frame, bowl, CTA, page structure/background and particles are preserved.
This is local UI work only, not approval to deploy or roll out to all recipes.

## Findings and comparison history

- [P2, repaired] V1 bright leaves under narrow/draft/large copy reduced readability.
  Location: start-card background, behind native title/description.
  Evidence: first actual browser captures are preserved under
  `.playwright-cli/canopy-background-2026-10-06/v1-render-history/`;
  conservative field checks fell below 4.5:1 at 360px and in draft/text stress.
  Fix: image-generated lighting correction, then a coherent v3 background with
  natural shaded foliage on the left and sunlight on the right. No opaque text
  box, new scrim, layout change or overall dimming was added.
- V2 improved normal 393px readability, but prechecks against unchanged measured
  v1 geometry still found bright patches at narrow/draft/200% states. V2 was not
  rebuilt or captured; it is not counted as an actual rendered QA iteration.
- Final post-fix evidence: v3 was rebuilt, recaptured across all nine viewports
  and states, recomposed with the source, and reopened. Whole bounding-region
  contrast approximation is at least 8.30:1 across all 28 sampled text regions.
  Focused normal/draft/stress images visibly retain clear native copy.
- No actionable scoped P0/P1/P2 remains. Native production typography, bowl
  dimensions, price pill and CTA differ slightly from the generated concept:
  intentional preservation of existing product UI, not an unreported pixel clone.

## Source and implementation evidence

Source visual truth:
`C:/Users/COMP13/.codex/generated_images/01a06340-dcbe-7fd0-b3cb-302686bed44f/exec-da94f17d-ad10-4502-9ca0-215ae289c991.png`,
1536×1024. Exact displayed-option mapping and all production prompts/originals
are saved in `docs/BUILDER_CANOPY_BACKGROUND_2026-10-06.md`.

Implementation: `http://127.0.0.1:3004/build?size=M`, isolated production-mode
Next preview, authorized Chrome session `bari-canopy-fit-1006`. Baseline state:
393×852 CSS px, DPR 1, guest/open-shop fixture, empty draft, reduced motion.
Actual hero screenshot `hero-final-393.png` is 361×240 physical pixels for a
361×239.5 CSS-pixel box. It is not a physical-phone/high-DPR capture.

Opened combined source/render evidence under
`.playwright-cli/canopy-background-2026-10-06/`:

- Full view: `entry-before-after-393.png`, 798×852. Historical layered-pilot
  baseline left, final v3 right, matching viewport/offer/state. Historical
  baseline was not represented as a new pre-change capture this pass.
- Focused reference/render: `selected-source-render.png`, 734×240. Concept
  normalized via contain to 361×240 left, actual final hero right. No device
  chrome or display-density mismatch is being treated as visual drift.
- Focused old/new: `hero-before-after.png`, 734×240, complete frame/bowl/action.
- Generated-original/export: `background-source-export.png`, 1212×400,
  both normalized to 600×400. Final asset is 720×480 opaque WebP, 39902 bytes.
- `primary-phone-widths.png`, 2033×932, and `narrow-text-stress.png`, 693×568,
  verify real narrow/primary-phone layouts and enlarged draft-copy reflow.
- Actual forced-colors, focus, failed-background, combined-art-failure,
  delayed/closed/unavailable-shop entry, tablet, landscape and desktop captures
  were also opened and inspected.

## Five fidelity surfaces

Fonts/typography: native Heebo/Secular One and existing 20px display / 11px
description / 18px price remain; RTL ordering, draft copy and reflow remain native.
All glyphs are UI, not generated bitmap lettering. The native fonts are retained
deliberately rather than approximating the raster proposal's text rendering.

Spacing/layout: no geometry edit this pass. Hero is still 361×239.5 at 393;
320 stacks food above copy (288×298.09375). Insets, gold rails/corners, bowl scale,
price pill and button fit without clipping. Short landscape viewports scroll;
whole-page content is not promised above the fold.

Colors/tokens: natural deep emerald shade behind copy and warm sunlit jade to
the right reproduce the selected garden direction. Unchanged warm gold frame
and button connect it to the page; global background brightness/particles are
untouched. Final conservative background-only contrast minima: 8.30:1 across
normal, size, draft and stress. This is not glyph-level certification.

Image quality: complete independent alpha bowl/frame/plaque preserve clean edges
and no crop/halo regression. The new background has no UI ghosts, food, border,
logo or text and is intentionally opaque. Individual image generation, not CSS,
SVG, emoji or a sprite-sheet crop, supplies the selected garden material. Existing
Sharp only resizes/encodes and makes diagnostic comparison boards.

Copy/content: canonical S/M/L ₪54/₪59/₪72, five-step description, native start/
continue action, saved selections and signature recipe behavior are unchanged.
No new marketing/health claim, feature or duplicate pricing engine was added.

## Verification and boundaries

Nine viewport dimensions: 320×568, 360×640, 390×844, 393×852, 412×915,
430×932, 768×1024, 844×390, 1440×900. No document horizontal overflow or
out-of-card visible hero child; decoration remains pointer-events:none.

Enter starts the builder. Signature expand/close restores focus and recipe action
loads eight canonical checked ingredients. Return to entry restores draft.
Computed-font doubling (not browser/OS zoom) fits 361×440.984375. Forced colors
remove the decorative background; failed background and failed background+bowl
both preserve start behavior. Normal motion keeps one existing particle canvas.

Non-GET/HEAD requests and external requests were blocked: zero attempted writes,
zero page exceptions. Final-page console checked: zero errors/warnings. Deliberate
asset aborts/API-unavailable fixtures are diagnostic, not production incidents.
Delayed/closed/error shop fixtures verify unchanged entry layout/browsing only;
shop-state semantics and checkout/payments were not re-certified.

Final checks: 247 regression tests, TypeScript, isolated production-mode build
and whitespace check passed. Lint: zero errors, eight existing warnings.
No dependency or TSX change this pass.

Residual gaps: physical phone, high-DPR, Safari, GPU/performance measurements,
full accessibility audit and payment/provider connectivity are untested. Scope
does not certify unrelated recipes/pages. Local port 3004 is left running.
No commit, push, deployment, main/provider/secret/database change; unrelated
working-tree edits are preserved.

## Implementation checklist

- Selected displayed source resolved; exact prompts/originals retained.
- Individual background generated/exported and wired beneath native layers.
- Readability finding repaired and actual post-fix captures compared.
- Responsive/interaction/failure checks and source checks passed.
- Local preview ready for owner review; publishing requires owner approval.

## Earlier layered-entry record (preserved)

# Design QA — layered builder-entry pilot, 2026-10-06

final result: passed

Scope: the owner approved trying independent artwork/code layers on the existing
builder entry, where a customer starts from scratch or chooses a recipe. Only
the start card and signature recipe (closed and expanded) receive the pilot.
The v1.0 layout, other eleven recipe treatments, shared masthead, original
background/GoldField, prices, drafts and ordering behavior are retained. This
is a local implementation pass, not approval to publish or roll out everywhere.

## Sources, implementation and combined comparisons

Visual truth is the approved existing builder plus three individually generated
true-alpha assets: `public/builder-assets/entry-frame-layer-v1.webp`,
`entry-bowl-layer-v1.webp` and `recipe-frame-layer-v1.webp`. No sheet crops or
semantic image repairs were performed with scripts. The prior flattened hero,
button and artwork are preserved. Exact PNG paths, production sizes/bytes and
all six generation prompts (including three rejected wide-bowl attempts) are
saved in `docs/LAYERED_ENTRY_PILOT_2026-10-06.md`.

Implementation: `src/components/builder/ui/BuilderStartCard.tsx` and its CSS,
new `BuilderArtFrame.tsx` and its CSS, `BuilderVisuals.module.css`,
`ChefRecipeArt.tsx`, and the signature branches in `BariBaliBuilder.jsx`.
Nine-sliced transparent frame rails adapt to native content height; food,
gold action plaque and native title/price/action are independent layers. No
duplicate price engine, cloned text probe or ResizeObserver remains in the hero.

Source assets, alpha proof and actual renderings were opened and inspected.
Required combined images under `.playwright-cli/layered-entry-pilot-2026-10-06/`:

- `before-after-393.png`, 802×852: fresh pre-change baseline on the left,
  final production-mode pilot on the right, both 393×852 CSS px, DPR 1,
  `/build?size=M`, guest/open-shop fixture, empty draft and reduced motion.
- `source-layers-render.png`, 738×430: complete source frame normalized to
  361×181 and independent bowl at 160px on the left; actual 361×240 hero on
  the right. The changed height is deliberate, not a pixel-clone claim.
- `hero-before-after.png` and `recipe-before-after.png`: old/new isolated
  native controls, including complete rails and the signature badge.
- `iteration-first-final-393.png`: first pilot versus final bowl/plaque fix.
- `phone-widths.png`: unscaled actual 360/390/393/412/430 phone viewports.
- `narrow-text-stress.png`: 320px stacked entry and computed-font 200% hero.
- `forced-colors-393.png`: final native contrast fallback after the badge fix.
  `recipe-expanded-final-393.png`, `hero-focus-393.png` and
  `hero-image-failure-393.png` cover the expanded recipe, focus and fallback.

The final full-page comparison and repaired forced-color capture were reopened
after the last build. The complete frame is visible, the bowl does not clip,
and the recommended label remains legible in forced colors.

## Iteration findings and deliberate trade-offs

- First action-layer attempt exposed a gold fallback rectangle behind the
  transparent leaves. Confined that fallback to the plaque's center; the
  surrounding leaf silhouette now reveals the original backing cleanly.
- The first 140px bowl was small relative to the native copy. Raised its cap
  to 160px. At 393 the hero is now 361×239.5 rather than 361×180.5. This is a
  conscious taller-card trade-off for complete food art and content-driven
  layout, to be reviewed by the owner before broader rollout.
- Three wider-bowl image attempts retained outside green haze despite alpha
  requests. Rejected them; none is copied into public or used by the pilot.
- Forced-color QA initially rendered a blank-looking recommended badge.
  Changed it to Canvas/CanvasText with a native border and reverified the
  actual final screenshot. Decorative frames/plaque are hidden in that mode.
- At 320, the hero stacks food above native text instead of shrinking or
  cropping the art. Short screens scroll; an above-the-fold fit for every
  recipe is not promised. Normal primary phone layouts remain side by side.

Five fidelity surfaces: typography retains native RTL labels and existing
fonts, with readable wrapping; spacing preserves the existing page/grid but
allows the taller hero and sufficient frame insets; colors stay warm gold
and emerald while revealing the unchanged background; image quality/alpha
were inspected on white, green and black, with 190718 total source bytes;
copy/content uses canonical prices, recipes, selections and drafts, not
baked-in text or new independent data. Added unoptimized source-image payload
is approximately 92 KiB over the replaced flattened hero, not measured transfer.

## Verification and boundaries

Authorized isolated Chrome session `bari-layer-audit-1006`, localhost:3004,
DPR 1. The safe fixture kept the shop open and blocked external requests and
non-GET/HEAD requests. Final run recorded zero page exceptions and zero writes.
One expected console ERR_FAILED belongs to the deliberately aborted bowl image.

Entry dimensions checked: 320×568, 360×640, 390×844, 393×852, 412×915,
430×932, 768×1024, 844×390 and 1440×900. All checked hero content stayed
inside its card, with no document horizontal overflow. The frame is inert
and cannot intercept clicks. S/M/L show native prices 54/59/72. Signature
expand/close passed at 360/393/430, including restored focus. Enter starts
the native hero; recipe action loads eight canonical checked base ingredients;
returning to entry preserves the draft. A real size-picker selection of L
confirmed the 1500ml offer and ₪72 via the existing UI.

A rerun initially found the size-picker overlay still open because the same
URL retained its existing `history.state.bbOverlay`; confirmed L through
the actual native dialog and repeated the verification successfully. This
was test setup state, not a source regression or history-clearing workaround.

Computed-font 200% stress reflows the hero to 440.984px tall without overflow;
this is not native zoom or an OS font-setting claim. Visible focus, forced
colors and actual failed-image fallback were inspected. The fallback still
starts the builder. Normal-motion rendering keeps one existing particle
canvas; small bowl interactions respect reduced motion.

React review: native single-button semantics, inert decoration, canonical props,
direct imports and per-image failure state only; no new effect, observer,
timer, animation library or dependency. No asynchronous duplicate pricing or
recipe state was introduced.

Final source checks: 246/246 regression tests, standalone TypeScript,
production-mode isolated build (37 route entries) and whitespace check pass.
Full lint has zero errors and the same eight pre-existing warnings. No
actionable scoped P0/P1/P2 remains in the inspected pilot.

Limits: no physical-phone/GPU, high-DPR or Safari verification, full
accessibility certification, submitted order/payment or production connectivity
claim. This does not certify the untouched sibling recipes or every app flow.
Local port 3004 remains available. No commit, push, deployment, provider,
environment secret or database changes; existing unrelated edits are preserved.
`main` and the previously published Preview remain untouched.

## Earlier header refinement record (preserved)

# Design QA — full-frame hero and integrated transparent masthead, 2026-10-05

final result: passed

Scope: the owner's request to preserve whole assets/frames, integrate the top
banner's colors and expose the original background/particles. Existing v1.0
layout is retained. Primary phone widths are 360–430 CSS px, with 393 as the
comparison baseline. This is a design target, not a measured 80% traffic share.

## Source and actual rendered comparisons

Visual truth: the selected `start-hero-seal-v2.webp` remains unchanged; the
existing cartouche was refined by built-in ImageGen into genuinely transparent
`builder-brand-cartouche-v3.webp`. The original/generated/optimized assets were
opened and inspected. V2 is preserved. Exact generation prompt and paths:
`docs/HEADER_FRAME_REFINEMENT_2026-10-05.md`.

Required combined source/render inputs were created, opened and inspected:
- `.playwright-cli/header-fit-2026-10-05/hero-source-render-393.png`, 738×181:
  complete selected source at 361×181 left, actual hero crop right. Native copy,
  price and action are intentional overlays, not baked text to reproduce.
- `.playwright-cli/header-fit-2026-10-05/header-source-render-393.png`, 802×123:
  generated alpha source on a neutral dark backing left, actual masthead on the
  real original particle/photo backdrop right, same 369×123 art size.
- `before-after-393.png`, 802×852, and `before-after-320.png`, 656×568, in the
  same folder: baseline left / final rendering right, same viewport, route,
  M offer, empty draft, guest/open-shop fixture and reduced-motion state.
  These were refreshed from the final production build and re-inspected.
- `primary-phone-widths.png`, 1606×932: actual unscaled 360/375/393/430 viewports.
  `builder-phone-widths.png` compares 360 and 393 active-builder states.

## Findings repaired and verification

- P2, pre-change: `cover` plus a 180px card minimum cropped the whole hero frame
  at narrow widths. Repaired with contain-fit, intrinsic image dimensions and
  removal of clipping/fixed minimum. Full source frame is visible at all seven
  captured entry widths/heights, without stretching or separately shrinking food.
- P2, first iteration: simply changing to contain/min-content left the action
  below the plaque at 320/360. Repaired with scoped compact typography and
  measured readable reflow. Final action ends inside the native card at every
  captured viewport; whole-card hit targets remain much larger than 44px.
- P2, pre-change synthetic 200% text: native hero facts/action were clipped.
  Repaired by preserving the entire art/plaque and reflowing the same native
  facts below it when measured copy cannot fit. Final 393px L draft card is
  424.125px high; copy and action are within its bounds, document width 393px.
  `whole-hero-text-200.png` was opened and inspected. This is a deliberate
  computed-font doubling stress test, not an OS font setting or native zoom claim.
- Requested visual integration: opaque green banner/backplate removed. True
  alpha and warm gold/emerald ornament expose the existing background. All outer
  bitmap edges are transparent; 149194 of 307200 pixels are fully transparent.
  No global particle density/brightness change or duplicate canvas was added.

Five fidelity surfaces: typography keeps Heebo/Secular One, native RTL labels,
canonical prices and accessible names; spacing preserves the baseline card,
toolbar controls and compact builder bowl, with safety margins around full art;
colors blend the existing gold/emerald palette rather than replacing the brand;
image quality remains clean at the inspected CSS scales with genuine alpha and
bounded 108334-byte WebP; copy/content, drafts, recipes, quantities and nutrition
semantics are unchanged. Native control failure/forced-color cases remain usable.

Chrome permission was explicitly granted by the human for a separate session.
All browser work used only `bari-header-fit-1005`, localhost:3003, fixture APIs
and blocked non-GET/external requests. No orders or payments were submitted.
Entry captures: 320×568, 360×640, 375×667, 393×852, 430×932, 844×390 and
768×1024. No document horizontal overflow or page errors. Active builder was
rechecked at 360/393/430; its bowl remains 106/114/114px, and framed controls are
intact. Summary was inspected at 393 and 320 with a local three-ingredient draft;
its background now matches the builder. The 320px summary scrolls normally:
the whole nutrition panel is not promised to fit simultaneously into the short
viewport. Its 44px coupon field is reachable after scroll. Normal motion retains
one existing GoldField canvas. Hero image failure and forced-colors were captured
and inspected. DPR is 1; no physical-device, high-DPR or Safari pass is claimed.

React review: native single-button semantics and canonical props retained;
measurement state depends on actual DOM geometry, not duplicate pricing state;
primitive dependencies, observer cleanup, stable compact-width probe and batched
DOM reads/writes avoid reflow-mode feedback and repeated layout work. No new
package, network dependency or motion system.

Final code checks: 242/242 regression tests, standalone typecheck, production
build (37 route entries), changed-file lint and whitespace checks pass. Full lint
has 0 errors and the same eight pre-existing warnings. No actionable scoped
P0/P1/P2 remains. Pre-existing 320px recipe-label crowding is outside this focused
hero/masthead change; the primary 360–430px range retains its existing recipe grid.

Local preview remains available on port 3003. No commit, push, deployment,
production, provider, environment or database change. Existing unrelated edits
are preserved; `main` and the published Preview remain untouched.

## Earlier gold-button phase record (preserved)

# Design QA — less-rounded gold button refinement, 2026-10-05

final result: blocked

The owner subsequently requested Preview publication ("תעלה אני יבדוק") and
will review the live mobile UI personally. Publishing this owner-review Preview
does not mark visual QA passed. Only the existing feature branch is in scope;
`main`, production, environment variables and deployment protection stay unchanged.

Owner correction: change only the empty gold button's capsule shape to a
rounded rectangle matching the existing framed cards. Built-in ImageGen edited
the hero's bottom plaque and its standalone sibling, preserving the large bowl
composition and native control dimensions. V1 assets remain recoverable.

Visual truth: `public/builder-assets/start-hero-seal-v2.webp` (1080×538) and
`public/builder-assets/button-leaf-seal-v2.webp` (512×128, genuine alpha).
Opened and inspected source-only before/after comparison:
`.playwright-cli/builder-seals-2026-10-05/gold-shape-v1-v2-source-comparison.png`,
1096×439; old left / revised right; hero normalized to 540×269 each and button
to 512×128 each. This is not a combined source/render comparison.

Five fidelity surfaces: typography/copy are unchanged native UI; spacing retains
the existing card/target dimensions and native fallback corners are now 8px;
gold/emerald material remains consistent; source image compression and alpha
were inspected; prices, drafts, recipe data, sound/reset and step behavior are
untouched. Actual rendering, text alignment and fallback/zoom remain unverified.

241/241 tests, typecheck, targeted lint and production build pass. No actionable
rendering defect is asserted from source files alone. Blocker unchanged: in-app
browser tools are unavailable and isolated-Chrome permission has not been
granted. No browser capture, commit, push, deployment or external mutation.
Detailed saved paths, provenance and exact prompt set:
`docs/GOLD_BUTTON_RECTANGLE_2026-10-05.md`.

## Previous builder implementation record (preserved)

# Design QA — builder option 3 + large bowl from option 1, 2026-10-05

final result: blocked

Owner chose visual 3 and requested the larger salad from 1. A merged generated
source was opened and inspected, then used for a scoped local implementation.
Source: `C:/Users/COMP13/.codex/generated_images/01a06340-dcbe-7fd0-b3cb-302686bed44f/exec-eb58b8ed-54c6-48f5-b4e0-a3877baf7e00.png`.
The optimized artwork was also opened and inspected as one source-only sheet:
`.playwright-cli/builder-seals-2026-10-05/optimized-assets-source-board.png`.
The latter proves export/crop quality, not browser implementation fidelity.

Five required fidelity surfaces — status before browser verification:
- Fonts/typography: existing Heebo/Secular One, native Hebrew labels, current
  prices/size and full ARIA labels retained; rendered wrapping remains unverified.
- Spacing/layout: existing v1.0 structure, two-column recipe grid and 66px minimum
  recipe buttons retained; 52px bowls offset by reduced padding. Compact bowl
  geometry constants unchanged. Hero is a 2:1 composition with 180px minimum,
  not a text-clipping fixed height. Actual dimensions/zoom require capture.
- Colors/tokens: scoped fresh emerald, ivory and warm gold artwork; no global
  backdrop darkening or particle change. Actual contrast is not measured yet.
- Image quality: genuine alpha bowls/seals, corrected recipe atlas and dedicated
  large-food hero. No baked price, quantity or nutrition authority. The compressed
  sources are visually clean; nine-slice fit/CTA alignment still need render QA.
- Copy/content: prices and recipe selections remain canonical native values;
  draft/failure fallbacks, native RTL arrows and semantic sound/reset controls
  preserved. Generated mock arrow mistakes are intentionally not reproduced.

Checks: 240/240 tests passed; typecheck and production build passed; lint has
0 errors and eight pre-existing warnings. Native HEAD for the new local hero
asset at port 3002 returned 200. No browser automation was performed.

Blocker: in-app browser tools are unavailable and the requested approval for an
isolated Chrome visual check remains unanswered. The required equal-scale
combined source/render comparison cannot yet be made. Do not mark this phase
done or publish it from static checks alone. Pending: 320/393/430 layouts,
short screens, 200% text, forced colors, image failures, recipe expansion/loading,
draft/sizing, sound/reset/steps, full removal rail and correct footer totals.

No discovered rendering defect is asserted without capture; no visual pass is
claimed. No commit, push, deployment, provider, environment or database mutation.
Implementation/provenance: `docs/BUILDER_RECIPE_SEALS_2026-10-05.md`.

## Earlier local L revision record (preserved)

# Design QA — brighter L artwork revision, 2026-10-05

final result: blocked

The user's scoped feedback: L was darker/less inviting than M and its title
was straight rather than curved. Built-in ImageGen edited only the L artwork,
using the unchanged M as the lighting/typography reference. The new sibling is
`public/homepage-assets/size-l-botanical-72-v2.webp` (630×816, 151912 bytes).
The original L v1 is retained; only the L manifest reference changed.

Source comparison opened and inspected:
`.playwright-cli/l-bright-revision-2026-10-05/old-L-reference-M-new-L.png`.
Left: old L; center: unchanged M reference; right: revised L, all normalized
to 210×272, combined canvas 654×272. This is a source-only comparison, not
a browser implementation capture. Brighter fresh emerald, illuminated food
and dimensional arched ivory lettering address the reported art mismatch.

Five fidelity surfaces (source review only):
- Typography: arched dimensional גדול, correct L and legible price; native
  typography/ARIA untouched. No claim of rendered font fidelity yet.
- Layout: same 630×816 raster and 210×272 component; no CSS or geometry edit.
- Colors: visibly brighter greenery/food/gold than L v1; no global palette edit.
- Image quality: genuine generated artwork, mechanically compressed WebP,
  no added CSS filter, handcrafted ornament or altered M/S image.
- Copy: גדול / L / 72 ₪ / 1500 מ״ל / הכי גדול שלנו; native pricing guards unchanged.

Code checks: focused regression suite, typecheck and production build passed;
lint has 0 errors and the same 8 existing warnings. No browser or deployed
revision claim: in-app browser tools are unavailable; permission for an isolated
Chrome visual check was requested and remains pending. The required combined
source/render comparison is therefore absent. Blocker: browser verification
permission, not a discovered rendering defect. No push, deployment, production,
provider, environment, payment or database mutation occurred for this revision.

## Previous phase record (preserved)

# Design QA — botanical customer UI extension, 2026-10-05

## Current phase acceptance

final result: passed

The short-screen P2 below was repaired and passed post-fix capture/comparison.
No actionable scoped P0/P1/P2 remains. This extends the owner's approved botanical
salad card art direction
through v1.0, without a new layout or dependency. The owner subsequently
authorized Preview publication. Commit 6dc66a7910255217120115fd3476eb298ab1fd06
is READY at https://baribali-6g68g2g6a-jts-projects-c85ca52d.vercel.app/home2
(deployment dpl_9piekvwgSzTtsS5ez3eG6qKZwnLn). All five customer route GETs and
eight artwork GETs returned 200; remote artwork hashes match the reviewed files.
Production still resolves to d44fe06089fa3c113fbbc4a97c44191ec328dfc3.
Earlier Preview URLs below refer only to the prior phase.

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
regression tests and build. Branch-only Preview publication is verified; no
production promotion, protection/environment change, order or payment occurred.

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

---

# 2026-10-07 — selected BariMeter option 1 / Emerald Atelier

## Target, state and normalization

- Source visual truth:
  `C:/Users/COMP13/.codex/generated_images/01a06340-dcbe-7fd0-b3cb-302686bed44f/exec-ddc8646a-35df-45bf-9b7a-06909199494a.png`.
- Evidence copy: `.playwright-cli/barimeter-atelier-2026-10-07/selected-option-1.png`.
- Source pixels: 851×1847. Downsampled proportionally to 393px wide (~853px
  tall), without stretching; source has no browser chrome or phone bezel.
- Final implementation: `http://127.0.0.1:3004/build?size=M`, local optimized
  production build, not a Vercel deployment.
- Implementation pixels/CSS viewport: 393×852, deviceScaleFactor 1 verified.
  Final screenshot: `iteration-4-393.png` in the evidence directory above.
- Same guest draft/state: 1000ml salad, 10 choices, ₪67, 330–550 kcal, protein
  12–21g / carbs 43–71g / fat 14–23g / fibre 9–16g. Checking-pickup footer
  fixture, same header/background, Hebrew RTL, reduced motion.
- Fixture availability is not live evidence of opening hours or payment status.
  No account, order, payment or external-provider mutation was performed.

## Combined visual evidence and comparison history

Source and rendered screenshot were placed together in each comparison input,
then inspected visually; not judged from separate images or code alone.

1. `comparison-1-full.png` and `comparison-1-focus.png`: **blocked**.
   [P2] Hero was over-tall: the bowl/plinth and bottom frame extended behind the
   persistent footer at 393×852. Excess whitespace below the wordmark also
   changed the selected hierarchy. [P2] Food icons were undersized relative
   to the bowl opening, leaving the main imagery visually thin.
   Fix: smaller crest-to-readout padding and calorie scale, remove an extra
   outer margin; split actual base choices into two larger staggered rows,
   with extras in their own front row. Every real ingredient remains once.
2. `comparison-2-full.png` / `comparison-2-focus.png`: **blocked**.
   Food readability improved, but frame measured 546.25px tall and its lower
   ornament still crossed the footer edge. Fix: tighten native readout gaps
   and bottom padding, keeping bowl width, frame rails and text unclipped.
3. `comparison-3-full.png` / `comparison-3-focus.png`: no remaining actionable
   P0/P1/P2 in the scoped mobile visual. Hero is 360×519.125px; full outer frame
   is visible, native data and bowl fit. Responsive/interaction checks below
   followed; no further visual fixes were made.
4. Final optimized build recaptured and jointly compared:
   `comparison-4-full.png` and `comparison-4-focus.png`. Geometry unchanged:
   frame x16.5/y133.953, width360, height519.125; fonts loaded, 10 native food
   controls, no browser console errors or warnings during this fresh run.

![Final combined comparison](.playwright-cli/barimeter-atelier-2026-10-07/comparison-4-full.png)

![Final focused comparison](.playwright-cli/barimeter-atelier-2026-10-07/comparison-4-focus.png)

## Required fidelity surfaces

- **Fonts/typography:** gold serif BariMeter wordmark retained in dedicated
  real artwork, with a native accessible h2. Native Heebo family retained for
  dynamic data; loaded fonts verified. Calorie hierarchy is large/ivory,
  numeric ranges use tabular figures and explicit LTR inside Hebrew RTL. Macro
  labels/units remain native and readable. Heavier native Hebrew labels and
  slightly different numeric spacing are expected app typography, not missing
  artwork. No clipped label/value found in tested widths or enlarged text.
- **Spacing/layout:** pointed arch, integrated macro faceplate and oval bowl
  plinth follow option 1. Data flows vertically instead of fixed absolute
  raster slots; quiet nine-slice rails grow with content. 360px hero limit
  remains centered inside the existing 430px app. The selected default-state
  full frame fits above the footer; narrow/short or enlarged-text views scroll
  normally rather than compressing data or hiding checkout.
- **Colors/tokens:** dark luminous emerald, sculpted warm gold, ivory calories,
  uniform gold macro ranges. Removed the unrelated turquoise/purple per-macro
  chips. Existing gold background/particles and footer are unchanged. Native
  simulation badge is quiet and distinct; no health-score state colors.
- **Image quality/fidelity:** three individually generated reference-guided
  WebPs, actual alpha outside artwork, complete outlines, no visible fringe,
  stretching of the wordmark, or missing raster. No SVG/CSS/emoji substitute
  for the target frame, plaque or bowl. Borders/separators/focus remain native
  UI. **Intentional constraint:** the reference's fixed, photographic salad
  heap is replaced by the actual selected ingredient art and existing buttons,
  not a misleading permanent meal. Bigger staggered rows improve recognisability;
  richer food styling is a possible P3 art follow-up, not falsely claimed
  photographic/pixel-identical fidelity.
- **Copy/content:** BariMeter, simulation, broad calorie/macro ranges and grams
  retained; concise estimate note in the frame plus the existing full disclaimer
  and explanatory disclosure below. Empty state says no nutrition estimate,
  never a fabricated zero-kcal meal. Partial coverage warning remains native.
  Preparation choices remain in the order but outside the pictured food.

## Responsive and functional evidence

All paths below are under `.playwright-cli/barimeter-atelier-2026-10-07/`.

| View/check | Result |
| --- | --- |
| 320×640, qa-320x640.png | Frame 288×503.734px; 2×2 macro grid. No page overflow, clipped value/label or broken image. |
| 360×800, qa-360x800.png | Frame 328×482.172px; four macro columns; same checks clear. |
| 393×852, qa-393x852.png | Frame 360×519.125px; four columns, complete default-state frame. |
| 430×932, qa-430x932.png | Same max-width hero and full frame; no expanding/hiding controls. |
| 768×1024 / 1280×900 | qa-768x1024.png / qa-1280x900.png; existing centered 430px app, 360px hero; no horizontal overflow. |
| Short 393×640 | qa-393x640.png; nested content remains scrollable; persistent footer unchanged. |
| Enlarged root font | qa-text-200.png / qa-text-200-checkout.png; injected 32px root-font check, 2×2 grid, frame grows to ~851px, no clipped values/page overflow, pickup scrolled into view. This is not a full browser-zoom certification. |
| Reduced motion | Every native ingredient control reports animation-name none. |
| Forced colors | qa-forced-colors.png; decorative layers hidden, native h2/data/outlines retained. |
| Keyboard | qa-keyboard-highlight.png; real Tab reaches baby-leaf control, focus-visible true with solid outline; Enter activates existing group emphasis (vegetables opacity1, sauces0.45). |
| Explanation | Disclosure opens/closes natively, including in final production-built screen. |
| Edit/return | Ten summary controls → ten retained builder selections → ten summary controls. Initial harness incorrectly expected edit to reset to step1; corrected to existing retained step5. No app bug/change inferred. |
| Empty bowl | qa-empty.png; disposable guest context with empty reorder fixture, zero food controls, visible no-estimate text, no broken image/overflow. |
| Large bowl | qa-large.png; real current IDs for 14 base + protein + two sauces + preparation. 17 actual food controls, 18 order choices, preparation correctly omitted from bowl; no missing image/overflow. |

Empty/large fixtures blocked all non-GET/HEAD requests and external hosts;
local API unavailability was explicitly mocked. This exercises failure-state
presentation, not a settlement, availability or Supabase end-to-end test.
Unknown/partial nutrition contracts are source/model regression checks; no
unknown catalog item was forced through the real builder's validation.

## Technical checks, checklist and limits

- Full regression: **257 passed, zero failed**. Four focused Atelier tests
  cover assets/payload, native ranges/fallback, responsive/accessibility CSS,
  actual ingredient controls and preparation exclusion.
- Typecheck passed. Touched JSX/TSX lint clean. Full repo lint: zero errors,
  eight pre-existing effect warnings, none introduced by this visual pass.
- Optimized isolated build passed, 37 pages; final rendered capture from that
  build verified. Whitespace diff check passed (existing CRLF notices only).
- Asset dimensions/alpha/payload verified; no new dependency installed and no
  original asset deleted. Nutrition, discounts, authoritative quote, provider
  handoff, shop-hours enforcement and checkout locks unchanged.
- Scope checklist complete: selected frame/plaque/bowl, native data, honest
  fallback/disclaimer, responsive fit, keyboard/reduced-motion/forced-colors,
  build/regression and combined final visual comparison.
- Remaining P3: optionally generate richer individual ingredient presentation
  art while preserving actual-choice honesty. User visual acceptance and any
  Vercel preview publication are still separate steps.
- No real payment, database write, secret exposure, commit, push, merge or
deployment. No broad-app accessibility or device certification claimed.

final result: passed

---

# Latest QA — summary option 2, 2026-10-07

Selected truth: Compact Ingredient Tray, `exec-7e21b6d2-3f8b-410d-9779-71c433977f5b.png`.
Scope: actual choices, sauces, note, pickup presentation, receipt and footer
below the approved BariMeter. Existing header/background/BariMeter and all
checkout business rules are retained. Local implementation only, no deployment.

## Matched source/render evidence

Evidence directory: `.playwright-cli/summary-tray-2026-10-07/`.
Source852×1846 normalized proportionally to393px width, actual393×852/DPR1,
same ten-choice guest draft, native Hebrew RTL and loaded fonts. Source and real
render were opened together in `comparison-6-full.png`, `comparison-6-tray.png`
and `comparison-6-footer.png`. Focused crops retain natural width and use padding,
not stretching. `final-lower-393.png` and `final-price-393.png` also opened.
Finite existing drawer/entrance animations are disabled for the final diagnostic
captures; this is not a change to the application's motion settings.

Intentional adaptation: native44px targets, 14px ingredient labels, full detailed
extras/consent copy, original catalog artwork and truthful checkout labels.
Vegetable tray245px and sauce strip131px require more scroll than the mock's
~230px/~95px surfaces. The existing nested body scrolls; content crossing the
viewport edge is not a clipped frame. No mock price/time overrides real logic.

## Findings, fixes and recapture loop

1. First pass [P2]: shelves too tall and food too small compared with the selected
   source. Tightened internal padding, enlarged actual illustrations in the same
   space and added a quiet row divider. First/final captures and comparison boards
   retained. Footer uses the selected left pickup/right action arrangement in RTL.
2. [P2]: an experimental brightness filter over-saturated the generated gold.
   Removed it; final warm satin face uses the real generated material unchanged.
3. [P2]: forced-colors selected-time spans became white-on-white rectangles.
   Explicit Highlight/HighlightText span pairing fixes readability without
   hard-coding a high-contrast palette. `qa-forced-colors-fixed.png` opened;
   actual14:15 text white on the system purple highlight, complete native controls.
4. [P2]: the existing sheet had no explicit Drawer.Trigger, so closing notes
   returned focus to BODY. Optional `returnFocusRef` restores the summary trigger
   only for this caller. Final browser check observes `הערה לבשלן` focused.
   `qa-notes-final.png` opened: settled visible drawer, opacity1, z-index300,
   transformnone, full textarea and completion action. Maxlength200 retained.
5. Harness corrections, not app defects: choose the footer save button when two
   existing save controls share a name; await the picker's existing rAF focus;
   remove the test-only root-font style through its handle rather than a hidden
   text locator. Early transition captures do not substitute for settled evidence.

No remaining actionable P0/P1/P2 issue found within this pass. Optional P3:
richer individual food artwork, without replacing actual choices by a fixed salad.

## Five fidelity surfaces

- Fonts: installed Heebo/Secular One, native headings and 14px wrapping food
  labels. Note/promo inputs16px. Count and currency remain native, LTR values
  inside RTL text. No ellipsis or hidden ingredient names in the matrix.
- Spacing: one shelf rather than framed inventory tiles; four columns at360–430,
  three at320. Sauces pair/stack responsively. Footer controls stay at least44px
  tall; actual60–77px with truthful copy. Desktop retains the existing430px column.
- Colors: quiet emerald, ivory labels and warm gold. Approved bright background
  and particles untouched. Selected pickup visibly gold; closed/error wording
  retained. High contrast removes ornaments and preserves readable native controls.
- Imagery: two separately generated genuine-alpha WebPs, complete gold corners,
  transparent frame center/exterior, opaque gold action center. 62,494bytes total.
  Border-image grows without raster text/price stretching. Existing food assets
  contain only the actual chosen ingredients. No screenshots used as production art.
- Copy: product-neutral group title, actual names, preparation labels and extras;
  native note state, all pickup/peak/full/checking/error messages and recovery gates.
  Full legal and Hyp handoff explanation retained. Concept's shorter fixed CTA,
  aggregated extras and illustrative time spacing are intentionally not copied.

## Functional evidence and limits

`browser-results.json` records seven viewport sizes, edit return, note save,
pickup change, invalid promo alert, keyboard focus, forced colors and root-font200%.
`state-results.json` adds full slot, capacity503 error, closed override, long sauce
plus two preparation instructions, and empty tray. Representative captures were
actually opened; recorded geometry covers the complete responsive matrix.
Post-fix high-contrast and note-focus checks supplement the original matrix.
No horizontal document overflow or clipped control text; final receipt and footer
remain accessible by scrolling. Promo focus computed solid3px. No page exceptions
or attempted non-GET/HEAD writes; all external hosts blocked by the local fixture.

263 regressions passed; scoped lint0errors; final isolated optimized build and
TypeScript passed, 37pages; diff whitespace check passed with existing CRLF notices.
React review: pure presentation extraction, no new dependency/hooks in the tray,
no fetch/waterfall/storage loop, keyed native lists, named controls and optional
focus prop with unchanged defaults for other modal consumers. Price, order locks,
provider handoff, pending recovery, schedule and backend remain unchanged.

Limits: Chrome emulation/200% root-font stress are not physical-device, screen-
reader or full zoom certification.503s are explicit local fixtures, not live
service checks. No real order/payment, database write, secret exposure, commit,
push, merge or deployment. Owner visual approval/publication are separate.

final result: passed
