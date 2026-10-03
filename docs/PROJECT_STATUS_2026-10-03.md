# BariBali — verified status, 2026-10-03

## Completed locally and in the prelaunch test database

- Runtime security update: Next.js 16.3.8 and patched transitive dependencies.
  Production dependency audit: zero known vulnerabilities. Five development
  package advisories remain in the unfixed upstream `braces` dependency chain.
- Supabase project restored to ACTIVE_HEALTHY without a reset. The original
  test order and its attempt/events remain unchanged after rollback tests.
- Complete ordered HYP return evidence is encrypted and recorded atomically
  with its refund-critical transaction Id before VERIFY. Safe replay is now
  available independently of the originating browser URL.
- Missing currency in the documented Pay envelope is handled narrowly from
  the immutable signed ILS request. Explicit invalid/mismatched currency,
  unsigned returns and authentic declines never become approved payments.
- Tracking preserves unresolved order/payment identities, offers the original
  checkout or an approval-only recheck, and blocks repeated clicks. Private
  payment fields are not returned by the customer order API. Database outages
  are not misreported as missing orders.

Verification: 209 focused tests; typecheck; lint at the existing nine warnings;
production build; rollback-only database integration; mobile browser checks
at 390px/320px with payment mocks; real local order API read. React guidance
kept recovery outside the fixed tracking artwork, with a labelled 44px-minimum
action and polite feedback, without adding an automatic polling/payment loop.

## Not shipped / still required

- Work is on `codex/payment-foundation`. Main and the public deployment were
  not pushed, merged or changed. Production environment variables could not
  be inspected because the Vercel connector needs renewed authorization.
- Confirm with HYP that the supplied terminal is a no-charge test terminal,
  then complete one genuine approved and one declined hosted round trip.
  SIGN working is not evidence of a successful card-payment round trip.
- Configure the public callback URL and real server variables, including the
  new private encryption key, before a controlled public test deployment.
- Approve/implement callback-evidence purging and other launch legal details.
- Bit and server notifications remain out of scope as requested. No refund,
  real charge, email or notification was sent during this work.
- The older handoff copy is not updated; use this worktree as the current source.

Next safe step: resolve HYP terminal status and Vercel authorization, then run
a controlled test-terminal round trip before a separate visual-polish pass.
