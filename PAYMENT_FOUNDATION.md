# BariBali payment foundation

This branch adds durable, idempotent order creation, atomic pickup capacity,
database-owned order numbers and Hyp payment attempts. The four forward
migrations have not been applied to Supabase. The linked pre-launch test
project already records the two
2026-08-08 historical migrations; its older application tables previously had
no replayable baseline in Git. Apply the forward chain first in a test/staging
project.

## What changes

- `payment_attempts` owns the merchant reference, amount in agorot, one hosted
  checkout URL, the Hyp transaction `Id`, and the reconciliation status.
- `payment_events` records the browser return before any external VERIFY call.
- A partial unique index permits only one active payment attempt per order.
- `claim_payment_attempt` and `finish_payment_initialization` make payment-page
  creation idempotent. A persisted checkout page is reused and never expires
  automatically, because an older Hyp page may still be chargeable.
- `apply_payment_verification` settles the attempt and order in one short
  transaction. `paid` is absorbing. Missing or mismatched amount/currency,
  conflicting transaction IDs, and legacy `paid_unverified` provenance go to
  `needs_review`. Invalid, unknown, or VERIFY-mismatched references remain
  unresolved and are never marked paid.
- A durably recorded callback whose VERIFY call fails remains
  `verification_pending`. If callback recording itself fails, no event is
  durable and the database state remains unchanged. The current fallback
  redirects to `/home2?payment=verifying`, where the customer is warned not to
  pay again and to contact the register if the order is missing. Neither case
  is treated as a decline.
- `needs_review` is sticky across callback replays and transient VERIFY
  failures. A later approved VERIFY may still settle it after all consistency
  checks pass.
- New Hyp callbacks cannot enter through the generic unverified webhook.
  A legacy `paid_unverified` row has no trustworthy transaction provenance,
  so even a valid later VERIFY leaves it for manual review rather than hiding
  a possible second charge.
- Legacy Tranzila/YaadPay settlement and payment-page creation use an atomic
  compare-and-set. Failure may claim only `pending`; success may also promote
  `failed`, so an actual charge wins in either callback order while paid states
  remain absorbing. A create request that loses its `pending` guard receives no
  hosted URL, and neither path rewinds the kitchen workflow to `waiting`.
  PostgREST write errors fail closed instead of being mistaken for successful
  initialization.
- That guard prevents state downgrades; it does not give the legacy providers
  Hyp's durable checkout-attempt identity. A settlement can still arrive after
  the guard and before the generated URL reaches the browser. Keep these
  providers disabled for a digital-only launch unless they are moved onto an
  attempt ledger with provider-specific transaction correlation.
- `order_creation_requests` is a server-only key/hash ledger. Its RPC claims a
  browser submission key and inserts the order in one transaction, so a lost
  response, reload or concurrent retry returns the same kitchen order. The API
  deliberately returns 503 rather than falling back to a non-idempotent insert
  when this database contract is unavailable.
- `orders_order_num_seq` is the single durable source of human `BB-…` numbers,
  backed by a unique constraint. Application clocks and random numbers no
  longer decide order identity.
- `order_pickup_allocations` owns five immutable positions per Israel service
  date and five-minute pickup slot. The RPC wins a position before inserting an
  order, so concurrent customer requests cannot overbook. A full sixth request
  rolls its idempotency claim back and returns `PICKUP_SLOT_FULL`. Positions are
  not released by payment or kitchen status yet: Hyp pages can remain
  chargeable, failed payments can be retried, and collected tickets can be
  undone. Releasing safely needs a confirmed Hyp expiry/cancellation contract.
- Normal scheduled service requires a canonical slot the checkout could have
  offered. A missing pickup time is reserved for an explicit staff-open
  override when the schedule has no slots, where pickup is coordinated at the
  counter. `SIM-…` kitchen rehearsal orders never consume customer capacity.
- The browser stores the exact unresolved order request in tab-scoped
  `sessionStorage` for 30 minutes. Once the order exists, that record carries
  its order ID and payment idempotency key instead. A hard reload never sends
  automatically: the customer explicitly resumes the same request/payment,
  and mutable checkout controls stay locked until it is resolved.
- A fully-discounted order is stored as `no_payment_required`: it remains a
  normal kitchen order, but it is neither called paid nor marked for collection
  at pickup. It creates no payment attempt and never opens a hosted checkout.

The migrations are:

- `supabase/migrations/20260808100000_base_schema.sql`
- `supabase/migrations/20260808120932_shop_state.sql`
- `supabase/migrations/20260808121915_orders_rls_remove_public_insert.sql`
- `supabase/migrations/20260902184747_payment_foundation.sql`
- `supabase/migrations/20260903120000_order_submission_idempotency.sql`
- `supabase/migrations/20260903130000_server_only_table_privileges.sql`
- `supabase/migrations/20260903200310_order_capacity_and_numbering.sql`

The baseline matches the live schema inspected on 2026-09-03 and aborts on an
incompatible existing table instead of rewriting data. The final hardening
migration explicitly removes base-table privileges from browser roles and adds
the missing `orders.user_id` index. The final capacity migration backfills every
historical timed real order, refusing to continue if any old slot is already
overbooked or off the five-minute grid.

## Before applying the migration

1. Confirm the complete `public.orders` shape, including the nullable discount
   fields. The forward migrations contain guards and abort when required types differ.
2. Take a database backup or confirm the project's recovery option.
3. The connected project is the pre-launch test project. It currently contains
   77 test orders and no customer tags; do not delete or reset them implicitly.
4. Run Supabase database and security advisors after applying.
5. Test the `anon` and `authenticated` roles: neither may read or write the
   payment tables or order-creation ledger, nor execute their RPCs. Only
   `service_role` is granted.
6. The baseline version predates the linked project's recorded migrations. Use
   pinned Supabase CLI `2.116.0` and preview with
   `supabase db push --linked --include-all --dry-run`. It must list exactly the
   missing baseline plus the four `202609…` forward migrations before the real
   push. Never run `supabase db reset --linked`.
7. Do not apply these timestamped files with MCP `apply_migration`: that API
   creates different server versions and would split local/remote migration
   history. Authenticate and link the CLI interactively; never put the access
   token or database password in a command or repository file.

Useful post-migration checks:

```sql
select relname, relrowsecurity
from pg_class
where oid in (
  'public.payment_attempts'::regclass,
  'public.payment_events'::regclass,
  'public.order_creation_requests'::regclass,
  'public.order_pickup_allocations'::regclass
);

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'payment_attempts',
    'payment_events',
    'order_creation_requests',
    'order_pickup_allocations'
  )
order by table_name, grantee, privilege_type;
```

## Hyp test-terminal setup

- The forwarded "פתיחת מסוף טסט חדש" email was located. It contains the test
  terminal login and API credentials, but no webhook payload specification.
  Keep those values in a password manager / environment variables only; never
  copy them into Git. Change the initial portal password and default PassP
  before broader testing.
- Set `PAYMENT_PROVIDER=hyp`, `HYP_MASOF`, `HYP_KEY`, `HYP_PASSP`, the real
  server-side Supabase variables, and `NEXT_PUBLIC_APP_URL`.
- Configure the hosted-page return URL as
  `https://<host>/api/payment/hyp/return`.
- Do **not** configure Hyp notifications to `/api/payment/webhook`; that route
  rejects Hyp so an undocumented payload cannot fall through as Tranzila.
- Any future Hyp notification handler must write through the same attempt/event
  ledger. It must not set `paid_unverified` directly; an automatic upgrade is
  safe only when the prior event, attempt, provider, and transaction ID all
  match the later verified result.
- Obtain one approved and one declined test payload plus the server-notification
  specification before implementing decline mapping or a notification route.
- Only `CCode=0` is treated as approved. `CCode=700` remains unresolved because
  the application has no authorization/capture state. Confirm the test
  terminal's one-phase/J5 configuration and its authorization/capture fields
  with Hyp before changing this mapping.
- Ask Hyp whether Bit uses the same merchant reference and transaction `Id`,
  and which identifier their refund operation requires.

After an approved test, verify that the captured Hyp transaction `Id` is
durable. Once Hyp confirms the identifier required for refunds, verify that
the corresponding field is stored here:

```sql
select
  o.order_num,
  a.merchant_reference,
  a.provider_transaction_id,
  a.amount_agorot,
  a.currency_code,
  a.status,
  a.settled_at
from public.payment_attempts a
join public.orders o on o.id = a.order_id
order by a.created_at desc
limit 20;
```

## Local verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

The 169-test focused suite covers SIGN/VERIFY parsing, credential-safe failures,
immediate transaction-ID capture, URL persistence, concurrent initialization,
order/request replay across hard reloads, duplicate callbacks, unknown
references, verification-pending behavior, server pickup validation and the
five-position capacity rule, plus generic-provider settlement/create races. The complete forward chain was also rehearsed on
the connected 77-row database inside one transaction: five same-slot orders,
replay and sixth-order rejection all passed, then `ROLLBACK` restored all 77
rows and removed every temporary object. This does not replace a true
multi-connection concurrency run or a real Hyp test-terminal round trip.
