-- BurnPilot Sprint 6: stack_snapshots — histórico real de burn rate por proyecto
-- Reemplaza el stub dashboard_history con datos reales de snapshots.
-- Requiere migración Sprint 2 (tools, projects, project_tools) aplicada.

-- ---------------------------------------------------------------------------
-- Tabla: stack_snapshots
-- Guarda hasta MAX_SNAPSHOTS lecturas históricas de burn rate por proyecto.
-- Se inserta automáticamente vía trigger cuando cambia project_tools.
-- ---------------------------------------------------------------------------

create table public.stack_snapshots (
  id            uuid        primary key default gen_random_uuid(),
  project_id    uuid        not null references public.projects(id) on delete cascade,
  monthly_burn_base_cents bigint  not null default 0,
  yearly_burn_base_cents  bigint  not null default 0,
  tool_count    int         not null default 0,
  captured_at   timestamptz not null default now()
);

-- Índice para lecturas rápidas por proyecto ordenadas por fecha
create index idx_stack_snapshots_project_time
  on public.stack_snapshots(project_id, captured_at desc);

-- RLS: cada usuario solo ve snapshots de sus propios proyectos
alter table public.stack_snapshots enable row level security;

create policy "stack_snapshots: read own"
  on public.stack_snapshots for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

-- Service role puede insertar (usado por el trigger)
create policy "stack_snapshots: service insert"
  on public.stack_snapshots for insert
  with check (true);

-- ---------------------------------------------------------------------------
-- Función: take_project_snapshot(p_project_id)
-- Calcula el burn actual del proyecto y lo inserta en stack_snapshots.
-- Mantiene solo los últimos 5 snapshots por proyecto (rolling).
-- Deduplicación: no inserta si el burn no ha cambiado en las últimas 2 horas.
-- ---------------------------------------------------------------------------

create or replace function public.take_project_snapshot(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_monthly   bigint;
  v_yearly    bigint;
  v_tools     int;
  v_last_burn bigint;
  v_last_at   timestamptz;
  MAX_SNAPS   constant int := 5;
begin
  -- Calcular burn actual
  select
    coalesce(sum(
      public.tool_monthly_base_cents(t.amount_in_base_cents, t.amount_cents, t.periodicity)
      * (pt.allocation_pct / 100.0)
    ), 0)::bigint,
    count(*)::int
  into v_monthly, v_tools
  from public.project_tools pt
  join public.tools t on t.id = pt.tool_id and t.deleted_at is null
  where pt.project_id = p_project_id;

  v_yearly := v_monthly * 12;

  -- Leer último snapshot
  select monthly_burn_base_cents, captured_at
  into v_last_burn, v_last_at
  from public.stack_snapshots
  where project_id = p_project_id
  order by captured_at desc
  limit 1;

  -- Deduplicación: si burn no cambió y último snapshot tiene menos de 2h, salir
  if v_last_burn is not null
     and v_last_burn = v_monthly
     and v_last_at > now() - interval '2 hours'
  then
    return;
  end if;

  -- Insertar nuevo snapshot
  insert into public.stack_snapshots(project_id, monthly_burn_base_cents, yearly_burn_base_cents, tool_count)
  values (p_project_id, v_monthly, v_yearly, v_tools);

  -- Eliminar snapshots antiguos (mantener solo los últimos MAX_SNAPS)
  delete from public.stack_snapshots
  where id in (
    select id from public.stack_snapshots
    where project_id = p_project_id
    order by captured_at desc
    offset MAX_SNAPS
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Función trigger: on_project_tools_change()
-- Se ejecuta tras INSERT/UPDATE/DELETE en project_tools.
-- ---------------------------------------------------------------------------

create or replace function public.on_project_tools_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
begin
  v_project_id := coalesce(NEW.project_id, OLD.project_id);
  perform public.take_project_snapshot(v_project_id);
  return null;
end;
$$;

-- Trigger en project_tools
create trigger trg_project_tools_snapshot
  after insert or update or delete
  on public.project_tools
  for each row
  execute function public.on_project_tools_change();

-- ---------------------------------------------------------------------------
-- RPC: project_history(p_project_id, p_limit)
-- Devuelve los últimos N snapshots del proyecto ordenados de más antiguo a más nuevo.
-- Usado por el gráfico de historia en el dashboard.
-- ---------------------------------------------------------------------------

create or replace function public.project_history(
  p_project_id uuid,
  p_limit      int default 5
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  -- Verificar que el proyecto pertenece al usuario
  if not exists (
    select 1 from public.projects p
    where p.id = p_project_id and p.user_id = v_uid
  ) then
    raise exception 'not found';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id',                       s.id,
        'captured_at',              s.captured_at,
        'monthly_burn_base_cents',  s.monthly_burn_base_cents,
        'yearly_burn_base_cents',   s.yearly_burn_base_cents,
        'tool_count',               s.tool_count
      ) order by s.captured_at asc
    )
    from (
      select *
      from public.stack_snapshots
      where project_id = p_project_id
      order by captured_at desc
      limit greatest(1, least(coalesce(p_limit, 5), 10))
    ) s
  ), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- Reemplaza el stub dashboard_history con datos reales desde stack_snapshots
-- Si no hay snapshots, devuelve el burn actual repetido (compatibilidad regresiva).
-- ---------------------------------------------------------------------------

create or replace function public.dashboard_history(p_months int default 6)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_months  int  := greatest(1, least(coalesce(p_months, 6), 24));
begin
  if v_uid is null then
    return null;
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'month',             to_char(date_trunc('month', s.captured_at), 'YYYY-MM-DD'),
        'total_base_cents',  s.total_cents
      ) order by date_trunc('month', s.captured_at) asc
    )
    from (
      -- Agregar snapshots por mes: usar el último snapshot de cada mes
      select distinct on (date_trunc('month', ss.captured_at))
        ss.captured_at,
        ss.monthly_burn_base_cents as total_cents
      from public.stack_snapshots ss
      join public.projects p on p.id = ss.project_id
      where p.user_id = v_uid
        and ss.captured_at >= date_trunc('month', current_date) - ((v_months - 1) || ' months')::interval
      order by date_trunc('month', ss.captured_at), ss.captured_at desc
    ) s
  ), (
    -- Fallback: si no hay snapshots, repetir el burn actual (comportamiento anterior del stub)
    with mt as (
      select coalesce(sum(
        public.tool_monthly_base_cents(t.amount_in_base_cents, t.amount_cents, t.periodicity)
      ), 0)::bigint as monthly_total
      from public.tools t
      where t.user_id = v_uid and t.deleted_at is null
    ),
    months as (
      select gs::date as m
      from generate_series(
        (date_trunc('month', current_date)::date - ((v_months - 1) || ' months')::interval),
        date_trunc('month', current_date)::date,
        interval '1 month'
      ) as gs
    )
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'month', to_char(months.m, 'YYYY-MM-DD'),
        'total_base_cents', mt.monthly_total
      ) order by months.m
    ), '[]'::jsonb)
    from months, mt
  ));
end;
$$;

-- Grants
grant execute on function public.take_project_snapshot(uuid) to authenticated;
grant execute on function public.project_history(uuid, int) to authenticated;
grant execute on function public.dashboard_history(int) to authenticated;

comment on table public.stack_snapshots
  is 'Histórico de burn rate por proyecto; máx 5 snapshots por proyecto, insertados automáticamente al cambiar project_tools.';
comment on function public.take_project_snapshot(uuid)
  is 'Calcula y persiste snapshot de burn del proyecto. Deduplicación: no graba si burn no cambió en 2h.';
comment on function public.project_history(uuid, int)
  is 'Devuelve los últimos N snapshots de un proyecto ordenados ASC por fecha.';
comment on function public.dashboard_history(int)
  is 'Histórico real desde stack_snapshots; fallback al stub si no hay datos.';
