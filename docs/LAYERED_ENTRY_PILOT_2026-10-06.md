# Layered builder-entry pilot — 2026-10-06

## Scope and result

The owner approved starting on the existing builder-entry page: build from scratch or choose a recipe. This is a local pilot, not a deployment or broad redesign. The starting card and signature recipe (closed + open) use layered artwork; the other eleven recipes, shared masthead, original background/GoldField, ordering and pricing behavior are retained.

Local route: http://127.0.0.1:3004/build?size=M. Opt-in BARIBALI_UI_PREVIEW build uses the existing .next-ui-preview output, leaving .next and other sessions untouched.

## Selected assets and provenance

Built-in ImageGen was used, requesting transparent_background=true; no CLI/API fallback or new package. Selected originals were inspected, then mechanically resized/encoded with Sharp (quality 88, alphaQuality 100). No manual recoloring, semantic cutout repair or asset-sheet crop.

| Production file under public/builder-assets/ | Dimensions | Bytes | Alpha |
| --- | --- | --- | --- |
| entry-frame-layer-v1.webp | 960×480 | 61882 | True; center and outer corners transparent |
| entry-bowl-layer-v1.webp | 448×448 | 87858 | True |
| recipe-frame-layer-v1.webp | 960×331 | 40978 | True; center and outer corners transparent |

Total new source assets: 190718 bytes (~186 KiB). This replaces the 96460-byte flattened hero in this route but retains legacy art and its use by other controls; approximately 92 KiB additional unoptimized source-image payload is an explicit pilot trade-off, not a measured network transfer.

Original PNGs:
- Hero frame: C:/Users/COMP13/.codex/generated_images/01a06340-dcbe-7fd0-b3cb-302686bed44f/exec-cc1bbb3b-2f75-4fbe-bd6b-40751308d7e7.png
- Selected bowl: C:/Users/COMP13/.codex/generated_images/01a06340-dcbe-7fd0-b3cb-302686bed44f/exec-80c812a7-3d2c-4bc5-a58e-4c27b98525c1.png
- Recipe frame: C:/Users/COMP13/.codex/generated_images/01a06340-dcbe-7fd0-b3cb-302686bed44f/exec-84bc0b5e-a77a-4b07-a41d-487846c23a82.png

These three masters also have project-local copies in .playwright-cli/layered-entry-pilot-2026-10-06/masters/. Optimized deliverables are in the tracked-source asset directory. Originals and the previous flattened hero/button are preserved.

Three wider bowl attempts introduced green haze despite the alpha request, so they were rejected rather than hidden with CSS or shipped. Their files remain only in generated-image storage:
- exec-a9ee455b-1fa3-4cfe-bcaa-475ba6501682.png
- exec-60c90862-79c0-4a2b-9b37-8115fd18c292.png
- exec-7b5da426-30a3-45d4-a425-430a8b91472c.png

## Layer ownership

- BuilderStartCard: one native button. Content flow sets height. Independent decorative bowl; current price/size/draft action stay native. No cloned text probe, ResizeObserver, timer, new canvas or duplicated pricing state.
- BuilderArtFrame: inert aria-hidden span; pointer-events none; hero/recipe frame variants. Frame center is not filled. Native fallback border remains usable if decoration fails.
- Shared gold action: real existing button-leaf-seal-v2.webp, nine-sliced independently from text; a small underlying gold fallback is confined to the plaque center, not a rectangle behind its transparent leaf edges.
- Signature recipe: existing canonical matching food cutout at 52px in the closed control and 70px in the open header; shared new light frame and matching action plaque. Unknown/stale artwork still falls back to a canonical ingredient. Other recipes keep their current treatment.
- Motion: small bowl hover/press transform, reduced-motion override; existing single GoldField is retained. No perpetual added sparkle or new animation dependency.

## Responsive contract and conscious differences

The 393px M entry hero is now 361×239.5 rather than 361×180.5. The first pilot iteration was 220px tall with a smaller 140px bowl. After review the bowl limit was raised to 160px and the plate backing was corrected. More vertical space is intentional for a natural complete bowl and content-driven layout, and must be reviewed by the owner before rollout.

Primary phone captures: 360/390/393/412/430 CSS px. Additional stress layouts: 320×568, 768×1024, 844×390, 1440×900. The mobile canvas remains capped at 430px. At 320 the card's content container stacks food above text. Short viewports scroll; not every frame is promised to fit simultaneously above the fold.

## Verification

- 246 regression tests pass; standalone TypeScript passes.
- Production-mode isolated build passes (37 route entries).
- Full lint: zero errors, eight existing warnings; no new warning.
- Git whitespace check passes.
- Fresh isolated Chrome, DPR 1, open-shop fixture, external and non-GET/HEAD requests blocked.
- No document horizontal overflow or hero content outside its card at the captured widths.
- S/M/L native prices: 54/59/72.
- The existing size-picker dialog was also confirmed through the UI: selecting L returns to the 1500ml offer and ₪72.
- Recipe expand/close tested at 360/393/430; closing restores focus.
- Enter on the native hero begins empty building.
- Signature recipe loads canonical selections (eight checked base ingredients) and retains its draft on returning to entry.
- Computed-font 200% hero stress stays within its frame. This is not a claim about an OS font setting or native browser zoom.
- Forced colors, visible keyboard focus, normal-motion single canvas and actual image-failure fallback captured. The failed-image fallback still starts the builder.
- A blank-looking recommended badge found in forced-color QA was repaired with Canvas/CanvasText and a native border, then recaptured and inspected after the final build.
- No page exceptions or write requests. The console's one intentional ERR_FAILED image entry corresponds to the injected image-failure test.

Visual comparison evidence and full history are recorded at project-root design-qa.md; captures and safe reusable verification scripts are in .playwright-cli/layered-entry-pilot-2026-10-06/.

Limits: no physical-phone/GPU/high-DPR/Safari profiling, no full accessibility certification, no submitted order/payment or production verification. No commit, push, provider setting, environment secret or database changes.

## Exact ImageGen prompt set

### Hero frame

Use case: stylized-concept. Asset type: ONE isolated transparent UI frame for the existing BariBali salad-builder entry card. Input image 1 is only the approved material/style reference, NOT a composition to reproduce. Create a horizontal rectangular botanical gold frame, approximately 2:1 width to height, front-facing and perfectly level. Genuine transparent background BOTH outside the frame AND across the entire empty center. No food, no bowl, no text, no logo, no button, no green panel, no scenery. Refined warm brushed gold with emerald botanical engravings, bright inviting highlights, shared light from upper left, restrained depth like the reference. Four matching small botanical corner ornaments confined to the corner squares; long horizontal and vertical edges are straight, clean, continuous and visually uniform so a nine-slice UI can lengthen the edges without stretching the ornaments. Corners only lightly rounded, about a 20px radius in a 1024px wide canvas. Frame is nearly full canvas with a modest clean transparent safety margin so ALL four edges and ornaments are visible. Ornamental corner squares no larger than 12% of the frame width. Gold rail about 0.6% of frame width, no thick fantasy-game border. Exact clean alpha at all inner and outer edges, no colored matte/fringe, no painted checkerboard, no broad glow. Render only this single production-ready frame, not a sheet, collage or interface mockup.

### Hero bowl (selected)

Use case: background-extraction. Asset type: ONE independent high-resolution transparent salad bowl illustration for the existing BariBali builder hero. Input image 1 is the source bowl and approved rendering style. Isolate and re-render ONLY the full inviting salad bowl from that image as an independent cutout, preserving the emerald glazed bowl with botanical warm gold engravings, appetizing bright vegetables and same three-quarter viewpoint/light from upper left. Keep the bowl generously full, vibrant and bright, not dark. Retain the visible leafy greens, cherry tomatoes, cucumber slices, olives and toppings as decorative inspiration; do not add text or price. Remove every frame, button/plaque, background, loose surrounding decorative leaves and scenery. Center the entire bowl including all upper salad leaves and the foot in a square canvas, about 88% of width, no clipping. True transparent alpha everywhere outside the food and bowl; no matte, no checkerboard, no painted glow/oval floor shadow, no white rim/fringe. Crisp high-quality clean silhouette, modest natural shading on the bowl itself. ONE isolated bowl, not a collage or full card.

### Recipe frame

Use case: stylized-concept. Asset type: ONE small responsive recipe-card frame, genuine transparent cutout. Input image 1 is the BariBali material/style reference only. Create a clean front-facing horizontal rectangular gold frame, about 2.2:1 ratio, meant to remain beautiful around a 175px wide, 76px tall mobile recipe button. Transparent outside AND transparent empty center, absolutely no panel background. Thin warm brushed-gold double rail, softly beveled, with FOUR small matching restrained gold botanical corner flourishes. All ornament MUST stay within the four corner squares (less than 11% of overall width). The central portions of ALL four rails are straight, plain and uniform: NO leaves along the straight edges, NO midpoint crest, NO diamond, NO center emblem, NO objects in the empty center. Very modest corner radius, not a pill; small clean safety padding to show every edge. Upper-left illumination, emerald hint only within corner engraving. No food, no text, no badge, no button/plaque, no logo, no scenery, no fake checkerboard, no wide halo, no colored fringe. This is a lightweight matching companion to the richer hero frame, not a new style. Only one independent frame, no asset sheet.

### Rejected wider bowl, proportion edit

Use case: precise-object-edit. Asset type: standalone transparent hero salad bowl. Input image 1 is the EDIT TARGET: the current transparent bowl. Input image 2 is the original approved hero, used ONLY as the wider, lower-profile bowl proportion and viewpoint reference. Change only the bowl silhouette/proportions and viewpoint: make the bowl a wide, shallow oval salad bowl, with a low, almost invisible foot rather than the tall pedestal. The COMPLETE visible food-and-bowl silhouette should be about 1.5 times wider than tall, like the bowl in image 2, so it can be shown much larger beside native text in a compact landscape UI card. Preserve vibrant appetizing salad contents, emerald glaze, crisp delicate warm gold botanical engraving, bright upper-left lighting and rendering quality of image 1. No frame, no background, no plaque, no text, no labels, no logo, no surrounding decorative leaves, no cast oval floor shadow. Produce a landscape cutout canvas about 3:2, all salad leaves and the entire bowl visible with a modest transparent margin on all sides. Genuine transparent alpha, clean fine edges, no colored matte, checkerboard or broad glow. Do NOT make a tall chalice or stretch the food mechanically; re-render as a coherent naturally wide bowl.

### Rejected wider bowl, background removal

Use case: background-extraction. Edit the attached image: REMOVE THE BACKGROUND COMPLETELY and make it a clean, genuine transparent PNG cutout. Preserve only the salad food and the emerald/gold bowl, with identical wide proportions, complete silhouette, position, camera angle, bright colors and ornament. Remove ALL green/yellow glow outside the silhouette, ALL black background, and ALL floor/cast shadow below the bowl. Every pixel outside the physical leaves, food and ceramic bowl should be fully transparent (alpha 0), not a colored haze. Fine anti-alias only immediately at the physical edge. Do not draw a background, checkerboard, logo, text, border, frame or additional objects. Do not restyle, darken, make the bowl tall, or crop any leaves. One full isolated wide salad bowl only.

### Rejected wider bowl, new cutout generation

Use case: product-mockup. Generate ONE isolated wide salad bowl illustration on a GENUINELY TRANSPARENT background. Image 1 is a material and food STYLE REFERENCE only. New subject: a very wide, shallow oval emerald ceramic salad bowl without any pedestal, filled with vibrant greens, cherry tomatoes, cucumber, olives and appetizing toppings. Warm gold botanical engraving on the bowl, matching Image 1. Three-quarter view, bright light falling on the food and bowl ONLY. A LOW PROFILE: the complete visible food-and-bowl object is approximately 1.5 times wider than tall. Landscape canvas about 3:2. Entire object centered with 5% clear transparent padding on all sides. Absolutely no scene or backdrop: NO glow, NO aura, NO floor, NO floor shadow, NO gradients behind the food, NO green fog, NO black rectangle. Outside the physical food and bowl, alpha must be ZERO, like a clean e-commerce product cutout. Keep shadows only within the physical bowl itself. No text, no logo, no frame, no plaque, no loose leaves outside the bowl. Produce a clean production PNG with real alpha, not a picture of transparency. Do not reproduce the reference's tall foot.
