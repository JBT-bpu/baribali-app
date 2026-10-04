# Compact ingredient cards — 2026-10-04

Follow-up to `UI_POLISH_2026-10-04.md`, approved after the owner's phone review of the protected Preview. Work remains on `codex/payment-foundation`; `main`, production, payment settings and database configuration are not part of this change.

## Visual scope

- Three columns and the existing ingredient illustrations, bowl, navigation and summary remain intact.
- Artwork is 56px rather than 64px; Hebrew names remain 13px with room for two lines.
- The information control moves to the upper corner. Its visible glyph is 20px, with an independent 44×44px touch target.
- Surcharges occupy the opposite upper corner. Numeric direction remains isolated with `bdi`; no RTL positioning reversal.
- The dedicated information footer is removed. Every tested ingredient card measures 134px rather than approximately 166px in the first polish pass (about 19% shorter).
- Idle cards have quiet dark-green surfaces, thin borders and restrained shadows. Selected cards use a gold outline and a checkmark without changing border width or lifting the card.
- Premium cards retain warm surfaces, with no continuous selected shimmer. Popularity remains available in the accessible name.

## Removal regression found during verification

The previous committed version called the undefined `setLastRemove` setter from both ingredient toggling and bowl-strip removal. Clicking a selected ingredient produced `ReferenceError: setLastRemove is not defined` and the page error state.

The two obsolete animation-setter calls were removed. Selection filtering, prices, limits, haptics and the bowl's existing selection-driven animation were preserved. A regression assertion and real browser checks cover both removal paths.

## Verification

- Regression suite: 216 passed, 0 failed.
- Typecheck passed. Lint: 0 errors, nine pre-existing warnings.
- Isolated optimized Next.js production build passed.
- Fresh Chromium mobile context: 320×568, 390×844 and 430×932.
- Thirteen geometry checks: vegetables (38 cards), protein (5), sauces (13), finishing (5), upgrades (10), selected premium state and reduced-motion editing.
- All measured cards are 134px tall, with a 1px border and a 44×44px information target. No name/information, price/information, price/artwork, visible information-glyph/artwork or name/artwork collisions; no clipped prices or document horizontal overflow.
- Information does not toggle selection. Space-key selection works without changing card height. Summary editing retains selections. Removal and re-addition work through both the ingredient card and the bowl strip.
- Final browser run: zero errors, no framework overlay, no attempted API writes. Only GET/HEAD API requests were allowed; no order or payment was submitted.

Local screenshots and the draft-only verification harness live in `.playwright-cli/compact-20261004/` (ignored). Remote build status and the exact published commit are recorded by Git and Vercel. Real-device/iOS review remains with the owner.

## Second spacing pass — after phone feedback

The owner preferred the compact version and requested a smaller box by trimming empty space around the artwork and name. This pass changes spacing only; no new artwork, ornamentation or builder restructuring.

- Card minimum height is 120px instead of 134px (about 10% shorter again). Artwork remains 56px, names 13px, and information targets 44×44px.
- Bottom padding is 6px instead of 8px. Name minimum height is 20px instead of 34px, removing the reserved empty second line while allowing longer names to wrap naturally.
- At 390px and 430px, all measured cards are 120px tall. At 320px, rows with longer two-line names can grow to 129.78px; no label is clipped or forced into a fixed height.
- All thirteen stage/viewport geometry checks passed again, with no control/artwork/price/name collisions or horizontal overflow. Screenshots of vegetables, upgrades and finishing were visually reviewed.
- Information remains independent of selection; keyboard selection, summary editing, card removal and bowl removal passed. Browser errors: zero. Attempted API writes: zero. No order or payment was submitted.
- Regression suite: 216 passed. Typecheck and the isolated optimized build passed. Lint has zero errors and the same nine pre-existing warnings.

Local screenshots and the read-only verification harness for this follow-up are in `.playwright-cli/snug-20261004/` (ignored). Publication stays on the feature branch's protected Preview; production and payment/database configuration remain untouched.
