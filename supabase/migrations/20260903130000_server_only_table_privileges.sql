-- Defense in depth for every table used exclusively through trusted API
-- routes. RLS remains enabled, and browser roles also lose their underlying
-- table privileges so a future policy mistake cannot reopen direct access.

begin;

alter table public.orders enable row level security;
alter table public.customer_tags enable row level security;
alter table public.shop_state enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.payment_events enable row level security;
alter table public.order_creation_requests enable row level security;

revoke all privileges on table public.orders
  from public, anon, authenticated, service_role;
revoke all privileges on table public.customer_tags
  from public, anon, authenticated, service_role;
revoke all privileges on table public.shop_state
  from public, anon, authenticated, service_role;
revoke all privileges on table public.payment_attempts
  from public, anon, authenticated, service_role;
revoke all privileges on table public.payment_events
  from public, anon, authenticated, service_role;
revoke all privileges on table public.order_creation_requests
  from public, anon, authenticated, service_role;

grant select, insert, update, delete on table public.orders to service_role;
grant select, insert, update, delete on table public.customer_tags to service_role;
grant select, insert, update on table public.shop_state to service_role;
grant select, insert, update on table public.payment_attempts to service_role;
grant select, insert, update on table public.payment_events to service_role;
grant select, insert on table public.order_creation_requests to service_role;

revoke all privileges on sequence public.payment_events_id_seq
  from public, anon, authenticated, service_role;
grant usage on sequence public.payment_events_id_seq to service_role;

create index if not exists orders_user_id_idx
  on public.orders (user_id)
  where user_id is not null;

commit;
