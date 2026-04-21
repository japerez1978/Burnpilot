-- URL oficial opcional por herramienta (usuario o sugerida por IA).
alter table public.tools
  add column if not exists website_url text;

comment on column public.tools.website_url is 'Enlace web opcional del producto (p. ej. pricing).';
