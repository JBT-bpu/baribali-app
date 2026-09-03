# BariBali — Navigation Restructure Decision Record

> Historical decision record, refreshed 2026-09-03. The implemented state is in
> `MENU_FLOW_BRIEF.md`. This file records which recommendations were accepted,
> deferred or rejected so the same design debate does not restart from stale
> assumptions.

## Decision

Use a three-item customer navigation:

1. **בית** (`/home2`) — product cards and the only normal start of a new order.
2. **ההזמנות שלי** (`/orders`) — history, active status and reorder.
3. **האזור שלי** (`/profile`) — identity, sign-in/out and account/legal links.

There is no fourth **הזמנה חדשה** item because it duplicates the home screen.
There is no placeholder destination in the primary navigation.

## Accepted and implemented

- Removed the duplicate routes where **הזמנות** and **פרופיל** both opened the
  same profile page.
- Created a dedicated `/orders` view.
- Added **הזמן שוב** and **שנה והזמן**, using current catalog reconstruction
  rather than blindly replaying historical prices/items.
- Removed the dead search action and the `/favorites`, `/fresh`, `/top` and
  `/recommended` placeholder routes.
- Kept product selection on home instead of adding another order hub.
- Preserved guest-first ordering and optional Google identity.
- Added a latest-order shortcut on home for signed-in customers.

## Accepted in principle, only partly implemented

### Softer sign-in entry

The old full-screen welcome overlay inside `/home2` was removed. A dedicated
front door now lives at `/`, while internal navigation goes directly to
`/home2`. This prevents repeated interruption inside a session, but a signed-out
visitor who enters the root URL again still sees the door. Whether guest choice
should persist longer remains an open UX decision.

### Active-order hub

Home exposes the latest order for signed-in customers, and `/orders` links to
live tracking. A richer active-order module on home was not built; it should only
be added if it materially improves pickup behaviour rather than duplicating the
tracking screen.

## Deliberately deferred

### Builder unification

Combining the free-play hero and strict ingredient wizard is a core builder
rewrite, not a navigation tidy-up. It touches selection limits, required steps,
presets, combo badges, animations, reordering and product-specific validation.
It requires its own design, implementation and regression pass.

### Earlier pickup selection and home presets

Moving pickup time earlier or launching presets directly from home changes when
availability, opening-hours and catalog state are committed. These concepts stay
deferred until the builder/checkout structure is intentionally redesigned.

### Route-per-builder-step

The builder currently uses internal component state. Linkable routes or
back-button-aware steps could improve recovery and sharing, but require a plan
for draft persistence, validation and reorder hydration.

### Tortilla-specific catalog

The separate `TORTILLA_STEPS` data is currently unused. Activating it would
change the real menu and server pricing contract, so it needs explicit owner
approval and coordinated client/server tests rather than a visual-only change.

## Guardrails for the next UI pass

- Do not require an account or visually punish the guest path.
- Do not create a navigation item without a real destination and customer job.
- Keep order history, live status and account identity distinct.
- Never change displayed price/catalog rules without matching server authority.
- Treat payment, order acceptance and kitchen preparation as separate states.
- Preserve reduced-motion, keyboard/focus, safe-area and Hebrew RTL behaviour.
- Validate customer changes on a narrow phone and kitchen changes at 1920×1200
  plus the physical Lenovo.

## Recommended next sequence

1. Finish payment-return and order-tracking resilience without changing visual
   language.
2. Review the entire mobile journey for hierarchy, copy, tap targets and state
   recovery.
3. Test the kitchen board on its real display and tune only from observed issues.
4. Run a separate owner decision session for tortilla/catalog and builder
   restructuring.

