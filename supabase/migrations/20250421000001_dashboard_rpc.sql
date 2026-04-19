-- BurnPilot Sprint 3: RPC dashboard_summary, project_summary, tool_assignment, dashboard_history + helpers
-- Requiere migración Sprint 2 aplicada.
-- Nota: evitar "SELECT ... INTO var" en PL/pgSQL; algunos clientes/analizadores lo confunden con SELECT INTO tabla.

-- ---------------------------------------------------------------------------
-- Helper: coste mensual en moneda base (céntimos) a partir de fila tool
-- ---------------------------------------------------------------------------

create or replace function public.tool_monthly_base_cents(
  p_amount_in_base_cents integer,
  p_amount_cents integer,
  p_periodicity text
)
returns bigint
language sql
immutable
as $$
  select coalesce(
    p_amount_in_base_cents::bigint,
    (case p_periodicity
      when 'monthly' then p_amount_cents::numeric
      when 'quarterly' then p_amount_cents::numeric / 3.0
      when 'yearly' then p_amount_cents::numeric / 12.0
    end)::bigint
  );
$$;

-- ---------------------------------------------------------------------------
-- Próxima fecha de cobro en o después de hoy (avanza por periodicidad)
-- ---------------------------------------------------------------------------

create or replace function public.next_billing_on_or_after(p_last date, p_periodicity text)
returns date
language plpgsql
stable
as $$
declare
  d date := p_last;
  step interval;
  i int := 0;
begin
  step := case p_periodicity
    when 'monthly' then interval '1 month'
    when 'quarterly' then interval '3 months'
    when 'yearly' then interval '1 year'
    else interval '1 month'
  end;
  while d < current_date and i < 200 loop
    d := d + step;
    i := i + 1;
  end loop;
  return d;
end;
$$;

-- ---------------------------------------------------------------------------
-- tool_assignment (§8)
-- ---------------------------------------------------------------------------

create or replace function public.tool_assignment(p_tool_id uuid)
returns text
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  tool_owner uuid;
  n int;
begin
  tool_owner := (
    select t.user_id
    from public.tools t
    where t.id = p_tool_id and t.deleted_at is null
  );

  if tool_owner is null then
    return null;
  end if;

  if tool_owner is distinct from (select auth.uid()) then
    raise exception 'forbidden';
  end if;

  n := (select count(*)::int from public.project_tools where tool_id = p_tool_id);

  return case
    when n = 0 then 'none'
    when n = 1 then 'single'
    else 'shared'
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- dashboard_history: stub (misma cifra mensual actual en cada mes; histórico real en fase posterior)
-- ---------------------------------------------------------------------------

create or replace function public.dashboard_history(p_months int default 6)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with mm as (select greatest(1, least(coalesce(p_months, 6), 24)) as n),
  uid as (select auth.uid() as id),
  mt as (
    select coalesce(sum(
      public.tool_monthly_base_cents(t.amount_in_base_cents, t.amount_cents, t.periodicity)
    ), 0)::bigint as monthly_total
    from public.tools t
    cross join uid
    where t.user_id = uid.id and t.deleted_at is null
  ),
  months as (
    select gs::date as m
    from mm,
    generate_series(
      (date_trunc('month', current_date)::date - ((mm.n - 1) || ' months')::interval),
      date_trunc('month', current_date)::date,
      interval '1 month'
    ) as gs
  )
  select case
    when (select id from uid) is null then null::jsonb
    else coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'month', to_char(months.m, 'YYYY-MM-DD'),
          'total_base_cents', mt.monthly_total
        ) ORDER BY months.m
      )
      from months, mt
    ), '[]'::jsonb)
  end;
$$;

-- ---------------------------------------------------------------------------
-- project_summary
-- ---------------------------------------------------------------------------

create or replace function public.project_summary(p_project_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_monthly bigint;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from public.projects p where p.id = p_project_id and p.user_id = v_uid
  ) then
    raise exception 'not found';
  end if;

  v_monthly := (
    select coalesce(sum(
      public.tool_monthly_base_cents(t.amount_in_base_cents, t.amount_cents, t.periodicity)
      * (pt.allocation_pct / 100.0)
    ), 0)::bigint
    from public.project_tools pt
    join public.tools t on t.id = pt.tool_id and t.deleted_at is null
    where pt.project_id = p_project_id
  );

  return jsonb_build_object(
    'project_id', p_project_id,
    'name', (select p.name from public.projects p where p.id = p_project_id and p.user_id = v_uid),
    'description', (select p.description from public.projects p where p.id = p_project_id and p.user_id = v_uid),
    'monthly_burn_base_cents', v_monthly,
    'yearly_burn_base_cents', v_monthly * 12,
    'tools', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'tool_id', t.id,
          'name', t.name,
          'monthly_base_cents', (
            public.tool_monthly_base_cents(t.amount_in_base_cents, t.amount_cents, t.periodicity)
            * (pt.allocation_pct / 100.0)
          )::bigint,
          'allocation_pct', pt.allocation_pct
        ) ORDER BY t.name ASC
      ), '[]'::jsonb)
      from public.project_tools pt
      join public.tools t on t.id = pt.tool_id and t.deleted_at is null
      where pt.project_id = p_project_id
    ),
    'alerts', '[]'::jsonb
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- dashboard_summary
-- ---------------------------------------------------------------------------

create or replace function public.dashboard_summary()
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_me public.profiles%ROWTYPE;
  v_monthly bigint;
  v_yearly bigint;
  v_category jsonb;
  v_top jsonb;
  v_projects jsonb;
  v_renew jsonb;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  v_me := (select p from public.profiles p where p.id = v_uid limit 1);

  v_monthly := (
    select coalesce(sum(
      public.tool_monthly_base_cents(t.amount_in_base_cents, t.amount_cents, t.periodicity)
    ), 0)::bigint
    from public.tools t
    where t.user_id = v_uid and t.deleted_at is null
  );

  v_yearly := v_monthly * 12;

  v_category := (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'category_id', c.id,
        'name', c.name,
        'color', c.color,
        'monthly_base_cents', cat_sum.cents
      ) ORDER BY cat_sum.cents DESC
    ), '[]'::jsonb)
    from public.categories c
    inner join (
      select
        t.category_id as cid,
        coalesce(sum(
          public.tool_monthly_base_cents(t.amount_in_base_cents, t.amount_cents, t.periodicity)
        ), 0)::bigint as cents
      from public.tools t
      where t.user_id = v_uid and t.deleted_at is null
      group by t.category_id
    ) cat_sum on cat_sum.cid = c.id
    where cat_sum.cents > 0
  );

  v_top := (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'tool_id', x.id,
        'name', x.name,
        'monthly_base_cents', x.mb
      ) ORDER BY x.mb DESC
    ), '[]'::jsonb)
    from (
      select
        t.id,
        t.name,
        public.tool_monthly_base_cents(t.amount_in_base_cents, t.amount_cents, t.periodicity) as mb
      from public.tools t
      where t.user_id = v_uid and t.deleted_at is null
      order by mb desc nulls last
      limit 5
    ) x
  );

  v_projects := (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'project_id', p.id,
        'name', p.name,
        'monthly_base_cents', coalesce(pk.cents, 0)
      ) ORDER BY coalesce(pk.cents, 0) DESC
    ), '[]'::jsonb)
    from public.projects p
    left join (
      select
        pt.project_id as pid,
        coalesce(sum(
          public.tool_monthly_base_cents(t.amount_in_base_cents, t.amount_cents, t.periodicity)
          * (pt.allocation_pct / 100.0)
        ), 0)::bigint as cents
      from public.project_tools pt
      join public.tools t on t.id = pt.tool_id and t.deleted_at is null
      group by pt.project_id
    ) pk on pk.pid = p.id
    where p.user_id = v_uid and p.status = 'active'
  );

  v_renew := (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'tool_id', q.id,
        'name', q.name,
        'next_renewal_date', q.nrd
      ) ORDER BY q.nrd ASC
    ), '[]'::jsonb)
    from (
      select
        t.id,
        t.name,
        public.next_billing_on_or_after(t.last_renewal_at, t.periodicity) as nrd
      from public.tools t
      where t.user_id = v_uid
        and t.deleted_at is null
    ) q
    where q.nrd between current_date and (current_date + 7)
  );

  return jsonb_build_object(
    'display_currency', v_me.display_currency,
    'monthly_budget_cents', v_me.monthly_budget_cents,
    'monthly_burn_base_cents', v_monthly,
    'yearly_burn_base_cents', v_yearly,
    'category_breakdown', v_category,
    'top_tools', v_top,
    'project_kpis', v_projects,
    'renewals_next_7d', v_renew,
    'alerts', '[]'::jsonb
  );
end;
$$;

grant execute on function public.tool_monthly_base_cents(integer, integer, text) to authenticated;
grant execute on function public.next_billing_on_or_after(date, text) to authenticated;
grant execute on function public.tool_assignment(uuid) to authenticated;
grant execute on function public.dashboard_history(int) to authenticated;
grant execute on function public.project_summary(uuid) to authenticated;
grant execute on function public.dashboard_summary() to authenticated;

comment on function public.dashboard_summary() is 'KPI globales BurnPilot; alertas vacías hasta compute_alerts (Sprint 4).';
comment on function public.dashboard_history(int) is 'Stub: repite el total mensual actual por mes; histórico real pendiente.';
