# BariBali payment foundation

This branch adds durable, idempotent Hyp payment attempts. It is intentionally
not applied to the live Supabase project yet. Restore/activate the project and
inspect its real `public.orders` definition before running the migration.

## What changes

- `payment_attempts` owns the merchant reference, amount in agorot, one hosted
  checkout URL, the Hyp transaction `Id`, and the reconciliation status.
- `payment_events` records the browser return before any external VERIFY call.
- A partial unique index permits only one active payment attempt per order.
- `claim_payment_attempt` and `finish_payment_initialization` make payment-page
  creation idempotent. A persisted checkout page is reused and never expires
  automatically, because an older Hyp page may still be chargeable.
- `apply_payment_verification` settles the attempt and order in one short
  transaction. `paid` is absorbing; amount, currency, reference, and provider
  transaction-ID conflicts go to manual review.
- Network/VERIFY ambiguity remains `verification_pending`; it never becomes a
  decline merely because transport or persistence failed.

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
- Obtain one approved and one declined test payload plus the server-notification
  specification before implementing decline mapping or a notification route.
- Ask Hyp whether Bit uses the same merchant reference and transaction `Id`,
  and which identifier their refund operation requires.

After an approved test, verify that the refund identifier is durable:

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
