-- Historical migration already recorded in the linked Supabase project.
-- It closed the original public order-insert policy.

drop policy if exists "insert orders" on public.orders;
