-- StackOS: roadmap por proyecto (priorización MoSCoW + estados de flujo).
-- Ver docs/stackos-spec.md

-- ---------------------------------------------------------------------------
-- stackos_roadmaps: un roadmap por proyecto
-- ---------------------------------------------------------------------------
create table public.stackos_roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  scoring_mode text not null default 'launch' check (scoring_mode in ('launch', 'retention')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stackos_roadmaps_project_id_unique unique (project_id)
);

create index stackos_roadmaps_user_id_idx on public.stackos_roadmaps (user_id);

-- user_id siempre coincide con projects.user_id (evita RLS spoofing)
create or replace function public.stackos_roadmap_set_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select p.user_id into strict new.user_id
  from public.projects p
  where p.id = new.project_id;
  return new;
end;
$$;

create trigger stackos_roadmaps_set_user_id_trg
  before insert or update of project_id on public.stackos_roadmaps
  for each row
  execute function public.stackos_roadmap_set_user_id();

create trigger stackos_roadmaps_set_updated_at_trg
  before update on public.stackos_roadmaps
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- stackos_items
-- ---------------------------------------------------------------------------
create table public.stackos_items (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references public.stackos_roadmaps (id) on delete cascade,
  sort_order integer not null default 0,
  name text not null,
  description text not null default '',
  phase text not null default 'Ahora',
  facilidad smallint not null check (facilidad >= 1 and facilidad <= 100),
  velocidad smallint not null check (velocidad >= 1 and velocidad <= 100),
  eficiencia smallint not null check (eficiencia >= 1 and eficiencia <= 100),
  einicial smallint not null check (einicial >= 1 and einicial <= 100),
  elifetime smallint not null check (elifetime >= 1 and elifetime <= 100),
  score smallint not null check (score >= 1 and score <= 100),
  moscow char(1) not null check (moscow in ('M', 'S', 'C', 'W')),
  workflow_state text not null default 'active' check (
    workflow_state in ('active', 'validated', 'postponed', 'archived')
  ),
  why text,
  how text,
  ai_note text,
  tech jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index stackos_items_roadmap_sort_idx on public.stackos_items (roadmap_id, sort_order);
create index stackos_items_roadmap_state_idx on public.stackos_items (roadmap_id, workflow_state);

create trigger stackos_items_set_updated_at_trg
  before update on public.stackos_items
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.stackos_roadmaps enable row level security;
alter table public.stackos_items enable row level security;

create policy "stackos_roadmaps_select_own"
  on public.stackos_roadmaps for select to authenticated
  using (user_id = auth.uid());

create policy "stackos_roadmaps_insert_own"
  on public.stackos_roadmaps for insert to authenticated
  with check (user_id = auth.uid());

create policy "stackos_roadmaps_update_own"
  on public.stackos_roadmaps for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "stackos_roadmaps_delete_own"
  on public.stackos_roadmaps for delete to authenticated
  using (user_id = auth.uid());

create policy "stackos_items_select_own"
  on public.stackos_items for select to authenticated
  using (
    exists (
      select 1 from public.stackos_roadmaps r
      where r.id = stackos_items.roadmap_id and r.user_id = auth.uid()
    )
  );

create policy "stackos_items_insert_own"
  on public.stackos_items for insert to authenticated
  with check (
    exists (
      select 1 from public.stackos_roadmaps r
      where r.id = stackos_items.roadmap_id and r.user_id = auth.uid()
    )
  );

create policy "stackos_items_update_own"
  on public.stackos_items for update to authenticated
  using (
    exists (
      select 1 from public.stackos_roadmaps r
      where r.id = stackos_items.roadmap_id and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.stackos_roadmaps r
      where r.id = stackos_items.roadmap_id and r.user_id = auth.uid()
    )
  );

create policy "stackos_items_delete_own"
  on public.stackos_items for delete to authenticated
  using (
    exists (
      select 1 from public.stackos_roadmaps r
      where r.id = stackos_items.roadmap_id and r.user_id = auth.uid()
    )
  );
