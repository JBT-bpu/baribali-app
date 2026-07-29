# BariBali — Project Brief

> **Purpose of this file**: a self-contained snapshot of the project for pasting into a different AI chat (or handing to a new collaborator) that has no access to the repo, git history, or prior conversations. Updated 2026-07-18 (previous version 2026-07-07 — see §6 for everything that changed since). Re-export this file whenever you want to bring outside insight back into Claude Code — just say so and it'll be regenerated from the live repo state. Two companion docs exist for a specific ongoing thread — a menu/navigation restructure discussion with an outside AI — and aren't repeated here: `MENU_FLOW_BRIEF.md` (screen/flow map) and `MENU_RESTRUCTURE_REPLY.md` (our response to that AI's proposal).

---

## 1. What this is

BariBali is a mobile-first, Hebrew (RTL) salad and tortilla builder for a **real restaurant** (not a demo/portfolio project). Customers pick a size, build their bowl/wrap ingredient by ingredient, submit an order with a pickup time, and pay online or at pickup. A kitchen-facing board shows live orders for staff to prepare and mark ready. Pre-launch — no real customer traffic yet, deployed on Vercel, auto-deploying from `main` on GitHub (`JBT-bpu/baribali-app`). **Production is currently still running in demo mode** — real Supabase/Hyp Pay credentials exist locally but haven't been added to Vercel's env vars yet, and `main`'s latest 3 commits (Google auth + home restructure) are merged locally but **not yet pushed** — see §6/§9.

## 2. Tech stack (current)

- **Framework**: Next.js 16 (App Router, Turbopack default)
- **Language**: TypeScript 6 (new files) + JSX (older builder components, untyped)
- **React**: 19
- **Styling**: Tailwind CSS v4 (CSS-first `@theme` tokens in `globals.css`) for new/migrated components; older components still use inline `S = {...}` style objects — both patterns coexist
- **Backend**: Supabase — **real project now connected** (Postgres + Auth). Service-role client for all API-route reads/writes; anon/publishable client used client-side only for auth session + inserts.
- **Auth**: Supabase Auth, Google OAuth provider — guest-first (see §4), no password/email signup flow
- **Payments**: **Hyp Pay is the real, primary provider** (same account as the shop's physical card terminal) — SIGN/VERIFY flow fully implemented server-side. Tranzila/YaadPay code remains in the repo as untested alternates.
- **Motion/UI libs**: `motion` (route transitions), `react-parallax-tilt` (card tilt/glare), `vaul` (bottom sheets), `canvas-confetti`, `lucide-react` icons, `zustand` (installed, still unused)
- **Fonts**: Heebo (UI) + Secular One (display/headings), self-hosted via `next/font/google`
- **PWA**: manifest (`src/app/manifest.ts`) implemented — installable/"Add to Home Screen"
- **Lint**: ESLint 9 flat config (`eslint.config.mjs`), script is `eslint .`

No test framework, no CI pipeline (see §10).

## 3. Directory structure (current)

```
src/
├── app/
│   ├── home2/page.tsx           # Home: welcome-or-guest step, salad/tortilla product pick, size picker
│   ├── build/page.tsx           # Builder entry (wraps BariBaliBuilder)
│   ├── login/page.tsx           # Real Google sign-in page (guest link always present)
│   ├── profile/page.tsx         # Identity card + order history (signed-in), sign-in prompt (guest)
│   ├── order/[id]/              # Customer order-status page (Server wrapper + client view)
│   ├── kitchen/page.tsx         # Kitchen board — still NO real auth, see §7
│   ├── fresh/, top/, recommended/, favorites/  # "Coming soon" stubs — fresh/top/recommended are
│   │                                            # fully orphaned, zero inbound links anywhere
│   └── api/
│       ├── orders/                     # Create order (server-verified price + optional verified user_id), fetch, update status
│       ├── my/orders/                  # Signed-in user's order history (Bearer-token verified)
│       ├── payment/create, hyp/return, webhook   # Payment provider integration
│       ├── slots/                      # Pickup time-slot availability (Israel-local hours)
│       └── kitchen/orders/             # Kitchen board data feed
├── components/
│   ├── builder/                # BariBaliBuilder, SummaryView, MixingAnimation, DetailSheet, HeroBowlCard
│   ├── ui/bari/                # Design-system components: BariButton, BariPanel, BariModal, BariBadge, BariGlowBackground
│   └── ui/                     # ReviewsStrip, ParticleCanvas, ComingSoon, CatPopup, GoogleSignInButton
├── data/salad-data.js          # Ingredient catalog, prices, nutrition, combo rules, presets, SIZE_CONFIG
└── lib/
    ├── supabase.ts             # Anon + service-role Supabase clients, schema reference
    ├── auth.ts                 # Client-side auth: signInWithGoogle, useUser, getAccessToken, displayName/avatarUrl
    ├── pricing.ts               # Server-side canonical price computation (computeOrderTotal)
    ├── hypPay.ts                # Hyp Pay SIGN/VERIFY request builders
    ├── kitchenAuth.ts           # Shared-secret gate for kitchen endpoints — deterrent only, still not real auth
    └── confetti.ts              # Shared canvas-confetti wrapper
```

## 4. User flow (current — see `MENU_FLOW_BRIEF.md` for full detail)

```
/  →  /home2  (redirect)
```

**Guest-first is a deliberate, explicit product principle**: an account is never required to order, and where offered, it's presented as an equally-weighted option, never a gate.

1. **`/home2`**: signed-out visitors see a full-screen welcome step *every visit* (not just once — a deliberate choice) offering Google sign-in or "המשך כאורח" (continue as guest), equally prominent. Dismissing either way reveals: header (profile chip / logo), two big product cards (סלט salad, טורטיה tortilla), Google reviews strip, bottom nav.
2. Salad → in-page S/M/L size-picker overlay → `/build?size=<price>`. Tortilla → straight to `/build?type=tortilla` (single fixed price, no size step).
3. **`/build`**: `BariBaliBuilder` — step-by-step ingredient picker (differs slightly per product, see `MENU_FLOW_BRIEF.md` §5), combo badges, presets, live price, `HeroBowlCard` Lottie preview.
4. **Summary/checkout** (`SummaryView`, same route): ingredient recap, nutrition stats, notes, pickup-time picker, pay-now-vs-pay-at-pickup choice. Submit → `POST /api/orders` (server recomputes true price; attaches `user_id` from a verified Supabase token if signed in, `null` for guests) → Hyp Pay redirect (if paying now) or straight to a confetti confirmation screen.
5. **`/order/[id]`**: live-polling status page; document-title flash when ready while backgrounded.
6. **`/profile`**: signed-in users see an identity card and full order history (`/api/my/orders`); signed-out users see the same sign-in offer + guest link.
7. **`/kitchen`**: internal board, pickup-urgency columns, status-advance buttons. **Still no real login screen** — see §7.

## 5. Data model

`orders` table (Postgres via Supabase):

```sql
create table orders (
  id             uuid primary key default gen_random_uuid(),
  order_num      text not null,
  items          jsonb not null,
  total          integer not null,        -- server-computed, never client-trusted
  pickup_time    text,
  notes          text,
  size           text,
  status         text not null default 'waiting',       -- waiting | preparing | ready | collected
  payment_status text not null default 'pending',        -- pending | paid | paid_unverified | failed | pay_at_pickup
  user_id        uuid references auth.users(id) on delete set null,  -- null for guest orders
  created_at     timestamptz default now()
);
```

`user_id` is nullable and set **server-side only**, from a cryptographically verified Bearer access token — never client-claimed. This is the concrete mechanism behind "guest-first": ordering never requires the column to be populated.

`paid_unverified`: the payment webhook has no cryptographic signature verification configured yet, so webhook-confirmed payments land here instead of `paid`; the kitchen board treats it the same as `pay_at_pickup` (human confirms at pickup).

RLS: anon/publishable client can insert but not read orders (confirmed via live testing) — all reads/writes beyond insert go through API routes using the service-role client.

## 6. Recent history (condensed changelog)

**2026-07-04 to 07-07** (in the previous brief, condensed): security/correctness fixes (server-side price recomputation closing a payment-tampering hole, `paid_unverified` status, RLS lockdown, timezone fix on pickup slots), UX bug fixes, dead-code/repo-hygiene cleanup, a full dependency upgrade (TS 5→6, ESLint 8→9, React 18→19, Next.js 14→16, Tailwind 3→4 — done as its own verified-pixel-identical pass, never mixed with visual work), a new visual design system (tokens, self-hosted Hebrew type, `Bari*` component library), a motion/celebration pass, and PWA manifest/installability.

**2026-07-07 to 07-13** (real backend + payments):
- **Real Hyp Pay integration**: server-side SIGN (create payment) + VERIFY (confirm redirect callback) flow, replacing the placeholder. Hyp Pay confirmed as the actual processor (same account as the shop's physical terminal, identified from on-site hardware).
- **Real Supabase project connected**: live URL/keys wired in; order creation, retrieval, and RLS enforcement all verified working end-to-end via live testing.
- **Design/polish review round 2**: fixed a real UX inconsistency (single-tap salad card, matching tortilla), a typography pass (raised customer-facing text off 6–8px down to a 10px floor, boxes grown to fit rather than text shrunk to fit), a performance pass (compositor-friendly glow effects, sprite-based particle rendering instead of per-frame `shadowBlur`), and a juice/accessibility pass (staggered celebration timing, price count-up animation, order-ready tab-title flash, JS-driven `prefers-reduced-motion` handling to close a gap CSS animations already had covered).
- All of the above consolidated into one `main` history and **pushed to GitHub/Vercel** — this also surfaced that production had been 18 commits stale (never auto-deployed) and fixed the gap.

**2026-07-13 to 07-18** (guest-first identity):
- **Google sign-in (guest-first) + restructured home flow**: Supabase Auth wired in client-side (`src/lib/auth.ts`), a shared `GoogleSignInButton`, real `/login` and `/profile` pages (previously stubs), an `/api/my/orders` endpoint, and `user_id` added to the `orders` table/insert path (server-verified token, never client-claimed). Home (`/home2`) restructured: the old swipe carousel (tortilla/salad/login as three equal cards) replaced with a welcome-or-guest step plus two side-by-side product cards; login is no longer a "product," it lives in the header chip, a bottom-sheet, and the welcome step.
- One-time external setup completed: Google Cloud Console OAuth client created, Supabase Authentication → Providers → Google configured and confirmed live (`google: true` in the project's public auth settings).
- Merged to `main` and later pushed to production.

**2026-07-18 to 07-22** (post-launch-prep checkpoint — all pushed to `main`/Vercel):
- **PR #1 fixes ported**: an independent parallel PR had branched off the same commit; cherry-picked its genuinely good, non-conflicting fixes and left out its home2/auth/tortilla changes (which would have regressed the guest-first work). Real bug fixed: an unlayered `* { padding: 0 }` reset in `globals.css` was silently zeroing every Tailwind padding utility app-wide (beat every utility per CSS cascade-layers spec) — wrapped in `@layer base`. Also a builder CTA-crop fix, `BariButton` depth polish, and a floating glassmorphic `BariBottomNav`.
- **Real `/kitchen` authentication**: staff password (server-only `KITCHEN_PASSWORD`) → httpOnly HMAC-signed session cookie; server-component page guard + cookie-verifying API routes. Replaced the `NEXT_PUBLIC_` header "secret."
- **"Order again"**: reorder / reorder-with-changes from `/profile` history (`src/lib/reorder.ts` + builder reconstruction). Detects product by base price, not item ids — see the TORTILLA_STEPS note below.
- **Security hardening**: in-memory rate limiter (`src/lib/rateLimit.ts`) on orders/payment-create/slots/kitchen-login; Hebrew `/privacy` + `/terms` pages (with business-detail placeholders still to fill).

**Non-obvious code fact (worth knowing before menu-restructure work):** `TORTILLA_STEPS` in `salad-data.js` is imported but **never used** — `BariBaliBuilder` renders the salad step set (`STEPS` minus "finish") for tortillas too. So a "tortilla" order today is salad ingredients on a tortilla base price (42); the only thing distinguishing it from a salad is that base price.

Git history is authoritative for exact detail — commit messages are descriptive.

## 7. Security posture

**Fixed:**
- Server-side price recomputation (can't tamper with order total)
- Payment webhook can't blindly mark orders `paid` (`paid_unverified` + amount/state checks)
- Real Hyp Pay SIGN/VERIFY (server-side, cryptographically checked) replacing the earlier placeholder
- Supabase RLS confirmed correct via live testing (anon can insert, cannot read)
- `user_id` on orders is server-verified from a Bearer token, never client-claimed
- **`/kitchen` has real access control**: a server-only shared staff password (`KITCHEN_PASSWORD`) exchanged for an httpOnly, HMAC-signed session cookie. The server component gates the page before any board markup ships; the order API routes verify the same cookie. Replaces the old `NEXT_PUBLIC_` header "secret" that shipped in the browser bundle. Unset = board runs open (local/demo); **set on Vercel in production** — verified live: `/kitchen` serves the login screen and `/api/kitchen/orders` returns 401 to anonymous requests.
- **Rate limiting** (`src/lib/rateLimit.ts`) on orders (12/min), payment-create (12/min), slots (40/min), kitchen-login (8/min) — 429 + Retry-After. In-memory/per-process (approximate on serverless); webhook intentionally unthrottled so gateway callbacks aren't dropped.
- **Privacy/terms pages exist** (`/privacy`, `/terms`) — drafted, but contain `[bracketed]` business-detail placeholders that must be filled before launch.

**Still open — biggest gaps:**
- Legal pages have unfilled placeholders (business/legal name, ח.פ., address, contact, VAT-inclusive?, cancellation/refund policy, allergen statement, jurisdiction, effective date, retention, min age).
- Rate limiting is per-process, not distributed — a determined attacker across instances/cold-starts isn't hard-capped. Fine as a deterrent for one small shop; a hard limit needs a shared store (Vercel KV / Upstash).
- Kitchen auth is a single shared password, not per-user staff accounts (adequate for one small shop).
- Payment webhook still has no cryptographic signature verification (`paid_unverified` stopgap) — blocked on a gateway verification credential.
- A live Google OAuth client-secret JSON file was briefly sitting unignored in the repo working directory — now gitignored (`/google/`), but worth deleting locally since Supabase already has the credentials saved.

## 8. Working agreements (how this project is collaborated on)

- **Never mix a dependency/framework upgrade with a visual redesign in the same pass.**
- **No new dependency without a specific, named purpose.**
- **One commit per logical phase**, descriptive messages, for bisectability — no test suite exists, so git history + manual smoke-testing is the safety net.
- **Dedicated feature branches off `main`**, verify build/typecheck/lint before every commit, **never merge to `main` or push without explicit go-ahead**.
- **Guest-first is non-negotiable**: an account must never be required to order; where offered, it's an equally-weighted option, never a gate or a smaller/secondary link.
- **A gamified trading-card/gacha loyalty feature is real future work** (GoldWallet currency, pack-opening reveals, card rarities) but is **explicitly deferred** — nothing built anticipating it until it gets its own planning session.

## 9. Pending manual actions / open decisions

`main` is pushed and in sync with `origin` as of the 2026-07-22 checkpoint; production auto-deploys from it but is **still in demo mode** (Vercel env vars not set). Remaining:

1. **Fill the `[bracketed]` placeholders in `/privacy` and `/terms`** before launch (business/legal name, ח.פ., address, contact email/phone, VAT-inclusive?, payment provider name, cancellation/refund policy, allergen statement, jurisdiction city, effective date, min age, retention period).
2. ~~Set a real `KITCHEN_PASSWORD` on Vercel~~ — **done**; verified live (login screen served, `/api/kitchen/orders` 401 anonymously).
3. Add real Supabase/Hyp Pay env vars to **Vercel** to take production out of demo mode.
4. Production domain — not yet decided.
5. Hyp Pay **production** credentials (`HYP_MASOF`/`HYP_KEY`/`HYP_PASSP`) — integration built + tested against error paths; live credentials not yet arrived.
6. Delete the local `google/client_secret_*.json` file (gitignored, no longer needed — Supabase has the values).
7. Menu/navigation restructure (with an outside AI) — see `MENU_FLOW_BRIEF.md` / `MENU_RESTRUCTURE_REPLY.md`. Phase-1 "order again" is now **done**; remaining phase-1 (welcome-screen softening, nav dedup, dead-route cleanup) and the separately-planned builder-UI unification are not yet built.

## 10. Improvement backlog (not started, no priority commitment)

- **Testing/CI**: zero automated tests, no CI. At minimum, tests around `computeOrderTotal` and webhook status transitions would catch payment-logic regressions.
- **Observability**: no error tracking, no structured logging on payment/webhook routes.
- **Ops**: no admin/reporting view (sales, popular combos); schema/policy changes are ad hoc dashboard SQL rather than tracked migrations; unconfirmed whether Supabase backups/PITR are enabled.
- **Code quality**: `zustand` installed but unused — a `BariBaliBuilder.jsx` state-lifting refactor is on the table whenever there's appetite.
- **SEO**: no `robots.ts`/`sitemap.ts`, no Open Graph metadata.
- Kitchen board still has no reorder/search/other convenience features beyond the basics.

## 11. Environment variables

Canonical list in `.env.example` at repo root. Categories: Supabase (URL/publishable/secret keys), kitchen board secret, payment provider selection + per-provider credentials (Tranzila/YaadPay/Hyp), WhatsApp contact number, Google Places API (reviews strip), app base URL (payment redirects).
