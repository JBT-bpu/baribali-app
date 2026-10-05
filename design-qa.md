# Design QA — customer UI refresh, 2026-10-04

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
