-- BurnPilot Sprint 2: categorías, fx, plantillas, projects, tools, project_tools + RLS + triggers
-- Aplicar en el proyecto Supabase existente (después de 20250418000001_init_profiles.sql).

-- ---------------------------------------------------------------------------
-- Catálogo (lectura pública)
-- ---------------------------------------------------------------------------

create table public.categories (
  id smallint primary key,
  slug text not null unique,
  name text not null,
  color text not null default '#4ADE80',
  icon text not null default 'folder'
);

create table public.fx_rates (
  from_currency char(3) not null,
  to_currency char(3) not null,
  rate numeric(18, 8) not null check (rate > 0),
  captured_at timestamptz not null default now(),
  primary key (from_currency, to_currency)
);

create table public.tool_templates (
  id smallint primary key generated always as identity,
  slug text not null unique,
  name text not null,
  vendor text,
  category_id smallint not null references public.categories (id),
  suggested_amount_cents integer check (suggested_amount_cents is null or suggested_amount_cents > 0),
  currency char(3) not null default 'EUR' check (currency in ('EUR', 'USD', 'GBP')),
  periodicity text not null check (periodicity in ('monthly', 'yearly', 'quarterly')),
  plan_label text
);

-- ---------------------------------------------------------------------------
-- Datos de usuario
-- ---------------------------------------------------------------------------

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  color text not null default '#4ADE80',
  icon text not null default 'folder',
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index projects_user_id_status_idx on public.projects (user_id, status);

create table public.tools (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  vendor text,
  category_id smallint not null references public.categories (id),
  plan_label text,
  amount_cents integer not null check (amount_cents > 0),
  currency char(3) not null check (currency in ('EUR', 'USD', 'GBP')),
  periodicity text not null check (periodicity in ('monthly', 'yearly', 'quarterly')),
  last_renewal_at date not null,
  state text not null default 'active' check (state in ('active', 'trial', 'doubtful', 'to_cancel', 'canceled')),
  perceived_usefulness smallint check (
    perceived_usefulness is null
    or (perceived_usefulness >= 1 and perceived_usefulness <= 5)
  ),
  notes text,
  fx_rate_to_base numeric(18, 8),
  amount_in_base_cents integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index tools_user_id_state_idx on public.tools (user_id, state) where deleted_at is null;
create index tools_user_id_category_idx on public.tools (user_id, category_id) where deleted_at is null;

create table public.project_tools (
  project_id uuid not null references public.projects (id) on delete cascade,
  tool_id uuid not null references public.tools (id) on delete cascade,
  allocation_pct numeric(5, 2) not null default 100
    check (allocation_pct > 0 and allocation_pct <= 100),
  created_at timestamptz not null default now(),
  primary key (project_id, tool_id)
);

create index project_tools_tool_id_idx on public.project_tools (tool_id);

-- ---------------------------------------------------------------------------
-- Triggers updated_at (projects, tools)
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_set_updated_at
  before update on public.projects
  for each row
  execute function public.set_updated_at();

create trigger tools_set_updated_at
  before update on public.tools
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Suma allocation_pct por tool ≤ 100%
-- ---------------------------------------------------------------------------

create or replace function public.enforce_project_tools_allocation_sum()
returns trigger
language plpgsql
as $$
declare
  target_tool uuid;
  alloc_total numeric(10, 4);
begin
  target_tool := coalesce(new.tool_id, old.tool_id);
  alloc_total := coalesce(
    (
      select sum(pt.allocation_pct)
      from public.project_tools as pt
      where pt.tool_id = target_tool
    ),
    0
  );

  if alloc_total > 100.0001 then
    raise exception 'allocation_pct sum for tool % exceeds 100%%', target_tool;
  end if;

  return null;
end;
$$;

create trigger project_tools_check_allocation_sum
  after insert or update or delete on public.project_tools
  for each row
  execute function public.enforce_project_tools_allocation_sum();

-- ---------------------------------------------------------------------------
-- Seeds: categorías (8) + fx + plantillas (16)
-- ---------------------------------------------------------------------------

insert into public.categories (id, slug, name, color, icon) values
  (1, 'ai-coding', 'IA / coding', '#4ADE80', 'code-2'),
  (2, 'hosting', 'Hosting / edge', '#38BDF8', 'cloud'),
  (3, 'data', 'Datos / backend', '#A78BFA', 'database'),
  (4, 'design', 'Diseño', '#F472B6', 'palette'),
  (5, 'productivity', 'Productividad', '#FBBF24', 'layout-list'),
  (6, 'payments', 'Pagos', '#34D399', 'credit-card'),
  (7, 'comms', 'Email / comms', '#60A5FA', 'mail'),
  (8, 'automation', 'Automatización', '#FB923C', 'workflow');

-- Tasas orientativas (hub EUR); refresco real vía cron en fases posteriores.
insert into public.fx_rates (from_currency, to_currency, rate) values
  ('EUR', 'EUR', 1),
  ('USD', 'EUR', 0.92),
  ('GBP', 'EUR', 1.17),
  ('EUR', 'USD', 1.09),
  ('EUR', 'GBP', 0.86),
  ('USD', 'USD', 1),
  ('GBP', 'GBP', 1),
  ('GBP', 'USD', 1.27),
  ('USD', 'GBP', 0.79);

insert into public.tool_templates (slug, name, vendor, category_id, suggested_amount_cents, currency, periodicity, plan_label) values
  ('cursor', 'Cursor', 'Anysphere', 1, 2000, 'USD', 'monthly', 'Pro'),
  ('vercel', 'Vercel', 'Vercel', 2, 2000, 'USD', 'monthly', 'Pro'),
  ('netlify', 'Netlify', 'Netlify', 2, 1900, 'USD', 'monthly', 'Pro'),
  ('supabase', 'Supabase', 'Supabase', 3, 2500, 'USD', 'monthly', 'Pro'),
  ('railway', 'Railway', 'Railway', 2, 500, 'USD', 'monthly', 'Hobby+'),
  ('stripe', 'Stripe', 'Stripe', 6, null, 'EUR', 'monthly', 'Pay-as-you-go'),
  ('resend', 'Resend', 'Resend', 7, 2000, 'USD', 'monthly', 'Pro'),
  ('figma', 'Figma', 'Figma', 4, 1500, 'USD', 'monthly', 'Professional'),
  ('notion', 'Notion', 'Notion', 5, 1000, 'USD', 'monthly', 'Plus'),
  ('chatgpt-plus', 'ChatGPT Plus', 'OpenAI', 1, 2000, 'USD', 'monthly', 'Plus'),
  ('claude-pro', 'Claude', 'Anthropic', 1, 1800, 'USD', 'monthly', 'Pro'),
  ('cloudflare', 'Cloudflare', 'Cloudflare', 2, 2000, 'USD', 'monthly', 'Pro'),
  ('github', 'GitHub', 'GitHub', 1, 400, 'USD', 'monthly', 'Team'),
  ('n8n-cloud', 'n8n', 'n8n', 8, 2400, 'EUR', 'monthly', 'Starter'),
  ('slack', 'Slack', 'Slack', 7, 750, 'EUR', 'monthly', 'Pro'),
  ('linear', 'Linear', 'Linear', 5, 800, 'USD', 'monthly', 'Business');

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.categories enable row level security;
alter table public.fx_rates enable row level security;
alter table public.tool_templates enable row level security;
alter table public.projects enable row level security;
alter table public.tools enable row level security;
alter table public.project_tools enable row level security;

create policy "categories_select_public"
  on public.categories
  for select
  to anon, authenticated
  using (true);

create policy "fx_rates_select_public"
  on public.fx_rates
  for select
  to anon, authenticated
  using (true);

create policy "tool_templates_select_authenticated"
  on public.tool_templates
  for select
  to authenticated
  using (true);

create policy "projects_select_own"
  on public.projects
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "projects_insert_own"
  on public.projects
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "projects_update_own"
  on public.projects
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "projects_delete_own"
  on public.projects
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

create policy "tools_select_own"
  on public.tools
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "tools_insert_own"
  on public.tools
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "tools_update_own"
  on public.tools
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "tools_delete_own"
  on public.tools
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

create policy "project_tools_all_own"
  on public.project_tools
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.projects p
      where p.id = project_tools.project_id
        and p.user_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.tools t
      where t.id = project_tools.tool_id
        and t.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.projects p
      where p.id = project_tools.project_id
        and p.user_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.tools t
      where t.id = project_tools.tool_id
        and t.user_id = (select auth.uid())
    )
  );

comment on table public.categories is 'Catálogo builder read-only; seed 8 categorías.';
comment on table public.fx_rates is 'Snapshot FX; lectura pública; refresco backend en fases posteriores.';
comment on table public.tool_templates is '16 plantillas iniciales para onboarding / alta rápida.';
comment on table public.projects is 'Proyectos (apps) del usuario; RLS por user_id.';
comment on table public.tools is 'Suscripciones del usuario; soft delete con deleted_at.';
comment on table public.project_tools is 'Asignación tool↔proyecto; sum(allocation_pct) por tool ≤ 100%.';
