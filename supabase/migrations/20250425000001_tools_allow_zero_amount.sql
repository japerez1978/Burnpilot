-- Herramientas con plan gratuito: importe 0 € permitido (antes solo > 0).

alter table public.tools drop constraint if exists tools_amount_cents_check;

alter table public.tools
  add constraint tools_amount_cents_check check (amount_cents >= 0);

comment on column public.tools.amount_cents is 'Importe del ciclo de facturación en céntimos; 0 = plan gratuito.';
