-- Ampliación del catálogo de categorías de herramientas (ids 9–16) + plantillas de ejemplo.
-- Aplicar en proyectos que ya tengan 20250420000001_tools_projects_categories.sql.

insert into public.categories (id, slug, name, color, icon) values
  (9, 'security', 'Seguridad / identidad', '#22C55E', 'shield'),
  (10, 'analytics', 'Analytics / growth', '#EC4899', 'line-chart'),
  (11, 'crm', 'CRM / ventas', '#6366F1', 'users'),
  (12, 'support', 'Soporte / CX', '#F43F5E', 'headset'),
  (13, 'observability', 'Observabilidad / SRE', '#F97316', 'activity'),
  (14, 'storage', 'Almacenamiento / backups', '#06B6D4', 'hard-drive'),
  (15, 'domains', 'Dominios y certificados', '#A855F7', 'globe'),
  (16, 'legal', 'Legal / firmas', '#78716C', 'scale')
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  color = excluded.color,
  icon = excluded.icon;

comment on table public.categories is 'Catálogo builder read-only; categorías base (1–8) + ampliación (9–16).';

-- Plantillas sugeridas (una referencia por área nueva); montos orientativos.
insert into public.tool_templates (slug, name, vendor, category_id, suggested_amount_cents, currency, periodicity, plan_label) values
  ('1password-teams', '1Password', 'AgileBits', 9, 750, 'EUR', 'monthly', 'Teams'),
  ('posthog', 'PostHog', 'PostHog', 10, null, 'USD', 'monthly', 'Free tier + usage'),
  ('hubspot-starter', 'HubSpot CRM', 'HubSpot', 11, null, 'EUR', 'monthly', 'Free / Starter'),
  ('zendesk-suite', 'Zendesk', 'Zendesk', 12, 5500, 'EUR', 'monthly', 'Suite Team'),
  ('sentry-team', 'Sentry', 'Functional Software', 13, 2900, 'USD', 'monthly', 'Team'),
  ('backblaze-b2', 'Backblaze B2', 'Backblaze', 14, null, 'USD', 'monthly', 'Pay-as-you-go'),
  ('namecheap', 'Namecheap', 'Namecheap', 15, 900, 'USD', 'yearly', 'Dominio .com aprox.'),
  ('docusign', 'DocuSign', 'DocuSign', 16, 1200, 'EUR', 'monthly', 'Personal')
on conflict (slug) do update set
  name = excluded.name,
  vendor = excluded.vendor,
  category_id = excluded.category_id,
  suggested_amount_cents = excluded.suggested_amount_cents,
  currency = excluded.currency,
  periodicity = excluded.periodicity,
  plan_label = excluded.plan_label;
