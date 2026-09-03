# BariBali — Salad & Tortilla Builder

## Project Overview

BariBali is a mobile-first, Hebrew (RTL) salad and tortilla builder for a real restaurant. Customers pick a size, build their bowl/wrap ingredient-by-ingredient, submit an order with a pickup time, and pay online (or at pickup). A kitchen-facing board shows live orders for staff to prepare and mark ready.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript + JSX
- **Styling**: Tailwind CSS v4 for newer components, alongside existing component-local inline styles and CSS keyframes.
- **Backend**: Supabase (Postgres + service-role API routes)
- **Payments**: Hyp Pay is the intended production provider; Tranzila and YaadPay remain legacy alternatives

## User Flow

```
/  →  /home2  →  /build  →  /order/[id]
```

1. **`/`** — guest-or-Google front door; signed-in members continue automatically to `/home2`.
2. **`/home2`** — product selector and latest-order shortcut for members. A fixed three-item customer dock stays available here and on `/orders` and `/profile`. When Google Places is configured, one attributed Google Maps review is shown; otherwise the same space contains a brand-owned product-info card. Salad is the currently orderable card and opens an in-page S/M/L picker; tortilla is visibly locked as coming soon, although its deep-link builder path still exists in code.
3. **`/build?size=<S|M|L>&type=salad|tortilla`** — renders `BariBaliBuilder`, a step-by-step ingredient picker (veggies → protein → sauces → finish → premium upgrades), with combo badges, presets, and a live-updating price. Tortilla currently reuses that salad step set with `finish` removed; the separate `TORTILLA_STEPS` catalog is not active.
4. The builder's summary screen (`SummaryView`) shows the assembled bowl, lets the customer pick a pickup time slot, add notes, and submit.
5. `POST /api/orders` records the server-validated order. Online orders then call `/api/payment/create`; pay-at-pickup/demo orders continue directly to confirmation.
6. After payment, the customer lands on **`/order/[id]`** — a live order-status page (polls the API for status updates).
7. **`/kitchen`** — an internal board showing today's active orders, grouped by pickup urgency, with a per-ingredient checklist and status-advance buttons.

## Directory Structure

```
src/
├── app/
│   ├── page.tsx                # Guest-or-Google front door
│   ├── home2/page.tsx          # Landing page
│   ├── build/page.tsx          # Builder entry (wraps BariBaliBuilder)
│   ├── order/[id]/page.tsx     # Customer order-status page
│   ├── kitchen/page.tsx        # Kitchen board
│   ├── login/, profile/        # Google auth + account area
│   ├── orders/                 # Signed-in history + reorder actions
│   ├── admin/                  # Local manager tools; inert in production
│   ├── privacy/, terms/, cancellations/, allergens/, accessibility/, contact/
│   └── api/
│       ├── orders/                    # Create order, fetch by id, update status
│       ├── payment/create, hyp/return, webhook  # Payment provider integration
│       ├── my/                        # Authenticated history + discount
│       ├── shop/                      # Opening-hours override
│       ├── slots/                      # Pickup time-slot availability (Israel-local hours)
│       └── kitchen/                    # Kitchen feed, login/logout, rehearsal
├── components/
│   ├── builder/                # BariBaliBuilder, SummaryView, OrderSeal, DetailSheet, HeroBowlCard
│   └── ui/                     # ReviewsStrip, GoldField, GoogleSignInButton
├── data/salad-data.js          # Ingredient catalog, prices, nutrition, combo rules, presets
└── lib/
    ├── supabase.ts             # Anon + service-role clients and demo/config detection
    ├── pricing.ts              # Server-side canonical price computation
    ├── kitchenAuth.ts          # HMAC session gate for kitchen endpoints
    └── hypPay.ts               # Hyp APISign SIGN/VERIFY client
```

## Environment Variables

See `.env.example` for the full list. Without Supabase variables the app uses
its in-memory demo store; real persistence and authentication require the
Supabase URL, publishable/anon key, and service-role key.

## Development

```bash
npm install
npm run dev
```

Access at: http://localhost:3000

## Build for Production

```bash
npm run build
npm start
```

## Known Gaps (as of this writing)

- Hyp browser returns use the dedicated APISign VERIFY route and may set
  `paid`. The generic Tranzila/YaadPay webhook remains unverified, sets
  `paid_unverified`, and intentionally rejects Hyp payloads.
- `/kitchen` is gated by a shared staff password (`KITCHEN_PASSWORD`, server-only) exchanged for an httpOnly session cookie. Set it in production; unset locally the board runs open. It's a single shared credential, not per-user staff accounts.

## RTL Support

The entire app is Hebrew-first with RTL layout throughout.

## Responsive Design

The customer journey is mobile-first, with responsive sizing, touch targets and safe-area handling. `/kitchen` is intentionally optimized for the shop's 1920×1200 touch display.

## License

Proprietary
