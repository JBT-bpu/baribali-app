# BariBali — Current Screen and Order Flow

> Current map for design, UX and engineering work. Updated 2026-09-03 against
> `codex/payment-foundation`. Production still runs `main` at `d44fe06`; branch-only
> payment-ledger changes are not deployed and have not been applied to Supabase.

## Product principles

- Hebrew and RTL first.
- A guest can complete the same order as a signed-in customer. Google sign-in is
  optional and exists for identity, order history and reorder.
- The customer experience is mobile-first. The kitchen board is designed for a
  desktop/touch Lenovo display.
- The server owns catalog items, prices, discounts, opening hours, pickup-slot
  validity, identity attachment and payment settlement. Browser values are not
  authoritative.
- Orders are accepted Sunday–Thursday, 09:00–16:00 Israel time. There is no
  pre-ordering while the shop is closed; a live kitchen override can close or
  reopen the shop.

## Screen inventory

| Route | Current purpose | Notes |
|---|---|---|
| `/` | Guest-or-Google front door | Signed-in users continue automatically. Guest is a full, unpunished choice. |
| `/home2` | Customer home | Orderable salad card, locked coming-soon cards, size picker, closed state, latest-order shortcut, reviews and bottom navigation. |
| `/build?type=salad\|tortilla&size=<S\|M\|L>` | Builder and summary | Ingredient wizard and checkout live in one client component tree. |
| `/order/[id]` | Live order tracking | Polls status, shows payment state and flashes the tab title when ready in the background. |
| `/orders` | Order history | Signed-in history, status links, **הזמן שוב** and **שנה והזמן**. Guests receive a clear sign-in/return path. |
| `/profile` | Account area | Identity, Google sign-in/sign-out, link to orders and legal links. |
| `/login` | Dedicated sign-in | Google sign-in with an explicit guest path. |
| `/kitchen` | Staff board | Password-to-httpOnly-session gate, queue tabs, one active work surface, checks, urgency, payment handoff and undo. `?sim=1` exposes rehearsal controls. |
| `/admin` | Local manager tools | Prices, discounts and customers. Password-gated and intentionally inert in production. |
| `/privacy`, `/terms`, `/cancellations`, `/allergens`, `/accessibility`, `/contact` | Legal and information | Some business-detail placeholders still require owner input before launch. |

The old `/favorites`, `/fresh`, `/top` and `/recommended` stubs are gone.

## Primary customer journey

```text
/ → /home2 → /build → summary → payment or pay-at-pickup → /order/[id]
                         ↓
                      /orders → reorder
```

1. **Front door (`/`)**
   - A signed-out visitor sees the club/Google option and an equally viable
     **המשך כאורח** action.
   - A signed-in visitor continues to `/home2`.
   - Internal home links target `/home2`, so a guest is not interrupted again
     while moving through the app. Returning to the root URL is a new entry and
     presents the door again.

2. **Home (`/home2`)**
   - The header profile chip opens `/profile` for members and a light sign-in
     sheet for guests.
   - Salad opens the S/M/L size picker: 750, 1000 or 1500 ml.
   - Tortilla is visibly locked as coming soon. Its fixed-price
     `/build?type=tortilla` deep link still works in code, but is not offered by
     the current home UI.
   - A confirmed closed state explains when the shop reopens. It does not yet
     disable the salad card; checkout disables submission and the server is the
     final enforcement boundary.
   - Signed-in customers can see and repeat their latest order.

3. **Builder (`/build`)**
   - Salad has a free-play bowl entry (`step === -1`), followed by vegetables,
     one included protein, up to two sauces, mixing/bread and optional upgrades.
   - Tortilla currently uses the salad `STEPS` array with only `finish` removed.
     Although a separate `TORTILLA_STEPS` catalog exists and is imported, it is
     not rendered. This is an implementation mismatch, not a design promise.
   - Both products share live preview, running price, presets, combo badges,
     ingredient detail sheets and per-step validation.
   - The steps are internal state, not linkable routes. Browser Back cannot move
     through individual ingredient steps.

4. **Summary and checkout (inside `/build`)**
   - Shows the ingredient recap, nutrition, notes and pickup-slot picker. The
     payment-choice control appears only in demo mode; with real Supabase a
     configured gateway proceeds online automatically, otherwise the server
     records pay-at-pickup.
   - `POST /api/orders` rebuilds canonical item snapshots and total, validates
     size/product/discount, opening hours and pickup time, and optionally links a
     server-verified Supabase user.
   - Pay at pickup/demo: the recorded order moves to the order-seal confirmation.
   - Pay online: `/api/payment/create` creates or reuses the Hyp checkout attempt,
     then redirects to the hosted page. Hyp's browser return reaches
     `/api/payment/hyp/return`, which performs server-to-server APISign VERIFY
     before an approved result can become `paid`.
   - A generic legacy Tranzila/YaadPay webhook may only produce
     `paid_unverified`; it rejects Hyp payloads.

5. **Confirmation and tracking**
   - `OrderSealScreen` is the transition from accepted order to confirmation.
   - `/order/[id]` is the durable destination for waiting → preparing → ready →
     collected.
   - Payment states are visible independently of kitchen preparation state.

6. **History and reorder**
   - `/orders` lists the newest signed-in orders and opens live status on card
     tap.
   - **הזמן שוב** reconstructs and continues the previous order.
   - **שנה והזמן** restores available choices into the builder for editing.
   - Missing/renamed historic ingredients are handled by the reorder utility
     rather than trusted as current catalog items.

## Navigation

The shared bottom navigation has three real, non-duplicated destinations:

| Label | Route | Responsibility |
|---|---|---|
| בית | `/home2` | Start an order and see the latest-order shortcut. |
| ההזמנות שלי | `/orders` | History, status and reorder. |
| האזור שלי | `/profile` | Identity, sign-in/out and legal/account links. |

The builder, tracking and staff screens intentionally use task-specific back or
exit controls instead of displaying the customer dock.

## Kitchen journey

1. Staff authenticate at `/kitchen` when `KITCHEN_PASSWORD` is configured.
2. Queue tabs group orders by urgency; one order opens into the active work
   surface.
3. Staff check ingredients and advance preparation deliberately. Network/race
   protections prevent stale responses and rapid repeated actions from silently
   jumping state.
4. Paid, legacy-unverified and pay-at-pickup states remain visually distinct.
   Unverified/register payments require explicit confirmation before handoff.
5. Undo exists for operational mistakes. Rehearsal data is isolated behind
   `?sim=1`.

## Completed restructure decisions

- Replaced the five-item/dead navigation with the three destinations above.
- Split order history out of profile into `/orders`.
- Added repeat and edit-and-repeat actions.
- Removed dead search/favorites/category stubs.
- Kept account optional throughout the order flow.
- Kept builder unification and early pickup/preset concepts out of the navigation
  pass because they change core ordering behaviour.

## Open flow and UX work

Safe to improve without a live database change:

- Recover cleanly when the browser returns from a hosted-payment page via Back or
  bfcache, without leaving a permanent sending overlay.
- Bound order-status polling with a timeout so one hung request cannot stop all
  future updates.
- Make the client-side submit lock synchronous to close same-tick double taps.
- Refresh shop/slot state after foregrounding across an opening-hours or capacity
  boundary.
- Decide whether the root front door should appear on every external root entry
  or remember a guest for longer.
- Test the full flow on narrow phones and the kitchen board on the physical
  Lenovo before making visual judgement calls.

Requires database design/migration and live-schema inspection first:

- Durable order-creation idempotency across abort/retry.
- Atomic pickup-slot capacity enforcement.
- Collision-proof, database-issued customer order numbers.

Product decisions that should get their own scoped pass:

- Whether to replace the current tortilla implementation with the unused
  tortilla-specific catalog.
- Whether to unify the salad free-play screen and strict wizard.
- Whether individual builder steps should become linkable/back-button-aware.
- Whether pickup time or quick presets should appear earlier in the journey.

## Sources of truth

- This file: screen ownership and customer/staff flow.
- `PROJECT_BRIEF.md`: broader system, operating state and backlog.
- `PAYMENT_FOUNDATION.md`: payment invariants and test-terminal checklist.
- `src/data/salad-data.js`, `src/lib/pricing.ts` and server routes: executable
  catalog, pricing and trust boundaries.
- Git history: exact implementation chronology.
