# BariBali — Salad & Tortilla Builder

## Project Overview

BariBali is a mobile-first, Hebrew (RTL) salad and tortilla builder for a real restaurant. Customers pick a size, build their bowl/wrap ingredient-by-ingredient, submit an order with a pickup time, and pay online (or at pickup). A kitchen-facing board shows live orders for staff to prepare and mark ready.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript + JSX
- **Styling**: Inline style objects (component-local `S = {...}` pattern) + CSS keyframe strings. Tailwind is configured but not yet in active use outside tooling.
- **Backend**: Supabase (Postgres + service-role API routes)
- **Payments**: Tranzila (default), with YaadPay/Hyp as alternate providers

## User Flow

```
/  →  /home2  (redirect)
```

1. **`/home2`** — landing page: swipeable card carousel (tortilla / salad / login), background particles, Google reviews strip.
2. Tapping **"בנה סלט"** (build salad) opens an in-page size picker (S/M/L), then navigates to:
3. **`/build?size=<ml>&type=salad|tortilla`** — renders `BariBaliBuilder`, a step-by-step ingredient picker (veggies → protein → sauces → finish → premium upgrades), with combo badges, presets, and a live-updating price.
4. The builder's summary screen (`SummaryView`) shows the assembled bowl, lets the customer pick a pickup time slot, add notes, and submit.
5. Submitting calls `/api/orders` (creates the order, price re-verified server-side) then `/api/payment/create` (builds a hosted payment-page redirect using the server-stored total).
6. After payment, the customer lands on **`/order/[id]`** — a live order-status page (polls the API for status updates).
7. **`/kitchen`** — an internal board showing today's active orders, grouped by pickup urgency, with a per-ingredient checklist and status-advance buttons.

## Directory Structure

```
src/
├── app/
│   ├── home2/page.tsx          # Landing page
│   ├── build/page.tsx          # Builder entry (wraps BariBaliBuilder)
│   ├── order/[id]/page.tsx     # Customer order-status page
│   ├── kitchen/page.tsx        # Kitchen board
│   ├── login/, profile/        # Stubs — no auth system exists yet
│   ├── fresh/, top/, recommended/, favorites/  # "Coming soon" placeholders
│   └── api/
│       ├── orders/                    # Create order, fetch by id, update status
│       ├── payment/create, webhook     # Payment provider integration
│       ├── slots/                      # Pickup time-slot availability (Israel-local hours)
│       └── kitchen/orders/             # Kitchen board data feed
├── components/
│   ├── builder/                # BariBaliBuilder, SummaryView, MixingAnimation, DetailSheet, HeroBowlCard
│   └── ui/                     # ReviewsStrip, ParticleCanvas, ComingSoon, CatPopup
├── data/salad-data.js          # Ingredient catalog, prices, nutrition, combo rules, presets
└── lib/
    ├── supabase.ts             # Anon + service-role Supabase clients, schema reference
    ├── pricing.ts              # Server-side canonical price computation
    └── kitchenAuth.ts          # Lightweight shared-secret gate for kitchen endpoints
```

## Environment Variables

See `.env.example` for the full list. At minimum you need a Supabase project (URL + anon key + service-role key) for anything beyond the frontend UI to work.

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

- No real authentication system — `/login` and `/profile` are stubs.
- Payment webhook has no cryptographic signature verification (no Tranzila verification credential configured yet); webhook-confirmed payments are marked `paid_unverified` and require a human check at pickup.
- `/kitchen`'s shared-secret gate (`NEXT_PUBLIC_KITCHEN_API_SECRET`) is a deterrent against opportunistic bots, not real access control.

## RTL Support

The entire app is Hebrew-first with RTL layout throughout.

## Mobile-Only Design

Optimized for mobile devices — responsive sizing, touch-friendly targets, safe-area insets for notches/home indicators.

## License

Proprietary
