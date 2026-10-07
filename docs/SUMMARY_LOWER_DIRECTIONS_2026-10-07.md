# Lower summary — visual exploration, not an implementation

The owner approved publishing BariMeter option 1, then continuing design work
while they inspect it. The published immutable Preview is recorded in
`PREVIEW_RELEASE_2026-10-07.md`. Do not change that deployment or production
while the owner reviews it.

## Brief and captured source

Target: the part of `SummaryView.jsx` below BariMeter, particularly selected
ingredient groups, editing, the cook's note, pickup and price presentation.
Keep the approved round header, luminous particle background and emerald/gold
botanical materials. Improve scanning and readable Hebrew without expanding
the application or changing the working order flow.

Grounding captures in `.playwright-cli/barimeter-atelier-2026-10-07/`:

- `summary-lower-before-2026-10-07.png`: existing choices and note control.
- `summary-pickup-price-before-2026-10-07.png`: existing price and trust copy.
- `iteration-4-393.png`: implemented BariMeter material reference.

All three were opened and attached to each generation. These are local
fixture screenshots, not evidence of current live pickup availability.
Available slots shown in the concepts are illustrative, not operational data.

## Concept strategies

- **Botanical Selection Folio:** one shared emerald folio with restrained
  corner ornaments, grouped ingredient illustrations and native edit actions;
  quiet dividers and a typography-led receipt.
- **Compact Ingredient Tray:** a low continuous shelf, eight ingredients in
  two rows, a compact paired sauce strip, and stronger pickup emphasis.
- **Pickup-led Order Docket:** pickup near the top of this scrolled section,
  larger text-led ingredient groups, quieter imagery, and a concise receipt.

These are distinct hierarchy/layout proposals within the existing brand, not
new color systems. Exactly three independent generated images are required.
Numeric selection is bound to their **display order in chat**, never the
planned concept list. Wait for selection before building the lower summary.

## Generated visual targets (preview only)

All three displayed results are saved in
`C:/Users/COMP13/.codex/generated_images/01a06340-dcbe-7fd0-b3cb-302686bed44f/`:

| Chat display order | Concept | File |
| --- | --- | --- |
| 1 | Botanical Selection Folio | `exec-70bcd649-302a-4ab1-8439-d19f02b5f1d3.png` |
| 2 | Compact Ingredient Tray | `exec-7e21b6d2-3f8b-410d-9779-71c433977f5b.png` |
| 3 | Pickup-led Order Docket | `exec-f9c1bb8c-5372-45fc-a189-f9a7ae1663c3.png` |

All three independent results were displayed exactly once in this order in
chat. Numeric selections for this lower-summary set map to the table above.
These images are not app assets, have no working controls and are not included
in the published Preview. The owner subsequently selected **chat display option 2**.
Its local implementation and QA are recorded in `SUMMARY_TRAY_2026-10-07.md`;
the existing published Preview has not been replaced by this implementation.

Generation: built-in image tool, opaque complete-screen UI mockups, with all
three inspected actual screenshots attached. Target viewport is 393x852;
the first result is an 852x1846 PNG, preserving that aspect ratio. Prompts
specify Hebrew RTL, the fixed ten-choice draft/math, the existing emerald/gold
background/header, no nutrition-hero redraw, no invented features and native
controls in a future implementation. Each concept changes hierarchy/grouping
as described above. The generated folio uses four food columns rather than the
prompt's three; a selected mock is still subject to the owner's refinements
and real responsive implementation, not claimed as a pixel-verified UI.

## Shared content invariants

Reference draft: medium salad, 1000 ml, base ILS59. Vegetables: baby leaf,
tomato, cucumber, quinoa, chickpeas, sweet potato, red onion, sunflower seeds.
Only quinoa adds ILS2. Sauces tahini and lemon add ILS3 each. Ten choices,
ILS8 extras, ILS67 total. Do not invent proteins or change this arithmetic.

Ingredient names, values, prices, pickup state and actions must remain native
elements in the eventual implementation. Generated art supplies material,
frames and cutouts, not a screenshot serving as the interface.

## Implementation boundary after approval

1. Extract a presentation-only choice-group component if useful; retain the
   existing step mapping, `onEdit`, checkout lock and highlight behavior.
   Preparation choices stay in the order and use their existing labels.
2. Use at most one new flexible decorative frame per shared surface, with
   individually generated genuine-alpha artwork if needed. Preserve readable
   content-driven height, complete corners and no cropped or stretched art.
3. Restyle the existing note trigger/sheet; retain the 200-character bound,
   validation, focus management and disabled state.
4. Restyle the existing pickup picker, without changing slot calculation,
   capacity checks, selected-time invalidation, live notices, disabled/full
   states, region ref, or the footer's jump-to-picker action.
5. Keep price and promotion calculations, validation, error announcements and
   their existing handlers. Concept summaries of extra costs do not authorize
   deleting the actual detailed price information.
6. Preserve payment configuration, pending/recovery actions, shop blocking,
   submission and hosted-Hyp redirect behavior. Keep accurate explanatory and
   legal text; a short concept trust line does not authorize hiding recovery
   information or asserting a payment succeeded.

No new dependency, route, schema, provider change, checkout mutation or
production promotion belongs to this design pass.

## Verification after implementation

Prioritize 360, 393 and 430px phone widths; include 320px and short viewports,
larger text, keyboard navigation, forced colors, and reduced motion. Verify
long Hebrew names wrap legibly, all frame corners remain visible, touch targets
remain usable, the footer does not conceal scrollable content, and errors and
closed/checking pickup states remain clear. Use the selected image and actual
render side by side before handoff. Repeat scoped typecheck/lint, regressions
and an isolated build without overwriting the running local preview.
