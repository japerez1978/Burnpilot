-- Sprint 5: Stripe — tablas de facturación, idempotencia webhooks, protección de plan_tier.

-- ---------------------------------------------------------------------------
-- Suscripción BurnPilot (Stripe) por usuario
-- ---------------------------------------------------------------------------

create table public.subscriptions_billing (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text,
  status text not null default 'inactive',
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_billing_stripe_customer_idx on public.subscriptions_billing (stripe_customer_id);
create index subscriptions_billing_stripe_subscription_idx on public.subscriptions_billing (stripe_subscription_id)
  where stripe_subscription_id is not null;

create trigger subscriptions_billing_set_updated_at
  before update on public.subscriptions_billing
  for each row
  execute function public.set_updated_at();

alter table public.subscriptions_billing enable row level security;

create policy "subscriptions_billing_select_own"
  on public.subscriptions_billing
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Idempotencia webhooks Stripe (escribe solo service_role / backend)
-- ---------------------------------------------------------------------------

create table public.stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now(),
  error text
);

create index stripe_events_processed_at_idx on public.stripe_events (processed_at desc);

alter table public.stripe_events enable row level security;

-- Sin políticas para authenticated: solo service_role (backend Railway).

-- ---------------------------------------------------------------------------
-- plan_tier solo modificable desde backend (service_role)
-- ---------------------------------------------------------------------------

create or replace function public.profiles_plan_tier_service_only()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.plan_tier is distinct from old.plan_tier then
    -- Solo el backend (JWT service_role) puede cambiar el plan; no el usuario autenticado vía PostgREST.
    if auth.role() = 'authenticated' then
      raise exception 'plan_tier is managed by billing';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_plan_tier_service_only on public.profiles;

create trigger profiles_plan_tier_service_only
  before update on public.profiles
  for each row
  when (old.plan_tier is distinct from new.plan_tier)
  execute function public.profiles_plan_tier_service_only();

comment on table public.subscriptions_billing is 'Stripe customer/subscription BurnPilot; escritura desde API Railway (service role).';
comment on table public.stripe_events is 'Idempotencia webhook Stripe; escritura desde API Railway.';
