# Dedicated builder header and matching card finish — 2026-10-04

Follow-up to the owner's phone review of `113c6ca`. The owner requested a dedicated header asset in the style of the summary/receipt and order-confirmation artwork, with an optional coordinated card finish.

## Scope and design decision

- Replace only the active builder's oversized wordmark backdrop with a quiet emerald-and-gold botanical panel. Original starter branding, summary artwork, bowl, footer, background, navigation flow and ordering rules remain unchanged.
- Gold decoration stays at the outer edges, with a calm central area for the live Hebrew heading and controls. The artwork is decorative CSS, not text or a replacement for accessible labels.
- Extend the rendered artwork's lower margin by 16px so the decorative gold rail sits below the visible step markers. Keep header content in normal flow with its existing safe-area padding.
- Match compact ingredient cards to the header using opaque emerald enamel shading and a very light inset bevel, not repeated raster borders or new ornaments. Premium surfaces remain warm; selected cards retain their gold outline/checkmark.
- Card minimum height stays 120px, artwork 56px, names 13px, and information targets 44×44px. Long names can still wrap naturally. No taller boxes, thicker selection borders or new animations.
- The sound control now uses the neutral navigation surface instead of the red reset-button surface. The reset action remains visibly distinct.
- No dependencies, authentication/deployment protection, environment values, HYP/Supabase settings or production changes.

## Asset provenance

- Generation: built-in `image_gen`, one new asset generated using the two existing public assets below as style references; no CLI/API-key fallback.
- Reference images: `public/builder-assets/summary-panel.webp` and `public/builder-assets/sent-frame-top.webp`.
- Generated original: opaque PNG, 2171×724. The original remains in the local generated-image library; existing assets were not overwritten.
- Saved project asset: `public/builder-assets/builder-header-panel-v1.webp`.
- Delivery image: 1280×427 WebP, quality 88, 34,376 bytes (about 34KB), optimized with the already-installed Sharp package.
- SHA-256: `099c7e1426b122ca4f84c2b2d76b84277417fba9b920cc38f148ae3517284ef4`.

### Final generation prompt

```text
Use case: stylized-concept.
Asset type: a production raster background for the compact header of the BariBali Hebrew salad-builder web app, not a UI screenshot.
Input images: Image 1 is ONLY a style reference: the existing emerald-and-gold summary plaque. Image 2 is ONLY a style reference: the order-confirmation frame. Create a NEW original coordinating asset; do not edit or copy the layouts of those references.
Primary request: a sophisticated horizontal emerald-green and antique-gold botanical UI panel, matching the artisan embossed gold trim and rich deep green of the reference plaques, scaled down and restrained for everyday navigation.
Composition: very wide landscape, approximately 3:1 aspect ratio, straight-on flat panel with no perspective. Full-bleed opaque green rectangular background. The central 80 percent must stay visually calm and dark for real white Hebrew text and navigation buttons rendered separately in the app. Fine polished twin gold lines along the lower edge; tiny engraved leafy flourishes confined to the extreme lower outer corners, with subtle verdant shading at the outer edges. No large arch, crest, crown, inset plaque, separate compartments, cutout or transparent outer margins.
Materials: dark emerald enamel with almost invisible fine-grain texture, softly sculpted edges, restrained warm metallic highlights. Understated, elegant, high craft quality, not a game reward or casino graphic.
Palette: deep green #0b2312 to #153e22, warm muted gold #c8a84e, tiny highlights #f0d060.
Constraints: NO lettering, NO BariBali wordmark, NO logo, NO text, NO UI buttons, NO food illustrations, NO bowl, NO watermark. No sparkle field, bright bokeh, starbursts, busy center, magenta or black exterior. Must remain useful and readable as a real mobile UI header.
```

## Verification of the final source

- Regression suite: 218 passed, 0 failed. Two new contracts cover the dedicated lightweight header and restrained card shading.
- Typecheck passed. Lint: 0 errors and the same nine pre-existing warnings.
- Isolated optimized Next.js build passed, without overwriting the normal dev output.
- Fresh Chromium mobile context, 320×568, 390×844 and 430×932. Fourteen geometry checks cover all five builder stages, selected premium state, reduced-motion editing and a simulated 200% heading-font scale at 320px.
- Every active header uses the new artwork; all header button targets are at least 44×44px. No heading/control collisions, clipped heading spans or title overflow.
- Ingredient cards remain 120–129.78px tall, with a 1px border. No artwork/name/price/information collisions or horizontal overflow.
- The new image decodes successfully at 1280×427. Screenshots were reviewed after the final rail-position adjustment.
- Information is independent of selection; Space-key selection, summary editing, removal/re-addition through both cards and bowl strip passed.
- Browser errors: zero. Attempted API writes: zero. The browser guard allowed only GET/HEAD for API requests; no order or payment was submitted.
- Screenshots and the draft-only harness are in `.playwright-cli/header-panel-20261004/` (ignored). Real-device/iOS review remains with the owner.

Publication follows the existing feature-branch Git workflow to a protected Vercel Preview. No merge to `main`, production promotion, protection bypass or folder upload is part of this pass.
