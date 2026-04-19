-- BurnPilot Sprint 1: perfiles 1:1 con auth.users + RLS
-- Aplicar en tu proyecto Supabase existente (SQL editor o `supabase db push`), no crear proyecto nuevo salvo que sea imprescindible.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  display_currency text not null default 'EUR',
  monthly_budget_cents integer,
  onboarding_completed_at timestamptz,
  plan_tier text not null default 'free' check (plan_tier in ('free', 'pro', 'lifetime')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_plan_tier_idx on public.profiles (plan_tier);

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_profiles_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    nullif(
      trim(
        coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')
      ),
      ''
    ),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'avatar_url', '')), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

comment on table public.profiles is 'Perfil de usuario BurnPilot; filas creadas vía trigger handle_new_user.';
