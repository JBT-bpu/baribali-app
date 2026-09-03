# BariBali payment foundation

This branch adds durable, idempotent Hyp payment attempts. The migration has
not been applied to Supabase. Inspect the actual `public.orders` definition
before applying it, first in a test/staging project.

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
  redirects to `/home2?payment=verifying`, but `/home2` does not yet render
  that hint. Neither case is treated as a decline.
- `needs_review` is sticky across callback replays and transient VERIFY
  failures. A later approved VERIFY may still settle it after all consistency
  checks pass.
- New Hyp callbacks cannot enter through the generic unverified webhook.
  A legacy `paid_unverified` row has no trustworthy transaction provenance,
  so even a valid later VERIFY leaves it for manual review rather than hiding
  a possible second charge.

The migration is
`supabase/migrations/20260902184747_payment_foundation.sql`.

## Before applying the migration

1. Confirm `public.orders.id` is `uuid`, `total` is a whole-shekel integer, and
   `payment_status` is text. The migration aborts if these assumptions differ.
2. Take a database backup or confirm the project's recovery option.
3. Apply first to a restored test/staging project, not directly to production.
4. Run Supabase database and security advisors after applying.
5. Test the `anon` and `authenticated` roles: neither may read or write the two
   payment tables or execute the payment RPCs. Only `service_role` is granted.

Useful post-migration checks:

```sql
select relname, relrowsecurity
from pg_class
where oid in (
  'public.payment_attempts'::regclass,
  'public.payment_events'::regclass
);

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('payment_attempts', 'payment_events')
order by table_name, grantee, privilege_type;
```

## Hyp test-terminal setup

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

The unit suite covers SIGN/VERIFY parsing, credential-safe failures, immediate
transaction-ID capture, URL persistence, concurrent initialization, retries,
duplicate callbacks, unknown references, and verification-pending behavior.
It does not replace a real test-terminal round trip or migration execution.
