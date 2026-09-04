# BariBali — Project Brief

> **Purpose of this file**: a self-contained snapshot for a collaborator with no repo or conversation history. Updated 2026-09-03. `MENU_FLOW_BRIEF.md` is the current screen/flow map; `MENU_RESTRUCTURE_REPLY.md` preserves the decision record behind the navigation work.

---

## 1. What this is

BariBali is a mobile-first, Hebrew (RTL) salad and tortilla builder for a **real restaurant** (not a demo/portfolio project). Customers build an order, choose a pickup time, and pay online or at pickup; staff work from a separate kitchen board. The app is pre-launch and deployed from the private GitHub repo `JBT-bpu/baribali-app`. `main` is pushed and live at `d44fe06`, but production still runs in demo mode because the real Supabase/Hyp variables are not set on Vercel. The current `codex/payment-foundation` work is local/unpushed; see §9.

## 2. Tech stack (current)

- **Framework**: Next.js 16 (App Router, Turbopack default)
- **Language**: TypeScript 6 (new files) + JSX (older builder components, untyped)
- **React**: 19
- **Styling**: Tailwind CSS v4 (CSS-first `@theme` tokens in `globals.css`) for new/migrated components; older components still use inline `S = {...}` style objects — both patterns coexist
- **Backend**: Supabase (Postgres + Auth). Database reads/writes go through server API routes using the service-role client. The browser anon/publishable client is used for Auth only; public database roles have no order policies.
- **Auth**: Supabase Auth, Google OAuth provider — guest-first (see §4), no password/email signup flow
- **Payments**: Hyp is the intended primary provider. Hosted-page SIGN and server-to-server APISign VERIFY are implemented with server-held credentials. The durable attempt/event ledger is still an unapplied, unmerged migration; a real test-terminal round trip remains required. Tranzila/YaadPay code remains as legacy alternatives.
- **Motion/UI libs**: `motion` (route transitions), `react-parallax-tilt` (card tilt/glare), `vaul` (bottom sheets), `canvas-confetti`, `lucide-react` icons, `zustand` (installed, still unused)
- **Fonts**: Heebo (UI) + Secular One (display/headings), self-hosted via `next/font/google`
- **PWA**: manifest (`src/app/manifest.ts`) implemented — installable/"Add to Home Screen"
- **Lint**: ESLint 9 flat config (`eslint.config.mjs`), script is `eslint .`

There are 187 focused Node/`tsx` regression tests covering Hyp, settlement and migration invariants, pricing/order authority and idempotency, product availability/reorder safety, atomic pickup capacity, Israel-day kitchen filtering, environment/configuration guardrails, hard-reload checkout recovery, generic-webhook rejection and concurrency, kitchen controls/simulation, public legal-copy guardrails and critical customer-flow/source-trust invariants. GitHub Actions runs locked install, typecheck, lint, the focused suite and a production build for pull requests and `main` pushes.

## 3. Directory structure (current)

```
src/
├── app/
│   ├── page.tsx                 # Guest-or-Google front door
│   ├── home2/page.tsx           # Home: product pick, size picker, last-order shortcut, bottom nav
│   ├── build/page.tsx           # Builder entry (wraps BariBaliBuilder)
│   ├── login/page.tsx           # Real Google sign-in page (guest link always present)
│   ├── profile/page.tsx         # Identity/account area
│   ├── orders/page.tsx          # Signed-in history + reorder actions
│   ├── order/[id]/              # Customer order-status page (Server wrapper + client view)
│   ├── kitchen/                 # Password-gated kitchen login + board
│   ├── admin/                   # Local manager tools; disabled in production by config
│   ├── privacy/, terms/, cancellations/, allergens/, accessibility/, contact/
│   └── api/
│       ├── orders/                     # Create order (server-verified price + optional verified user_id), fetch, update status
│       ├── my/orders/                  # Signed-in user's order history (Bearer-token verified)
│       ├── payment/create, hyp/return, webhook   # Payment provider integration
│       ├── slots/                      # Pickup time-slot availability (Israel-local hours)
│       ├── kitchen/                    # Kitchen feed, session, rehearsal
│       └── shop/                       # Live open/closed override
├── components/
│   ├── builder/                # BariBaliBuilder, SummaryView, OrderSeal, DetailSheet, HeroBowlCard
│   ├── ui/bari/                # Design-system components: BariButton, BariPanel, BariModal, BariBadge, BariGlowBackground
│   └── ui/                     # ReviewsStrip, GoldField, GoogleSignInButton
├── data/salad-data.js          # Ingredient catalog, fallback prices, combo rules, presets, SIZE_CONFIG
└── lib/
    ├── supabase.ts             # Browser publishable/anon client only
    ├── supabaseConfig.ts       # Client-safe configured/demo/misconfigured resolver
    ├── supabaseServerConfig.ts # Server env resolver, including secret/service-role key
    ├── serverSupabase.ts       # Strict server-only admin client; no anon fallback
    ├── auth.ts                 # Client-side auth: signInWithGoogle, useUser, getAccessToken, displayName/avatarUrl
    ├── pricing.ts               # Server-side canonical price computation (computeOrderTotal)
    ├── hypPay.ts                # Hyp Pay SIGN/VERIFY request builders
    ├── kitchenAuth.ts           # Shared password → httpOnly HMAC session gate
    └── confetti.ts              # Shared canvas-confetti wrapper
```

## 4. User flow (current — see `MENU_FLOW_BRIEF.md` for full detail)

```text
/  →  /home2
```

**Guest-first is a deliberate, explicit product principle**: an account is never required to order, and where offered, it's presented as an equally-weighted option, never a gate.

1. **`/`**: signed-out visitors see the guest-or-Google front door on each external entry; signed-in members continue to `/home2`. Internal navigation targets `/home2`, so guests are not repeatedly gated mid-session.
2. **`/home2`**: product selector, closed notice, latest-order shortcut for signed-in members, one fully attributed review supplied by Google Maps when configured (otherwise a clearly brand-owned product-info card), and a three-item bottom nav (`/home2`, `/orders`, `/profile`). Salad is the currently orderable card and opens the S/M/L picker. Tortilla is locked as coming soon from the same availability switch enforced by the builder route and API.
3. **`/build`**: `BariBaliBuilder` — step-by-step ingredient picker, combo badges, presets, live price and Lottie preview. Unavailable product deep links stop at a branded coming-soon screen before builder state mounts. Dormant tortilla code reuses `STEPS` minus `finish`; the imported `TORTILLA_STEPS` catalog is not rendered.
4. **Summary/checkout** (`SummaryView`, same route): ingredient recap, an honest composition overview, notes and live pickup slots. Exact nutrition is intentionally withheld until weighed recipes are validated. The payment-choice control is demo-only. With real Supabase, a configured gateway proceeds online automatically; without a configured gateway the server records pay-at-pickup. `POST /api/orders` rebuilds the canonical item snapshots and price before either branch.
5. **`/order/[id]`**: live-polling status page; document-title flash when ready while backgrounded.
6. **`/orders` / `/profile`**: history and reorder live on `/orders`; identity, sign-out and legal links live on `/profile`. Both preserve a clear guest path.
7. **`/kitchen`**: password-gated queue tabs plus one active work surface, ingredient checks, urgency/alerts, explicit payment handoff and undo. Rehearsal controls are exposed only with `?sim=1`.

## 5. Data model

`orders` table (Postgres via Supabase):

```sql
create table orders (
  id             uuid primary key default gen_random_uuid(),
  order_num      text not null unique default ('BB-' || nextval('orders_order_num_seq')),
  items          jsonb not null,
  total          integer not null,        -- server-computed, never client-trusted
  pickup_time    text,
  notes          text,
  size           text,
  status         text not null default 'waiting',       -- waiting | preparing | ready | collected
  payment_status text not null default 'pending',        -- pending | paid | paid_unverified | failed | pay_at_pickup | no_payment_required
  discount_code  text,
  discount_amount integer,
  user_id        uuid references auth.users(id) on delete set null,  -- null for guest orders
  created_at     timestamptz default now()
);
```

`user_id` is nullable and set **server-side only**, from a cryptographically verified Bearer access token — never client-claimed. This is the concrete mechanism behind "guest-first": ordering never requires the column to be populated.

`supabase/migrations/20260903120000_order_submission_idempotency.sql` adds a
server-only `order_creation_requests` ledger and `create_order_idempotent` RPC.
Before an order exists, the browser reuses one high-entropy key for the same
semantic order intent for 30 minutes. The RPC claims that key and creates the order in one transaction;
equal retries return the original order and a changed intent with the same key
returns 409. The ledger is separate from `orders` so kitchen/customer
`select('*')` reads never expose the key or fingerprint. The route fails closed
with 503 if the migration/RPC is unavailable; there is no unsafe direct-insert
fallback. Before the first request, the browser also keeps the exact body in
tab-scoped `sessionStorage`; after order creation it replaces that ambiguity
with the durable order ID and payment idempotency key for the rest of the tab
session, because an existing hosted page may remain chargeable. A hard reload
therefore offers an explicit retry of the same request or payment and locks
mutable checkout choices until that earlier attempt is resolved.

`supabase/migrations/20260903200310_order_capacity_and_numbering.sql`
makes order numbering database-owned and adds the server-only
`order_pickup_allocations` ledger. Each Israel service date + canonical
five-minute pickup time has five unique positions. `create_order_idempotent`
claims one before inserting the order, so concurrent request six rolls back and
returns `PICKUP_SLOT_FULL` without consuming an order number or idempotency key.
Allocations are deliberately immutable across payment/kitchen status until Hyp
provides safe hosted-page expiry/cancellation semantics. Normal service requires
a slot the UI could have offered; only a staff-forced opening with no schedule
slots may coordinate pickup at the counter. `SIM-…` rehearsal orders are exempt.

`paid_unverified` is a legacy Tranzila/YaadPay generic-webhook state. Hyp browser returns use APISign VERIFY and approved results become `paid`. The kitchen renders `paid_unverified` in amber and requires an explicit register confirmation before handoff.

`supabase/migrations/20260902184747_payment_foundation.sql` adds
`orders.current_payment_attempt_id`, `orders.payment_status_updated_at`,
`payment_attempts`, `payment_events`, and the payment RPCs. This is the target
schema on `codex/payment-foundation`; it has **not** been applied to the live
Supabase project yet.

`shop_state` table (added 2026-08-08) — the live open/closed override:

```sql
create table shop_state (
  id         smallint primary key default 1 check (id = 1),   -- single row
  override   text check (override in ('open','closed')),      -- null = follow the schedule
  note       text,
  updated_at timestamptz not null default now()
);
```

The regular week — **five trading days, Sunday to Thursday, 9:00–16:00**
(owner's decision 2026-08-11; Friday previously traded to 14:00 and is now shut
with Saturday) — is **config in code**, `src/lib/shopHours.ts`, because it
changes rarely. This table is the other half: "we are closed right now",
toggled from the kitchen board via `/api/shop`, taking effect immediately
without a deploy. Production order and slot routes fail closed if this row
cannot be read; they never guess that the kitchen is open during an outage.

**No customer pre-ordering** (same decision): the schedule accepts orders only
during trading hours. `pickupSlots` still clamps its first slot to opening time
so the pure function never names an earlier pickup. That path becomes reachable
only when staff explicitly force the shop open early; the customer must still
choose one of those displayed slots. Section 9 of `scripts/verify-hours.ts`
holds the normal-schedule rule against accidental pre-ordering.

**All times are Israel time, derived via `Intl` and never read off the process
clock** (`shopParts`). Vercel's functions run in UTC — three hours behind Israel
in summer — so `now.getHours()` had the shop refusing every order from 09:00 to
12:00 and accepting them until 19:00. In the browser the same call read the
customer's own timezone. Fixed 2026-08-11; the harness now builds its fixtures
as real Israel instants so it can catch a recurrence on any machine.

**RLS (corrected 2026-08-08).** The order data path has no public policies:
`anon` and `authenticated` cannot read or write orders directly, and all
database work goes through server API routes. Re-run the database/security
advisors after applying any new migration; do not infer the live schema from a
local SQL file.

This section previously claimed *"anon can insert but not read orders (confirmed
via live testing)"* and described that as correct. It was not. `orders` carried
`INSERT TO public WITH CHECK (true)`, and the anon key is public by design — it
ships in the browser bundle — so anyone could POST straight to
`/rest/v1/orders` with any `total`, `status` and `payment_status`, bypassing the
server-side price recomputation, the price-mismatch check, the rate limiter and
opening hours in one request. The policy was dropped (`supabase/002_orders_rls.sql`);
re-probing with the anon key now returns 42501. **The lesson worth keeping: the
brief's reassurance is what stopped anyone looking again.**

## 6. Recent history (condensed changelog)

**2026-07-04 to 07-07** (in the previous brief, condensed): security/correctness fixes (server-side price recomputation closing a payment-tampering hole, `paid_unverified` status, RLS lockdown, timezone fix on pickup slots), UX bug fixes, dead-code/repo-hygiene cleanup, a full dependency upgrade (TS 5→6, ESLint 8→9, React 18→19, Next.js 14→16, Tailwind 3→4 — done as its own verified-pixel-identical pass, never mixed with visual work), a new visual design system (tokens, self-hosted Hebrew type, `Bari*` component library), a motion/celebration pass, and PWA manifest/installability.

**2026-07-07 to 07-13** (real backend + payments):
- **Hyp integration baseline**: server-side SIGN (create payment) + APISign VERIFY (confirm browser return) flow, replacing the placeholder. Hyp is tied to the shop's physical-terminal account.
- **Real Supabase project connected in the development environment**: order creation, retrieval, and RLS enforcement were verified end-to-end. The current Vercel deployment does not have those real variables and therefore still uses the demo store.
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
- **Security hardening**: in-memory rate limiter (`src/lib/rateLimit.ts`) on orders/payment-create/slots/kitchen-login; Hebrew legal/info pages that keep owner/legal follow-ups out of customer-visible copy.

**2026-08-08 to 09-03**:
- RLS lockdown, server-enforced opening hours, Israel-time fixes, live shop override, customer closed-state and the five-day Sunday–Thursday week shipped to `main`.
- The kitchen board became a queue-tab/active-ticket work surface with real login, audio readiness, rehearsal mode, explicit payment handoff, undo and network/race hardening.
- `codex/payment-foundation` adds durable order-submission, pickup-allocation and Hyp attempt/event ledgers, database-owned order numbers, idempotent order and checkout-page creation, immediate transaction-`Id` capture, strict settlement/replay checks and focused tests. It remains unpushed and its four forward migrations are unapplied.
- Local demo shop overrides now use process-global state, matching the demo order store, so the customer/kitchen `/api/shop` bundle and `/api/orders` enforce the same manual open/closed decision. It remains intentionally non-durable outside a single development process.

**Non-obvious code fact (worth knowing before menu-restructure work):** tortilla is currently fail-closed at the home card, `/build` boundary, server pricing and order API. Its dormant builder uses `STEPS` minus "finish" and `TORTILLA_STEPS` remains unused. Historic orders still lack immutable product identity; reorder infers a recognized current product from the stored base price and disables unknown/stale values. Add `product_type` (preferably `size_ml` too) before enabling tortilla so later price changes or collisions cannot misclassify history.

Git history is authoritative for exact detail — commit messages are descriptive.

## 7. Security posture

**Fixed:**
- Server-side price recomputation (can't tamper with order total)
- Payment webhook can't blindly mark orders `paid` (`paid_unverified` + amount/state checks)
- Hyp hosted-page SIGN plus server-to-server APISign VERIFY using server-held credentials, replacing the earlier placeholder
- **Supabase RLS actually locked down (2026-08-08)** — all three public tables have RLS enabled with **no policies**; anon and authenticated get nothing. This replaces an earlier entry that called the configuration correct: `orders` had a permissive `INSERT TO public` policy, and since the anon key ships in the browser bundle, anyone could create orders directly against PostgREST with any total and `payment_status: 'paid'`, bypassing every control in `POST /api/orders`. Verified before and after with the anon key (22P02 → 42501).
- **Opening hours are enforced server-side (2026-08-08)** — `pickup_time` previously went from the request body into the database unread, so an order could be placed at 3am for 4am and would be on the kitchen board when staff arrived. `POST /api/orders` now rejects orders placed while closed, missing a required slot, using an off-grid/invented time, or selecting outside hours (409). The exhaustive `scripts/verify-hours.ts` harness checks that every slot visible during real or staff-forced opening is accepted by the server.
- **`paid_unverified` is visually distinct on the kitchen board** — it is amber and the handoff action explicitly requires checking the register. Approved Hyp VERIFY returns use `paid`; `paid_unverified` remains a legacy generic-webhook state.
- `user_id` on orders is server-verified from a Bearer token, never client-claimed
- **`/kitchen` has real access control**: a server-only shared staff password (`KITCHEN_PASSWORD`) exchanged for an httpOnly, HMAC-signed session cookie. The server component gates the page before any board markup ships; the order API routes verify the same cookie. Replaces the old `NEXT_PUBLIC_` header "secret" that shipped in the browser bundle. Unset = board runs open (local/demo); **set on Vercel in production** — verified live: `/kitchen` serves the login screen and `/api/kitchen/orders` returns 401 to anonymous requests.
- **Rate limiting** (`src/lib/rateLimit.ts`) on orders (12/min), payment-create (12/min), slots (40/min), kitchen-login (8/min) — 429 + Retry-After. In-memory/per-process (approximate on serverless); webhook intentionally unthrottled so gateway callbacks aren't dropped.
- **Privacy/terms pages exist** (`/privacy`, `/terms`) as customer-facing working drafts. Internal editor placeholders were removed from every public legal/info page; owner/legal approval and the missing registered-business facts remain launch tasks.

**Still open — biggest gaps:**
- Legal pages still require owner/legal verification of the registered entity name/number, address/contact facts, VAT treatment, cancellation/refund policy, allergen statement, jurisdiction, effective date, retention, minimum age and accessibility contact/audit details. These are tracked here rather than exposed as customer-visible placeholders.
- Rate limiting is per-process, not distributed — a determined attacker across instances/cold-starts isn't hard-capped. Fine as a deterrent for one small shop; a hard limit needs a shared store (Vercel KV / Upstash).
- Kitchen auth is a single shared password, not per-user staff accounts (adequate for one small shop).
- The generic Tranzila/YaadPay webhook remains unverified. Hyp payloads are rejected there; Hyp server notifications remain disabled pending the test-terminal payload contract and a dedicated ledger-backed handler. Legacy settlement and page creation use guarded compare-and-set updates: success dominates a racing failure, paid states remain absorbing, and stale create requests cannot overwrite payment or kitchen progress.

## 8. Working agreements (how this project is collaborated on)

- **Never mix a dependency/framework upgrade with a visual redesign in the same pass.**
- **No new dependency without a specific, named purpose.**
- **One commit per logical phase**, descriptive messages, for bisectability. GitHub Actions now enforces locked install, build/typecheck/lint and the focused regression suite on pull requests and `main`; manual browser smoke tests and git history remain part of the safety net.
- **Dedicated feature branches off `main`**, verify build/typecheck/lint before every commit, **never merge to `main` or push without explicit go-ahead**.
- **Guest-first is non-negotiable**: an account must never be required to order; where offered, it's an equally-weighted option, never a gate or a smaller/secondary link.
- **A gamified trading-card/gacha loyalty feature is real future work** (GoldWallet currency, pack-opening reveals, card rarities) but is **explicitly deferred** — nothing built anticipating it until it gets its own planning session.

## 9. Pending manual actions / open decisions

`main` is pushed, in sync and live at `d44fe06` as of 2026-09-03. The current `codex/payment-foundation` branch is local and unpushed. Production auto-deploys from `main` but is **still in demo mode** because the real Supabase/Hyp variables are not set on Vercel. Remaining:

1. **Complete owner/legal review of every legal/info page** before launch: supply the registered business name and number, verify address/contact/VAT facts, cancellation/refund and allergen wording, jurisdiction, effective date, minimum age, retention period and accessibility contact/audit details. Do not reintroduce editorial placeholders into rendered customer copy.
2. Apply the five locally missing migration versions to the connected pre-launch/test Supabase project with a filename-preserving CLI dry run first. The project currently contains 77 test orders and no customer tags; the full chain has passed a rollback-only rehearsal without changing them. Do not use MCP `apply_migration` for these existing timestamped files and never use `db reset --linked`.
3. Add real Supabase/Hyp Pay env vars to **Vercel** before deploying this branch. Current `main` falls into demo mode without them; the branch intentionally fails closed instead. A public demo deploy now requires the exact opt-in `NEXT_PUBLIC_BARIBALI_DEMO_MODE=true`, which must not coexist with credentials.
4. Production domain — not yet decided.
5. Verify whether the emailed Hyp terminal credentials are test or production and map their exact fields before updating credential status.
6. Menu/navigation follow-up — see `MENU_FLOW_BRIEF.md` / `MENU_RESTRUCTURE_REPLY.md`. The three-item nav, `/orders` split, reorder and dead-route cleanup are done; softening the repeated external-entry gate and unifying the builder remain open product decisions.
7. **Enable leaked-password protection** in Supabase Auth (checks against HaveIBeenPwned). Flagged by the security advisor; one toggle in the dashboard. Low urgency while sign-in is Google-first.
8. **Do not switch to digital-only** until the payment migration is applied and approved, declined, abandoned and replayed test-terminal flows pass. Approved Hyp VERIFY returns become `paid`; `paid_unverified` remains legacy-only. Pay-at-pickup stays working until that checkpoint is explicitly approved.
9. **Consider a database-level guard on `payment_status`** after Hyp lands, so it cannot reach `paid` except through a verified path. The RLS fix closes the door from outside; this would mean a bug in one server route can't hand out free food either.

**Current unmerged work:** `codex/payment-foundation` contains the durable
order-submission, payment and pickup-capacity foundations plus database-owned
order numbering and the order-validation, settlement, kitchen and
production-configuration hardening passes. It is unpushed, unapplied to
Supabase and undeployed. Git history is authoritative for the exact commit list.

## 10. Improvement backlog (not started, no priority commitment)

- **Testing/CI**: 187 focused regression tests plus GitHub Actions on pull requests and `main` pushes. The largest gaps are component/browser automation, end-to-end provider flows and a true multi-connection database concurrency test. A real 77-row Supabase transaction rehearsal already proved migration compatibility, five-slot allocation, replay, sixth-order rejection and complete rollback.
- **Observability**: no error tracking, no structured logging on payment/webhook routes.
- **Ops**: a local password-gated admin exists for prices/discounts/customers, but there is no production reporting dashboard. Schema/policy SQL and migrations are tracked; execution, advisor runs and backup/PITR verification remain manual.
- **Code quality**: `zustand` installed but unused — a `BariBaliBuilder.jsx` state-lifting refactor is on the table whenever there's appetite.
- **SEO**: no `robots.ts`/`sitemap.ts`, no Open Graph metadata.
- **Kitchen hardware judgement**: test the board on the physical Lenovo for glare, sound level, touch targets, wake-lock behaviour and recovery after a long idle period.

## 11. Environment variables

Canonical list in `.env.example` at repo root. Categories: Supabase (URL, publishable/anon key, secret/service-role key and explicit demo opt-in), kitchen-board and local-admin passwords, payment-provider selection plus Tranzila/YaadPay/Hyp credentials, Google Places API (reviews strip), and app base URL (payment redirects). Production rejects incomplete/mixed Supabase configuration, and `next.config.js` stops the build if it recognizes a private key in a `NEXT_PUBLIC_` slot or a public key in a server-only slot.
