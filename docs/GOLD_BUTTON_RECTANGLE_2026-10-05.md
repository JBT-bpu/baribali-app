# Gold button rectangle refinement — 2026-10-05

## Subsequent publication authorization

The owner requested an online Preview to inspect personally. The narrow asset
change will be published with the already-selected builder refinements and the
earlier requested brighter L card, on `codex/payment-foundation` only. The
pre-publication verification snapshot below is retained; it is not a claim that
automated rendered QA passed. `main`, production and protection remain unchanged.

## Requested change

The owner asked only for the empty gold button to be less rounded, like the
other card frames. The capsule ends were replaced with straight vertical sides
and modest rounded corners, retaining the botanical gold material/engraving.
No layout redesign, recipe change, new feature or publication was requested.

## Saved project assets

Built-in ImageGen editing was used, not the CLI/API fallback. Original PNGs and
the existing v1 WebPs remain intact. Sharp performed only resizing/compression,
transparent-margin trimming and a side-by-side source comparison.

- Final hero asset:
  `C:/Users/COMP13/Documents/ChatGPT/BariBali/payment-foundation/public/builder-assets/start-hero-seal-v2.webp`
  — 1080×538, 96460 bytes.
- Final transparent standalone button:
  `C:/Users/COMP13/Documents/ChatGPT/BariBali/payment-foundation/public/builder-assets/button-leaf-seal-v2.webp`
  — 512×128, 14656 bytes, true alpha (minimum 0).

Original generated outputs, retained under
`C:/Users/COMP13/.codex/generated_images/01a06340-dcbe-7fd0-b3cb-302686bed44f/`:
- `exec-f7e4faa2-0ac0-4f99-bb22-f95c299f0a0f.png`, 1777×885 hero.
- `exec-5ffcaed1-7591-4eb2-b72b-3663bfe05389.png`, 2170×725 alpha button.

## Narrow code integration

Only the hero image reference and standalone button background reference select
v2. Fallback and forced-colors CTA corners are now 8px instead of a capsule.
Existing native copy, prices, ARIA, action handlers, hero card ratio/minimum height,
footer touch target and the large bowl composition are preserved. All twelve
recipe bowls, controls, outer frames and backgrounds are untouched this turn.
There is no claim that generative editing preserves every surrounding pixel;
same-size source comparison was reviewed for composition and food-scale drift.

Opened source-only comparison:
`.playwright-cli/builder-seals-2026-10-05/gold-shape-v1-v2-source-comparison.png`.
1096×439 pixels; old artwork on the left, revised on the right. Hero halves
are 540×269, standalone buttons 512×128 on the same emerald background.
The revised shape is visibly rectangular; food size, quiet copy region and
native-control footprint remain consistent. This is not a browser capture.

## Validation and boundary

241/241 tests pass, typecheck passes, the changed component/tests pass targeted
lint, and the production build passes. Active phase asset bytes are now 374070
(about 365KiB); retained versioned originals add 111116 bytes to the working tree,
not necessarily to any route transfer.

Browser visual QA remains blocked by the earlier unanswered request for
permission to use isolated Chrome; no browser was opened. The source comparison
does not replace rendered QA. No commit, push, deployment, provider, environment,
payment, order or database mutation occurred. Prior local/unrelated changes are
preserved. The already-published Vercel Preview still lacks these local edits.

## Final prompt set (built-in ImageGen)

### Hero edit

Use case: precise-object-edit.
Asset type: existing BariBali builder entry-card artwork, surgical edit.
Image 1 is the edit target. Change ONLY the blank horizontal gold button plaque at the bottom of this image. It currently has semicircular capsule ends. Make it an elegant rounded RECTANGLE: long straight top and bottom edges, short visibly straight vertical side edges, modest small rounded corners (corner radius about 12–15% of the plaque height, NOT half the height). Match the rectangular framed cards in this same botanical UI. Keep the plaque in EXACTLY the same bottom position and outer width/height/footprint. Keep its warm gold engraved double rim, luminous brushed-gold blank face, subtle inset leaf engraving and surrounding leaves.
Invariants: preserve the large salad bowl at upper RIGHT, its size, position, actual food arrangement, the left empty dark emerald copy space, background bokeh, green/gold palette, lighting and outer card frame. Do not redesign, move, shrink or enlarge anything else. Same full 1080:538 landscape composition/aspect. No text, no letters, no numbers, no arrows, no logo, no watermark. Keep gold face completely blank for native UI text. The one visible change must be the button's less rounded rectangular silhouette.

### Standalone button edit

Use case: precise-object-edit.
Asset type: existing BariBali decorative blank gold CTA button, genuine alpha cutout.
Image 1 is the edit target. Replace ONLY its capsule/pill silhouette with an elegant rounded RECTANGLE, keeping this exact front-on perspective, placement, horizontal footprint, gold color, gold material/shading, thin engraved double rim, inset botanical sprigs and leaf end ornaments. The plaque must have long straight top/bottom edges and short clearly straight VERTICAL side edges with SMALL rounded corners, radius about 12–15% of plaque height. It must not be oval or pill-shaped. Same ~4:1 canvas aspect and comfortable transparent gutters; do not enlarge its footprint or ornaments. Keep the center spacious and completely blank for native UI label. No text, no letters/numbers, no arrows, no UI screenshot, no mockup, no added ornaments/objects. Preserve actual transparent alpha background, no fake checkerboard or solid backdrop. Only change the gold plaque corner shape.
