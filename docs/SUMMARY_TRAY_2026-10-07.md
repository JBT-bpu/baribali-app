# Summary option 2 — Compact Ingredient Tray

Owner selection: chat display option **2** from `SUMMARY_LOWER_DIRECTIONS_2026-10-07.md`.
Implemented locally on `codex/payment-foundation`, based on commit `50338a2`.
Initially implemented locally without a commit, push, deployment or backend change.
The owner subsequently approved all four pre-preview UI polish items and a new
Preview-only release. No production promotion or backend change is authorized.

## Composition

- Existing header, BariMeter, bright background, particles and native order flow remain.
- `SummarySelectionTray.tsx` is presentation-only: actual grouped choices,
  canonical prices, preparation labels and original edit callbacks/locks.
- One shared emerald/gold shelf replaces the old individually framed 64px slots.
  Four columns at usual phone widths; three at the narrow container breakpoint.
  Names wrap at 14px rather than being truncated at 10px.
- Two sauces share a horizontal strip; it stacks when space/text size requires.
  Existing food art is reused rather than inventing a permanent pictured meal.
- Note trigger, pickup slots, detailed price panel and paired footer actions use
  matching materials. Native text, focus, error states and content-driven height
  are independent of the decorative raster layers.
- The note drawer opts into explicit trigger-focus restoration. Other callers
  of `BariModal` retain their existing behavior through an optional prop.
- No dependency was added. No animation loop, fetch, storage or backend logic
  was added to the tray. New outline icons use the installed Lucide library.

## Individually generated asset provenance

Built-in image generation, selected option 2 attached as the style reference,
`transparent_background: true`. Neither production asset is a mockup crop.

| Asset | Independent generated source | Export |
| --- | --- | --- |
| Shared gold frame | `exec-045f6cab-7d8d-4381-b26c-93e5059bed36.png` | `summary-tray-frame-v1.webp`, 960×541, 34,204 bytes |
| Blank satin-gold action | `exec-a5402b44-b6b9-4523-851a-de71c5dbc02f.png` | `summary-gold-action-v1.webp`, 960×209, 28,290 bytes |

Generated sources live in the current task's `.codex/generated_images` folder.
`scripts/prepare-summary-tray-v1.cjs` records exact source names and performs only
trim/resize/WebP encoding. Combined new artwork: **62,494 bytes**.
Real alpha verified in both exports: transparent exterior, and a transparent
frame interior. CTA center is opaque gold. No checkerboard baked into either.

Frame brief: blank orthographic thin gold rectangle, quiet straight nine-slice
edges, four small botanical corner ornaments, no food/text/logo/green fill,
transparent interior and exterior. Button brief: blank elongated satin-gold
rectangle, polished rim and restrained leaf corners, transparent exterior,
opaque gold face, no words/currency/arrows/baked controls. Complete corner art
is retained through CSS border-image; UI and button labels remain native.

## Intentional differences from the concept

This is the selected visual direction adapted to the existing application,
not a flattened screen or a pixel-identical reproduction. Native 44px edit
targets, larger readable labels, complete detailed extras and the full consent
copy require more vertical space; the summary continues to scroll normally.
The visible header remains the approved app header. Current catalog icons are
less photographic than the mock's food. This can be an optional future art pass.

The title stays product-neutral. CTA copy remains truthful to the configured
payment/recovery state instead of copying the mock's fixed label. Pickup slots
retain their actual five-minute schedule, capacity and peak labels; the concept's
three fifteen-minute examples are not used as availability rules.

Reference fixture arithmetic remains: base59 + quinoa2 + tahini3 + lemon3 =67.
No price, promotion, availability, request lock, idempotency, pending recovery,
Hyp redirect, provider setting, route or schema was changed.

## Verified locally

Evidence: `.playwright-cli/summary-tray-2026-10-07/` and root `design-qa.md`.
Selected source normalized proportionally to 393px width; actual screenshots
captured at 393×852 CSS px, DPR1, same ten-choice draft, Hebrew RTL, loaded fonts.
Final combined full/tray/footer boards: `comparison-6-*.png`, actually opened.
They are diagnostic images, never application assets.

- Phone widths320/360/393/430, short393×640, tablet768×1024 and desktop1280×900:
  no horizontal page overflow, clipped names or out-of-bounds footer controls.
- Group edit returns all eight vegetables and two sauces unchanged.
- Note entry retains maxlength200; final drawer capture and explicit keyboard
  focus return verified. Pickup shortcut focuses its labelled native region.
- Selected pickup state, full slot, capacity error and closed shop verified with
  local GET fixtures. Closed/error CTA stays disabled. No real order submitted.
- Invalid promotion submitted with Enter produces the existing native alert.
  Promo input retains a real 3px keyboard focus outline.
- Root-font200% reflows rather than clipping names; this is not full browser-zoom
  or physical iOS/Android certification. Forced-colors selected-time contrast
  corrected and visually retested; reduced-motion slot transitions are disabled.
- Actual preparation instructions, long sauce name and empty tray remain visible.
- **263 regression tests passed**, touched-file lint clean, isolated optimized
  build/typecheck passed (37 pages), whitespace diff check passed (CRLF notices).

Fixture scripts block all non-GET/HEAD methods and external hosts. Browser runs
record zero attempted order/payment writes and zero page exceptions. Expected
mocked503 capacity replies are not reported as successful provider testing.
User tabs were not touched. No live payment/settlement or database certification.

Local preview: `http://127.0.0.1:3004/build?size=M`.
The owner has authorized the new Preview; `main` and production must remain unchanged.

## Approved pre-preview polish

All four items from the inline review were implemented on 2026-10-07:

1. A native 44px navigation hint above BariMeter shows the order-wide choice count
   and jumps/focuses the actual selections region. Reduced motion is respected.
   The frame, bowl artwork and nutrition figures are not cropped or redesigned.
2. Each tray reports its own food count: eight ingredients and two sauces in the
   reference fixture. Singular labels and preparation-only/mixed groups are
   covered by tests; instructions are not counted as edible ingredients.
3. The footer uses shorter visible pickup copy with the complete accessible
   label retained, stacked pickup icon/title, tighter gaps and safe-area padding.
   All CTA, recovery, unavailable-provider and closed/capacity gates remain.
   Missing pickup is explicitly explained and highlighted in its own quiet card.
4. The detailed hosted-payment explanation is a native keyboard-operable
   details/summary disclosure. Its complete return/verification wording remains
   available, while all three consent links stay continuously visible.

Final local evidence: `.playwright-cli/summary-polish-2026-10-07/`.
Seven viewport checks pass:320×640,360×800,393×852,430×932,393×640,768×1024,
1280×900. No horizontal document overflow; footer actions remain56–73px tall.
Footer height with a selected time is145px at360/393,124px at430/tablet/desktop,
and156px at320. The one-pixel CTA pseudo-border overhang is intentional artwork,
not overflowing text. Source/reference artwork and all app prices are unchanged.

Keyboard activation moves focus to `summary-selections` at y122 and the pickup
shortcut focuses `pickup-time-picker`. Payment details open/collapse using Enter.
Root-font200% reflows; forced-colors selected times remain readable. Local GET
fixtures verify closed, full, capacity-error and stale-slot blocking. The loading
label was observed before the delayed fixture response; its saved screenshot
settled after availability arrived. No real order/payment or external write ran.

An old inline picker background/padding override was removed after visual QA;
the new prerequisite card now owns its styling. The stale-slot test was corrected
to dispatch the application's visibility-change event, not an unused focus event.
These test-harness corrections do not change availability rules.

Final verification:268 tests pass; isolated optimized build/typecheck pass with
37 pages; touched-file lint is clean. Full repo lint has0 errors and8 existing
warnings. Browser checks record0 page exceptions and0 attempted non-GET/HEAD writes.
React review: pure keyed presentation, type-only optional ref, no new dependency,
fetch/effect/storage in the tray; all order/payment locks and native errors retained.
Physical-device, screen-reader and live-payment certification are outside this pass.
