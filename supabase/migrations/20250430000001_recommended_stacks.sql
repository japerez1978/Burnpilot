-- BurnPilot Sprint 6: Recommended Stacks (biblioteca curada) + RPC stack_comparison

-- ---------------------------------------------------------------------------
-- Tablas (idempotente: re-ejecutar en Supabase sin error si ya existían)
-- ---------------------------------------------------------------------------

create table if not exists public.recommended_stacks (
  id                      uuid primary key default gen_random_uuid(),
  slug                    text not null unique,
  name                    text not null,
  description             text,
  monthly_estimate_cents  integer not null default 0,
  last_reviewed_at        date,
  sort_order              integer not null default 0
);

create table if not exists public.recommended_stack_items (
  id          uuid primary key default gen_random_uuid(),
  stack_id    uuid not null references public.recommended_stacks (id) on delete cascade,
  label       text not null,
  sort_order  integer not null default 0
);

create index if not exists idx_recommended_stack_items_stack on public.recommended_stack_items (stack_id, sort_order);

alter table public.recommended_stacks enable row level security;
alter table public.recommended_stack_items enable row level security;

drop policy if exists "recommended_stacks: read authenticated" on public.recommended_stacks;
create policy "recommended_stacks: read authenticated"
  on public.recommended_stacks for select
  to authenticated
  using (true);

drop policy if exists "recommended_stack_items: read authenticated" on public.recommended_stack_items;
create policy "recommended_stack_items: read authenticated"
  on public.recommended_stack_items for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Seeds (8 stacks — ver docs/burnpilot_plan.md §20)
-- ---------------------------------------------------------------------------

insert into public.recommended_stacks (slug, name, description, monthly_estimate_cents, last_reviewed_at, sort_order)
values
  ('indie-saas-minimal', 'Indie SaaS Minimal', 'Stack mínimo para SaaS indie: editor, backend, hosting, pagos y email.', 5000, '2026-04-01', 1),
  ('ai-agent-prototype', 'AI Agent Prototype', 'Prototipado rápido con APIs de IA y despliegue serverless.', 8000, '2026-04-01', 2),
  ('no-code-mvp', 'No-code MVP', 'MVP sin código con herramientas visuales y pagos.', 12000, '2026-04-01', 3),
  ('content-automation', 'Content Automation', 'Automatización de contenido y flujos ligeros.', 6000, '2026-04-01', 4),
  ('design-build', 'Design + Build', 'Diseño en Figma, sitio en Framer y despliegue.', 9000, '2026-04-01', 5),
  ('ai-writing-pro', 'AI Writing Pro', 'Escritura asistida con varios modelos y productividad.', 7000, '2026-04-01', 6),
  ('solo-founder-stack', 'Solo Founder Stack', 'Stack amplio para founder en solitario.', 15000, '2026-04-01', 7),
  ('backend-heavy-saas', 'Backend-heavy SaaS', 'APIs, colas, observabilidad y facturación.', 14000, '2026-04-01', 8)
on conflict (slug) do nothing;

-- Items por stack (labels orientativos para matching con tools del usuario)
insert into public.recommended_stack_items (stack_id, label, sort_order)
select s.id, x.item_label, x.sort_ord
from public.recommended_stacks s
inner join (
  values
    ('indie-saas-minimal', 'Cursor', 1),
    ('indie-saas-minimal', 'Supabase', 2),
    ('indie-saas-minimal', 'Netlify', 3),
    ('indie-saas-minimal', 'Stripe', 4),
    ('indie-saas-minimal', 'Resend', 5),
    ('indie-saas-minimal', 'Cloudflare', 6),
    ('ai-agent-prototype', 'Cursor', 1),
    ('ai-agent-prototype', 'Claude', 2),
    ('ai-agent-prototype', 'Vercel', 3),
    ('ai-agent-prototype', 'Supabase', 4),
    ('ai-agent-prototype', 'Resend', 5),
    ('no-code-mvp', 'Lovable', 1),
    ('no-code-mvp', 'Stripe', 2),
    ('no-code-mvp', 'Resend', 3),
    ('no-code-mvp', 'Cloudflare', 4),
    ('no-code-mvp', 'Notion', 5),
    ('content-automation', 'n8n', 1),
    ('content-automation', 'Notion', 2),
    ('content-automation', 'ChatGPT', 3),
    ('content-automation', 'Resend', 4),
    ('design-build', 'Figma', 1),
    ('design-build', 'Framer', 2),
    ('design-build', 'Cursor', 3),
    ('design-build', 'Vercel', 4),
    ('design-build', 'Stripe', 5),
    ('ai-writing-pro', 'Claude', 1),
    ('ai-writing-pro', 'ChatGPT', 2),
    ('ai-writing-pro', 'Notion', 3),
    ('ai-writing-pro', 'Grammarly', 4),
    ('solo-founder-stack', 'Cursor', 1),
    ('solo-founder-stack', 'Claude', 2),
    ('solo-founder-stack', 'Supabase', 3),
    ('solo-founder-stack', 'Vercel', 4),
    ('solo-founder-stack', 'Stripe', 5),
    ('solo-founder-stack', 'Resend', 6),
    ('solo-founder-stack', 'Notion', 7),
    ('solo-founder-stack', 'Figma', 8),
    ('backend-heavy-saas', 'Cursor', 1),
    ('backend-heavy-saas', 'Railway', 2),
    ('backend-heavy-saas', 'Postgres', 3),
    ('backend-heavy-saas', 'Redis', 4),
    ('backend-heavy-saas', 'Stripe', 5),
    ('backend-heavy-saas', 'Resend', 6),
    ('backend-heavy-saas', 'Sentry', 7),
    ('backend-heavy-saas', 'Better Stack', 8)
) as x(stack_slug, item_label, sort_ord)
  on s.slug = x.stack_slug
where not exists (
  select 1
  from public.recommended_stack_items e
  where e.stack_id = s.id
    and e.label = x.item_label
    and e.sort_order = x.sort_ord
);

-- ---------------------------------------------------------------------------
-- RPC: stack_comparison — cruza ítems del stack con tools del proyecto
-- ---------------------------------------------------------------------------

create or replace function public.stack_comparison(
  p_stack_id uuid,
  p_project_id uuid
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_stack jsonb;
  v_monthly bigint;
  v_rows jsonb;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if not exists (select 1 from public.projects p where p.id = p_project_id and p.user_id = v_uid) then
    raise exception 'not found';
  end if;

  if not exists (select 1 from public.recommended_stacks where id = p_stack_id) then
    raise exception 'stack not found';
  end if;

  select coalesce(sum(
    public.tool_monthly_base_cents(t.amount_in_base_cents, t.amount_cents, t.periodicity)
    * (pt.allocation_pct / 100.0)
  ), 0)::bigint
  into v_monthly
  from public.project_tools pt
  join public.tools t on t.id = pt.tool_id and t.deleted_at is null
  where pt.project_id = p_project_id;

  select jsonb_build_object(
    'id', s.id,
    'name', s.name,
    'slug', s.slug,
    'description', s.description,
    'monthly_estimate_cents', s.monthly_estimate_cents,
    'last_reviewed_at', s.last_reviewed_at
  )
  into v_stack
  from public.recommended_stacks s
  where s.id = p_stack_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'item_label', sub.item_label,
      'matched', sub.matched_tool_name is not null,
      'matched_tool_name', sub.matched_tool_name
    ) order by sub.sort_order
  ), '[]'::jsonb)
  into v_rows
  from (
    select
      i.sort_order,
      i.label as item_label,
      (
        select t.name
        from public.project_tools pt
        join public.tools t on t.id = pt.tool_id and t.deleted_at is null
        where pt.project_id = p_project_id
          and (
            lower(t.name) like '%' || lower(trim(i.label)) || '%'
            or lower(coalesce(t.vendor, '')) like '%' || lower(trim(i.label)) || '%'
          )
        order by t.name
        limit 1
      ) as matched_tool_name
    from public.recommended_stack_items i
    where i.stack_id = p_stack_id
  ) sub;

  return jsonb_build_object(
    'stack', v_stack,
    'project_monthly_cents', v_monthly,
    'rows', v_rows
  );
end;
$$;

grant execute on function public.stack_comparison(uuid, uuid) to authenticated;

comment on table public.recommended_stacks is 'Biblioteca curada de stacks (Sprint 6); lectura para usuarios autenticados.';
comment on function public.stack_comparison(uuid, uuid) is 'Compara ítems de un stack recomendado con tools asignadas al proyecto.';
