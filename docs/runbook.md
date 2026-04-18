# BurnPilot Runbook

> Qué hacer cuando algo falla. Se rellena con casos reales durante el desarrollo.

## Dashboards / accesos

- Netlify: https://app.netlify.com
- Railway: https://railway.app
- Supabase: https://supabase.com/dashboard
- Stripe: https://dashboard.stripe.com
- Cloudflare: https://dash.cloudflare.com
- Sentry: https://sentry.io
- Better Stack: https://betterstack.com
- Umami: https://cloud.umami.is

## Webhook Stripe

- Endpoint producción: `https://api.burnpilot.app/webhooks/stripe`
- Si Better Stack avisa de `stripe_events.processed_at IS NULL > 5 min`:
  1. Revisar Railway logs del último webhook.
  2. Stripe Dashboard → Developers → Webhooks → ver intentos y payloads.
  3. Si idempotencia colisionó mal, borrar fila de `stripe_events` afectada y Stripe reintentará al próximo retry.

## FX desactualizado

- Cron diario llama a `POST /cron/fx-refresh`.
- Si `max(captured_at) < now() - 48h`, alerta activa.
- Manual: ejecutar `UPDATE fx_rates SET rate=..., captured_at=now() WHERE ...` desde Supabase Studio.

## Rollback de deploy

- **Netlify**: Deploys → seleccionar deploy estable anterior → "Publish deploy".
- **Railway**: Deployments → ••• → "Rollback to this deployment".

## Backups Supabase

- `pg_dump` mensual manual hasta que añadamos cron. Comando:
  ```bash
  pg_dump "$SUPABASE_DB_URL" -f burnrate_$(date +%Y%m%d).sql
  ```
- **Antes del go-live**: hacer un test de restore completo en staging.

## Soporte a un usuario

- Password reset: Supabase Studio → Authentication → Users → ••• → "Send password recovery".
- Ver herramientas / proyectos: `supabase.from('tools').select('*').eq('user_id', 'UUID')` vía Studio.
- Cambiar plan manual: update directo en `profiles.plan`. Usar solo para casos especiales.

## Checklist post-incidente

1. Identificar causa raíz (log + Sentry + Stripe logs).
2. Aplicar fix en `develop` → PR → merge a `main`.
3. Verificar CI Exit 0 y deploy limpio.
4. Anotar en este runbook en la sección del componente afectado.
5. Si afectó a usuarios, email transparente desde `hello@burnpilot.app`.
