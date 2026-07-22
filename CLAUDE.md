# BariBali — Project Guide

> Onboarding for anyone (human or AI) joining this repo. Read this first; see `PROJECT_BRIEF.md` for the deeper history, data model, and security posture.

## 1. What this is

BariBali is a **mobile-first, Hebrew (RTL)** salad + tortilla builder for a **real, pre-launch restaurant** (not a demo/portfolio). Customers build a bowl/wrap ingredient by ingredient, choose a pickup time, and pay online (Hyp Pay) or at pickup. A staff **kitchen board** shows live orders. Ordering is **guest-first** — an account (Google sign-in) is always optional, never required.

Deployed on Vercel, auto-deploys from `main` (GitHub `JBT-bpu/baribali-app`, private). **Production currently runs in demo mode** — real Supabase/Hyp env vars aren't set on Vercel yet, so it uses an in-memory store.

## 2. Tech stack

- **Next.js 16** (App Router, Turbopack) · **React 19** · **TypeScript 6** (new files) + untyped **JSX** (older builder components)
- **Tailwind v4** (`@theme` tokens in `src/app/globals.css`) **coexisting with** older inline `const S = {…}` style objects — both patterns are intentional, not a half-done migration
- **Supabase** (Postgres + Auth) · **Hyp Pay** (Israeli card processor; Tranzila/YaadPay code kept as unused alternates)
- Libs: `motion`, `react-parallax-tilt`, `vaul`, `canvas-confetti`, `lucide-react`
- Fonts: Heebo (UI) + Secular One (display), self-hosted via `next/font`

## 3. Run & verify

```bash
npm install
npm run dev        # demo mode unless .env.local has real Supabase creds
npm run build
npx tsc --noEmit   # typecheck (no dedicated script)
npm run lint       # eslint .
npm run fresh      # rimraf .next && next dev — use if the dev cache corrupts
```

- **Demo vs real mode** hinges on `isSupabaseConfigured()` in `src/lib/supabase.ts`. Without real creds the app is fully usable against an in-memory demo store (`src/lib/demoStore.ts`).
- **Lint baseline: 0 errors / 17 warnings.** Hold that line — don't add warnings; the 17 are pre-existing (mostly `react-hooks/set-state-in-effect` and unused `no-img-element` disables).
- **No test framework exists.** The safety net is git history + manual smoke-testing, so verify changes by actually running the affected flow.

## 4. Where things live

```
src/
├─ app/
│  ├─ page.tsx              → redirects to /home2
│  ├─ home2/                landing: welcome step, product cards, size picker, bottom nav
│  ├─ build/                builder entry (wraps BariBaliBuilder); ?size=&type=salad|tortilla
│  ├─ order/[id]/           live order-status page
│  ├─ kitchen/              staff board (password-gated) — page.tsx guard + KitchenBoard/KitchenLogin
│  ├─ login/, profile/      auth + order history (with "order again")
│  ├─ privacy/, terms/      legal pages (drafts with placeholders)
│  ├─ favorites/, fresh/, top/, recommended/   "coming soon" stubs (fresh/top/recommended orphaned)
│  └─ api/                  orders, my/orders, kitchen/*, payment/*, slots, reviews, demo/reset
├─ components/
│  ├─ builder/              BariBaliBuilder.jsx, SummaryView.jsx, ui/HeroBowlCard, ui/DetailSheet
│  ├─ ui/bari/              design system: BariButton, BariPanel, BariModal, BariBadge, BariBottomNav
│  └─ ui/                   ReviewsStrip, ParticleCanvas, ComingSoon, CatPopup, GoogleSignInButton
├─ data/salad-data.js       ingredient catalog, prices, combos, presets, SIZE_CONFIG, STEPS, TORTILLA_STEPS
└─ lib/                     supabase, auth, pricing, hypPay, kitchenAuth, rateLimit, reorder,
                            demoStore, motionHooks, confetti, utils
```

## 5. Core flows

- **Order:** `/home2` → in-page size picker → `/build?size=&type=` (`BariBaliBuilder`) → `SummaryView` → `POST /api/orders` → Hyp Pay redirect (or confetti if pay-at-pickup) → `/order/[id]`.
  **Price is recomputed server-side from the canonical catalog (`src/lib/pricing.ts` `computeOrderTotal`) — the client-submitted total is never trusted.**
- **Auth:** guest-first. Supabase Google OAuth (`src/lib/auth.ts`); `user_id` on an order is set **only** from a server-verified access token, never client-claimed. Guests order identically with `user_id = null`.
- **Reorder:** `/profile` history cards → "order again" / "order again with changes" (`src/lib/reorder.ts`).
- **Kitchen:** `/kitchen` gated by a **server-only** `KITCHEN_PASSWORD` exchanged for an httpOnly, HMAC-signed session cookie (`src/lib/kitchenAuth.ts`).

## 6. Conventions (standing working agreements)

- **Dedicated feature branches off `main`**; **one commit per logical phase** with a descriptive message (git history is the safety net — keep it bisectable).
- **Verify build + typecheck + lint before every commit.**
- **Never merge to `main` or push without explicit go-ahead** from the owner.
- **Guest-first is non-negotiable** — an account is never a gate; where sign-in is offered it's an equally-weighted option, never a smaller/secondary link.
- **No new dependency without a specific named purpose.**
- **Never mix a dependency/framework upgrade with a visual redesign in the same pass** (upgrades must be verified separately).
- **Match the surrounding code.** Hebrew RTL throughout; the TS-vs-JSX and Tailwind-vs-inline-style splits are deliberate coexistence — don't "modernize" them as a side quest.

## 7. Known gaps & non-obvious facts

- **`TORTILLA_STEPS` is imported but never used.** `BariBaliBuilder` renders the salad step set for tortillas too, so a "tortilla" today = salad ingredients on a wrap base price (₪42). Tortilla orders are distinguished **only by base price**, not by their item ids (this is why `src/lib/reorder.ts` detects type from the base).
- **`/kitchen` runs open until `KITCHEN_PASSWORD` is set on Vercel** — the auth code is deployed, but the production value isn't set yet.
- **Payment webhook has no signature verification** → confirmed payments land as `paid_unverified` (staff confirm at pickup) rather than `paid`. Blocked on a Hyp verification credential.
- **`/privacy` and `/terms` are drafts** with `[bracketed]` business-detail placeholders that must be filled before launch.
- **Rate limiting** (`src/lib/rateLimit.ts`) is in-memory/per-process — a deterrent, approximate on serverless (no shared store).
- **No automated tests or CI** yet.

## 8. Deeper reference

`PROJECT_BRIEF.md` (repo root) has the full changelog, data model / `orders` schema, security posture, environment variables, and the current pending-actions list. `MENU_FLOW_BRIEF.md` maps every screen and flow in detail (untracked working doc).
