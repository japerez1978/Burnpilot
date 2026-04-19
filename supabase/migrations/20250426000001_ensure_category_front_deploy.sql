-- Categoría «Frontend / despliegue» (id 17). Idempotente: seguro si ya aplicaste 20250424000001.
-- Sin esta fila en public.categories, el desplegable en Herramientas no mostrará «Frontend / despliegue».

insert into public.categories (id, slug, name, color, icon) values
  (17, 'front', 'Frontend / despliegue', '#2DD4BF', 'rocket')
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  color = excluded.color,
  icon = excluded.icon;

comment on table public.categories is 'Catálogo builder read-only; base (1–8), ampliación (9–16), front (17).';

update public.tool_templates
set category_id = 17
where slug in ('vercel', 'netlify', 'cloudflare');
