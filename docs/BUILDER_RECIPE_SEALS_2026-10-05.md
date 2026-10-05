# Builder recipe seals — 2026-10-05

## Owner-authorized Preview publication

After reviewing the rectangular gold-button source artwork, the owner requested
uploading the local revisions and will inspect the live UI himself. This permits
feature-branch commits/push and a Preview deployment, not merging/promoting to
production. Automated visual QA remains pending and is not claimed passed.
Verification of the exact deployed SHA and artwork is recorded locally under
`.playwright-cli/builder-seals-2026-10-05/deployment-verification.json` after READY.

## Subsequent owner refinement: gold button corners

The owner requested less-rounded gold buttons, with the rest unchanged. The
current hero and footer use `start-hero-seal-v2.webp` and `button-leaf-seal-v2.webp`.
Their frame is rectangular with modest rounded corners; native fallback corners
are 8px. V1 files below remain intact. See `GOLD_BUTTON_RECTANGLE_2026-10-05.md`
for the final paths, exact edit prompts, source-only comparison and 241-test
validation. Browser QA and publication remain pending, as in the original phase.

## Owner selection and scope

Owner selected concept 3, then requested the larger salad from concept 1.
The merged target preserves v1.0's structure: a large, appetizing bowl within
the entry card, compact two-column chef recipes, unified native utility controls,
a quiet botanical builder header and an engraved leaf-ended CTA.

Selected merged source (opened and inspected):
`C:/Users/COMP13/.codex/generated_images/01a06340-dcbe-7fd0-b3cb-302686bed44f/exec-eb58b8ed-54c6-48f5-b4e0-a3877baf7e00.png`.
This is a generated design reference, not an application screenshot.

## Local implementation

- `BuilderStartCard` replaces the separate small bowl and gold strip with one
  dedicated illustrated composition. All Hebrew copy, current size, price, draft
  action and accessible label remain native. Image failure has a native fallback;
  size change remains a sibling button. Nominal ratio is 2:1, minimum height 180px,
  not a forced text-clipping height. Rendered geometry is still unverified.
- Twelve distinct transparent recipe bowls replace isolated ingredient icons.
  Native quoted prices and detailed ingredient panels are unchanged. Illustration
  eligibility compares each recipe's exact current ingredient IDs with a fixed
  art snapshot; changed, duplicate and unknown recipes fall back to a real
  ingredient. Image-loading failure also falls back. Art is illustrative, not an
  exact quantity, nutrition, allergen or plated-product representation.
- Recipe artwork occupies 52px within the existing minimum 66px button: padding
  is reduced rather than enlarging the whole box. Narrow and zoomed layouts still
  require actual browser verification; no assertion that every label fits yet.
- Sound, reset, direction arrows and steps use the existing Lucide fine-line
  family. Back is ArrowRight and forward is ArrowLeft for RTL. Sound persistence,
  reset confirmation, future-step locking and full accessible labels are retained.
- A dedicated quiet leaf frame is nine-sliced rather than stretched behind
  controls. It is scoped to this builder phase, not the global approved surfaces.
- The empty bowl sits on a small engraved plinth within the existing 96/88px art
  slot. All selections retain their 44px removal rail and native progress count.
  Only the decorative progress ring is hidden at zero ingredients.
- The footer retains native total, selection count and navigation. A blank gold
  leaf seal replaces its perpetual shimmer; the entire native button remains the
  touch target. Forced-colors decorations are suppressed or replaced with borders.

No dependency, recipe definition, price authority, ordering rule, payment,
provider, environment, availability or database code was changed. The existing
background/particles and earlier local L-v2 revision are preserved. S is unchanged.

## Asset provenance and mechanical exports

All creative artwork used the built-in ImageGen tool. Original PNGs retained in
`C:/Users/COMP13/.codex/generated_images/01a06340-dcbe-7fd0-b3cb-302686bed44f/`:

| Original PNG filename | Output and brief |
| --- | --- |
| exec-083c22cb-c149-4153-9d1c-e6318fb2e2d4.png | Final corrected 1448×1086 alpha atlas, 4×3 recipe bowls. Common emerald/gold vessel, visibly distinct recipe ingredients, no text or prices. Garden celery/sprouts and warm/eastern eggplant were corrected after visual review. |
| exec-31d9bd0e-870f-4ddd-926b-963256bf26c1.png | 1778×885 start hero: large salad on the right, quiet left for native text, blank engraved CTA below, compact botanical frame; no baked facts. |
| exec-0482c6df-b4c6-4a8a-86ab-e53c36a7dfab.png | 1774×887 alpha atlas: empty bowl/plinth on left, blank leaf-ended gold seal on right. |
| exec-ad1168ac-ed5d-45a1-a23b-df85d012a68b.png | 2172×724 quiet emerald texture, thin gold perimeter and restrained corner leaves, no copy or controls. |

The rejected first recipe atlas `exec-a04e69aa-3225-4ff7-b6cb-f2f3e4ed9c52.png`
is retained but not shipped. The final atlas crop order, left-to-right each row:
signature / mediterranean / asian_fusion / protein_beast;
rainbow / fire_spice / warm_earth / garden_fresh;
pasta_garden / detox_bowl / crunchy_master / eastern_night.
The existing pasta salad recipe is not the unlaunched standalone pasta product.

Sharp only cropped, trimmed transparent margins, resized, compressed WebP and
assembled a source-only contact sheet. It did not creatively redraw any asset.
Reproducible mechanical scripts and metadata are ignored under
`.playwright-cli/builder-seals-2026-10-05/`.

| New assets under public/builder-assets/ | Pixels | Source file bytes |
| --- | --- | ---: |
| recipes/{recipe-id}-bowl-v1.webp, twelve files | 208×208 each, genuine alpha | 221174 total |
| start-hero-seal-v1.webp | 1080×538 | 98412 |
| builder-bowl-empty-seal-v1.webp | 288×288, genuine alpha | 22826 |
| button-leaf-seal-v1.webp | 512×128, genuine alpha | 17872 |
| builder-leaf-frame-v1.webp | 960×320 | 18954 |

Total added asset bytes: 379238 (about 370KiB). This is file size, not a measured
per-route network transfer, decode time or handset performance metric.
Recipe and bowl/CTA alpha-channel minima were confirmed as zero.
Optimized exports opened and visually reviewed together on a dark background:
`.playwright-cli/builder-seals-2026-10-05/optimized-assets-source-board.png`.
This contact sheet is not a rendered-implementation comparison.

## Verification and publication boundary

All 240 regression tests pass, including five new artwork/native-control tests.
Typecheck and production build pass (37 static generation entries). Lint has
0 errors and the same eight existing warnings; the two new React components
introduce no effects, client fetches or redundant price state. The existing
Lucide icon family is reused; no new library/configuration was added.
Native local HEAD for the hero asset at port 3002 returned HTTP 200.

Rendered Product Design QA is blocked pending explicit approval to use an
isolated Chrome window: in-app browser tools are unavailable. No browser was
opened, no real order was placed, and no source/render fidelity pass is claimed.
In particular verify the hero's text/CTA alignment, small recipe captions,
nine-slice corner behavior, 320/393/430 widths, short screens, 200% text,
forced colors, failed images, drafts, recipe loading and native utilities.

No commit, push, deployment, production promotion or external mutation occurred.
Branch HEAD remains 6dc66a7910255217120115fd3476eb298ab1fd06; the already-published
Preview does not include this phase or L-v2. Source files and old assets remain
available for scoped rollback; unrelated existing working changes were preserved.
