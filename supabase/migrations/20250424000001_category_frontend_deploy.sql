-- Categoría explícita para front / despliegue (Vercel, Netlify, Cloudflare Pages, etc.).
-- La categoría 2 "Hosting / edge" queda más orientada a infra genérica (p. ej. Railway).

insert into public.categories (id, slug, name, color, icon) values
  (17, 'front', 'Frontend / despliegue', '#2DD4BF', 'rocket')
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  color = excluded.color,
  icon = excluded.icon;

comment on table public.categories is 'Catálogo builder read-only; base (1–8), ampliación (9–16), front (17).';

-- Plantillas del seed inicial: Vercel / Netlify / Cloudflare encajan aquí mejor que en hosting genérico.
update public.tool_templates
set category_id = 17
where slug in ('vercel', 'netlify', 'cloudflare');
