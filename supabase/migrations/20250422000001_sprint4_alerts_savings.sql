-- BurnPilot Sprint 4: compute_alerts, compute_project_alerts, savings_plan; dashboard_summary / project_summary rellenan alerts.
-- Requiere 20250421000001_dashboard_rpc.sql aplicada.
-- Sin SELECT … INTO en PL/pgSQL en funciones nuevas (patrón SQL + CTE).

-- ---------------------------------------------------------------------------
-- Alertas globales (usuario autenticado)
-- ---------------------------------------------------------------------------

create or replace function public.compute_alerts()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with uid as (select auth.uid() as id),
  prof as (
    select p.monthly_budget_cents as bud
    from public.profiles p, uid
    where p.id = uid.id
  ),
  monthly as (
    select coalesce(sum(
      public.tool_monthly_base_cents(t.amount_in_base_cents, t.amount_cents, t.periodicity)
    ), 0)::bigint as cents
    from public.tools t, uid u
    where t.user_id = u.id and t.deleted_at is null
  ),
  alerts as (
    select jsonb_build_object(
      'code', 'budget_exceeded',
      'severity', 'critical',
      'title', 'Presupuesto superado',
      'detail', 'El gasto mensual supera tu presupuesto definido.'
    ) as obj
    from prof, monthly
    where prof.bud is not null and prof.bud > 0 and monthly.cents > prof.bud
    union all
    select jsonb_build_object(
      'code', 'tools_unassigned',
      'severity', 'warning',
      'title', 'Herramientas sin proyecto',
      'detail', 'Tienes herramientas activas sin asignar a ningún proyecto.'
    ) as obj
    from uid u
    where exists (
      select 1 from public.tools t
      where t.user_id = u.id and t.deleted_at is null
        and not exists (select 1 from public.project_tools pt where pt.tool_id = t.id)
    )
    union all
    select jsonb_build_object(
      'code', 'renewals_soon',
      'severity', 'info',
      'title', 'Renovaciones próximas',
      'detail', 'Hay al menos una renovación en los próximos 7 días.'
    ) as obj
    from uid u
    where exists (
      select 1 from (
        select public.next_billing_on_or_after(t.last_renewal_at, t.periodicity) as nrd
        from public.tools t
        where t.user_id = u.id and t.deleted_at is null
      ) q
      where q.nrd >= current_date and q.nrd <= current_date + interval '7 days'
    )
    union all
    select jsonb_build_object(
      'code', 'underused_tools',
      'severity', 'warning',
      'title', 'Herramientas con baja valoración',
      'detail', 'Hay herramientas con utilidad percibida baja; revisa el plan de ahorro.'
    ) as obj
    from uid u
    where exists (
      select 1 from public.tools t
      where t.user_id = u.id and t.deleted_at is null
        and t.perceived_usefulness is not null and t.perceived_usefulness <= 2
    )
  )
  select case
    when (select id from uid) is null then '[]'::jsonb
    else coalesce((select jsonb_agg(a.obj) from alerts a), '[]'::jsonb)
  end;
$$;

-- ---------------------------------------------------------------------------
-- Alertas por proyecto
-- ---------------------------------------------------------------------------

create or replace function public.compute_project_alerts(p_project_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with uid as (select auth.uid() as id),
  ok as (
    select 1 as x
    from public.projects p, uid
    where p.id = p_project_id and p.user_id = uid.id
  ),
  user_monthly as (
    select coalesce(sum(
      public.tool_monthly_base_cents(t.amount_in_base_cents, t.amount_cents, t.periodicity)
    ), 0)::bigint as cents
    from public.tools t, uid u
    where t.user_id = u.id and t.deleted_at is null
  ),
  project_monthly as (
    select coalesce(sum(
      public.tool_monthly_base_cents(t.amount_in_base_cents, t.amount_cents, t.periodicity)
      * (pt.allocation_pct / 100.0)
    ), 0)::bigint as cents
    from public.project_tools pt
    join public.tools t on t.id = pt.tool_id and t.deleted_at is null
    join uid u on t.user_id = u.id
    where pt.project_id = p_project_id
  ),
  alerts as (
    select jsonb_build_object(
      'code', 'project_high_share',
      'severity', 'info',
      'title', 'Proyecto con mucho peso',
      'detail', 'Este proyecto concentra más de la mitad de tu gasto mensual.'
    ) as obj
    from ok, user_monthly um, project_monthly pm
    where um.cents > 0 and pm.cents::numeric / um.cents::numeric > 0.5
    union all
    select jsonb_build_object(
      'code', 'project_flagged_tools',
      'severity', 'warning',
      'title', 'Herramientas marcadas para revisión',
      'detail', 'Hay herramientas en estado dudoso o para cancelar en este proyecto.'
    ) as obj
    from ok
    where exists (
      select 1
      from public.project_tools pt
      join public.tools t on t.id = pt.tool_id and t.deleted_at is null
      where pt.project_id = p_project_id
        and t.state in ('doubtful', 'to_cancel')
    )
  )
  select case
    when (select id from uid) is null then '[]'::jsonb
    when not exists (select 1 from ok) then '[]'::jsonb
    else coalesce((select jsonb_agg(a.obj) from alerts a), '[]'::jsonb)
  end;
$$;

-- ---------------------------------------------------------------------------
-- Plan de ahorro (candidatos a revisar / bajar)
-- ---------------------------------------------------------------------------

create or replace function public.savings_plan()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with uid as (select auth.uid() as id),
  tools_scored as (
    select
      t.id,
      t.name,
      public.tool_monthly_base_cents(t.amount_in_base_cents, t.amount_cents, t.periodicity)::bigint as mb,
      t.state,
      t.perceived_usefulness
    from public.tools t, uid u
    where t.user_id = u.id and t.deleted_at is null
  ),
  candidates as (
    select *
    from tools_scored ts
    where ts.state in ('doubtful', 'to_cancel')
       or (ts.perceived_usefulness is not null and ts.perceived_usefulness <= 2)
  ),
  agg as (
    select coalesce(sum(c.mb), 0)::bigint as total from candidates c
  )
  select case
    when (select id from uid) is null then null::jsonb
    else jsonb_build_object(
      'potential_monthly_savings_cents', (select total from agg),
      'candidates', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'tool_id', c.id,
            'name', c.name,
            'monthly_base_cents', c.mb,
            'reason', case
              when c.state in ('doubtful', 'to_cancel') then 'Estado marcado para revisión o cancelación'
              else 'Utilidad percibida baja (≤2)'
            end
          ) order by c.mb desc
        )
        from candidates c
      ), '[]'::jsonb)
    )
  end;
$$;

-- ---------------------------------------------------------------------------
-- project_summary — alertas reales
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
    'alerts', (select public.compute_project_alerts(p_project_id))
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- dashboard_summary — alertas reales
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
      ) order by cat_sum.cents desc
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
      ) order by x.mb desc
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
      ) order by coalesce(pk.cents, 0) desc
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
      ) order by q.nrd asc
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
    'alerts', (select public.compute_alerts())
  );
end;
$$;

grant execute on function public.compute_alerts() to authenticated;
grant execute on function public.compute_project_alerts(uuid) to authenticated;
grant execute on function public.savings_plan() to authenticated;

comment on function public.compute_alerts() is 'Reglas heurísticas de alertas globales (presupuesto, asignación, renovaciones, valoración).';
comment on function public.compute_project_alerts(uuid) is 'Alertas por proyecto (peso vs total, estados dudosos).';
comment on function public.savings_plan() is 'Candidatos a recorte: estado dudoso/cancelar o utilidad ≤2.';
comment on function public.dashboard_summary() is 'KPI globales BurnPilot + alerts vía compute_alerts().';

-- Perfiles ya existentes: considerar onboarding hecho (evita bloquear usuarios actuales).
update public.profiles
set onboarding_completed_at = coalesce(onboarding_completed_at, created_at)
where onboarding_completed_at is null;
