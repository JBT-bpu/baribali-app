# Full-frame artwork and integrated masthead — 2026-10-05

Owner scope: show the complete assets including their frames, make the top
banner integrate with the existing palette, reveal the background and particles.
Keep v1.0 structure and the selected botanical treatment. Prioritize 360–430 CSS
pixels; 320, landscape and tablet are robustness checks, not the design baseline.

## Asset provenance

Mode: built-in ImageGen edit, `transparent_background: true`. No shell API key
or external image service. References were opened and inspected before editing.

References:
- `public/builder-assets/builder-brand-cartouche-v2.webp` (edit target).
- `.playwright-cli/responsive-audit-2026-10-05/01-entry-393x852.png` (palette/context only).

Original generated PNG retained:
`C:/Users/COMP13/.codex/generated_images/01a06340-dcbe-7fd0-b3cb-302686bed44f/exec-0cdf6ab7-1f99-4fd2-b14e-62c620f2532e.png`
(2171×724, RGBA, alpha min 0 / max 255).

Versioned delivery: `public/builder-assets/builder-brand-cartouche-v3.webp`,
960×320, 108334 bytes, genuine alpha. Mechanical Sharp contain-fit resize,
transparent safety margins (12px horizontal / 6px vertical), WebP quality 82,
alpha quality 100. No crop or distortion. V2 remains untouched.

Exact prompt:

> Use case: background-extraction with precise palette refinement.
> Asset type: transparent botanical masthead for the existing BariBali mobile salad builder; not a new UI design.
> Image 1 is the EDIT TARGET. Image 2 is context only: the current app's warm golden green particle background and emerald-gold food card.
> Keep the existing central BariBali illustrated wordmark, salad-bowl emblem, symmetrical arch, gold filigree and leafy side ornaments. Keep the literal lettering 'BariBali' exactly, no other text. Do not redesign or replace the logo. Preserve the full ornamental frame including both side ends and the bottom scrollwork, with a small transparent safety margin on every edge.
> Remove all rectangular green backplate/background, including the empty green space inside and outside the arch: genuine clean alpha transparency there so the app's real background and particles show through. Keep the actual logo, leaves and metallic ornament opaque. The dark negative spaces between leaves should be transparent, not a dark rectangle.
> Refine only the color harmony: warm champagne/antique gold instead of harsh electric yellow, rich natural emerald leaves instead of lime, matching Image 2's premium emerald and warm gold. Keep the familiar silhouette and composition, no new objects. No white fringe, no glow halo, no checkerboard baked in, no shadow rectangle, no gradients filling the transparent space.
> Output one wide 3:1 transparent cutout, full art visible, not a screenshot, not a phone mockup, no toolbar or buttons.

## Implementation boundary

Shared entry/summary masthead uses V3 with contain-fit and outer breathing room.
Header backplate is transparent; toolbar surfaces use translucent existing
emerald/gold values. Home preload references the same version. The summary now
uses the builder's original BG_8K backdrop at the same 0.45 brightness; the
existing GoldField is reused, not duplicated. Canonical prices, recipes,
ingredient geometry, checkout, payment providers and storage are unchanged.

Hero artwork uses contain-fit instead of cover. The fixed 180px minimum and
clipping were removed. Scoped compact typography keeps the native action on its
gold plaque at 320–375px without resizing the food art independently. A cleaned-up
ResizeObserver measures actual native copy at the stable compact width. When
large text cannot fit, the entire artwork/plaque remains intact and the same
native facts reflow below it. The hidden measurement clone is removed immediately;
no duplicate content or new control remains in the DOM. DOM reads/writes are
batched to avoid an additional forced layout. No new dependency or particle
system. See `design-qa.md` for rendered comparisons and final verification.

No deployment, push, production update, database operation or order submission
is authorized or performed by this change.
